"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getUser, requireUser } from "@/lib/auth";
import { notifyAdminOfError } from "@/lib/admin-error";
import { createMemberInviteEmail } from "@/lib/email/memberInviteTemplate";
import { getAppBaseUrl, getDefaultLogoUrl, sendEmail } from "@/lib/email/sendEmail";
import { canManageMembers } from "@/lib/permissions";
import {
  inviteMemberSchema,
  type InviteMemberInput,
} from "@/lib/validators/member";
import type { ActionResult, BookInvitation, MemberWithProfile } from "@/lib/types";

export type PendingBookInvitation = Pick<
  BookInvitation,
  "id" | "email" | "role" | "expires_at" | "created_at"
>;

export interface InvitationLookup {
  book_id: string;
  email: string;
  role: BookInvitation["role"];
  expires_at: string;
  accepted_at: string | null;
  cookbook_title: string;
}

export async function lookupInvitation(
  token: string
): Promise<InvitationLookup | null> {
  if (!token) return null;
  const admin = createServiceClient();
  const { data } = await admin
    .from("book_invitations")
    .select(
      "book_id, email, role, expires_at, accepted_at, recipe_books(title)"
    )
    .eq("token", token)
    .single();
  if (!data) return null;
  const cookbook = (data.recipe_books ?? null) as { title?: string } | null;
  return {
    book_id: data.book_id,
    email: data.email,
    role: data.role,
    expires_at: data.expires_at,
    accepted_at: data.accepted_at,
    cookbook_title: cookbook?.title ?? "this cookbook",
  };
}

async function getBookRole(supabase: Awaited<ReturnType<typeof createClient>>, bookId: string, userId: string) {
  const { data } = await supabase
    .from("book_members")
    .select("role")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .single();
  return data?.role ?? null;
}

function getInviteDisplayName(fullName?: string | null) {
  const trimmed = fullName?.trim();
  if (!trimmed) return null;
  if (trimmed.includes("@")) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

export async function inviteMember(
  bookId: string,
  input: InviteMemberInput
): Promise<ActionResult<BookInvitation>> {
  const user = await requireUser();
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);

  if (!canManageMembers(role)) {
    return { success: false, error: "Only the keeper can invite members." };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [bookRes, profileRes] = await Promise.all([
    supabase.from("recipe_books").select("title,sharing_enabled").eq("id", bookId).single(),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  if (bookRes.error || !bookRes.data) {
    return { success: false, error: bookRes.error?.message ?? "Could not find cookbook." };
  }

  if (!bookRes.data.sharing_enabled) {
    return {
      success: false,
      error: "Turn on sharing for this cookbook before inviting members.",
    };
  }

  const cookbookTitle = bookRes.data?.title ?? "a cookbook";
  const inviterName = getInviteDisplayName(profileRes.data?.full_name);

  const { data: invitation, error } = await supabase
    .from("book_invitations")
    .insert({
      book_id: bookId,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      token,
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error || !invitation) {
    notifyAdminOfError("inviteMember:createInvitation", error ?? "Missing created invitation", {
      bookId,
      inviterId: user.id,
    });
    return { success: false, error: error?.message ?? "Could not create invitation" };
  }

  try {
    const inviteUrl = `${getAppBaseUrl()}/invite/${token}`;
    const email = createMemberInviteEmail({
      inviteUrl,
      cookbookTitle,
      inviterName,
      invitedEmail: parsed.data.email,
      role: parsed.data.role,
      expiresAt,
      logoUrl: getDefaultLogoUrl(),
    });

    await sendEmail({
      to: parsed.data.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  } catch (emailError) {
    notifyAdminOfError("inviteMember:sendEmail", emailError, {
      bookId,
      inviterId: user.id,
    });
    return {
      success: false,
      error: emailError instanceof Error
        ? `Invitation was created, but the email could not be sent: ${emailError.message}`
        : "Invitation was created, but the email could not be sent.",
    };
  }

  revalidatePath(`/app/books/${bookId}/members`);
  return { success: true, data: invitation };
}

export async function acceptInvitation(token: string): Promise<ActionResult<{ bookId: string }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Please sign in or create an account to accept this invitation." };
  }

  // Use service role to read the invitation — RLS only allows keepers to query
  // book_invitations, but the accepting user is not yet a member at this point.
  const admin = createServiceClient();

  const { data: invitation } = await admin
    .from("book_invitations")
    .select("*")
    .eq("token", token)
    .is("accepted_at", null)
    .gte("expires_at", new Date().toISOString())
    .single();

  if (!invitation) {
    return { success: false, error: "This invitation is invalid or has expired." };
  }

  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return {
      success: false,
      error: `This invitation was sent to ${invitation.email}. Sign in with that email address to accept it.`,
    };
  }

  // Add user to book_members via service role (user may not yet be a member).
  // onConflict targets the (book_id, user_id) unique constraint — without it,
  // supabase-js upserts against the primary key (id), so re-accepting an invite
  // for an existing membership throws a duplicate-key error instead of updating.
  const { error: memberError } = await admin
    .from("book_members")
    .upsert(
      { book_id: invitation.book_id, user_id: user.id, role: invitation.role },
      { onConflict: "book_id,user_id" }
    );

  if (memberError) {
    return { success: false, error: memberError.message };
  }

  // Mark invitation accepted
  await admin
    .from("book_invitations")
    .update({ accepted_by: user.id, accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  revalidatePath(`/app/books/${invitation.book_id}`);
  revalidatePath("/app");
  return { success: true, data: { bookId: invitation.book_id } };
}

export interface OnboardingInvitation {
  token: string;
  book_id: string;
  cookbook_title: string;
  role: BookInvitation["role"];
  invited_by_name: string | null;
}

// Pending invitations addressed to the signed-in user's email, surfaced at
// onboarding so a new user can join instead of being forced to create a book.
// RLS only lets keepers read book_invitations, so this uses the service client.
export async function getPendingInvitationsForCurrentUser(): Promise<
  OnboardingInvitation[]
> {
  const user = await getUser();
  if (!user?.email) return [];

  const admin = createServiceClient();
  const { data } = await admin
    .from("book_invitations")
    .select(
      "token, book_id, role, created_at, recipe_books(title), inviter:profiles!book_invitations_invited_by_fkey(full_name)"
    )
    .eq("email", user.email.toLowerCase())
    .is("accepted_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (!data) return [];

  const seen = new Set<string>();
  const invitations: OnboardingInvitation[] = [];
  for (const row of data) {
    if (seen.has(row.book_id)) continue;
    seen.add(row.book_id);
    const cookbook = (row.recipe_books ?? null) as { title?: string } | null;
    const inviter = (row.inviter ?? null) as { full_name?: string | null } | null;
    invitations.push({
      token: row.token,
      book_id: row.book_id,
      cookbook_title: cookbook?.title ?? "this cookbook",
      role: row.role,
      invited_by_name: getInviteDisplayName(inviter?.full_name),
    });
  }
  return invitations;
}

export async function getBookMembers(bookId: string): Promise<MemberWithProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("book_members")
    .select("*, profile:profiles(*)")
    .eq("book_id", bookId)
    .order("created_at", { ascending: true });

  return (data as MemberWithProfile[]) ?? [];
}

export async function getPendingBookInvitations(bookId: string): Promise<PendingBookInvitation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("book_invitations")
    .select("id,email,role,expires_at,created_at")
    .eq("book_id", bookId)
    .is("accepted_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  return (data as PendingBookInvitation[]) ?? [];
}

export async function cancelInvitation(bookId: string, invitationId: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);

  if (!canManageMembers(role)) {
    return { success: false, error: "Only the keeper can cancel invitations." };
  }

  const { error } = await supabase
    .from("book_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("book_id", bookId)
    .is("accepted_at", null);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/app/books/${bookId}/members`);
  revalidatePath(`/app/books/${bookId}/settings`);
  return { success: true, data: undefined };
}

export async function removeMember(bookId: string, userId: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);

  if (!canManageMembers(role)) {
    return { success: false, error: "Only the keeper can remove members." };
  }
  if (userId === user.id) {
    return { success: false, error: "You can't remove yourself." };
  }

  const { error } = await supabase
    .from("book_members")
    .delete()
    .eq("book_id", bookId)
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/app/books/${bookId}/members`);
  revalidatePath(`/app/books/${bookId}/settings`);
  return { success: true, data: undefined };
}
