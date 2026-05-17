"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getUser, requireUser } from "@/lib/auth";
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

async function getBookRole(supabase: Awaited<ReturnType<typeof createClient>>, bookId: string, userId: string) {
  const { data } = await supabase
    .from("book_members")
    .select("role")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .single();
  return data?.role ?? null;
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
  const inviterName = profileRes.data?.full_name ?? user.email ?? null;

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
    return { success: false, error: error?.message ?? "Could not create invitation" };
  }

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

  try {
    await sendEmail({
      to: parsed.data.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  } catch (emailError) {
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

  // Add user to book_members via service role (user may not yet be a member)
  const { error: memberError } = await admin
    .from("book_members")
    .upsert({ book_id: invitation.book_id, user_id: user.id, role: invitation.role });

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
