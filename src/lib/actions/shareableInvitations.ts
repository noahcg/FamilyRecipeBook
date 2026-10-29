"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAppBaseUrl } from "@/lib/appUrl";
import { getUser } from "@/lib/auth";
import { canManageMembers } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { updateMemberRoleSchema } from "@/lib/validators/member";
import type { ActionResult, BookRole } from "@/lib/types";

const idSchema = z.string().uuid();
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);

export interface PendingShareableInvitation {
  id: string;
  role: "family" | "contributor";
  expires_at: string;
  created_at: string;
  invited_by: string;
}

export interface ShareableInvitationPreview {
  bookId: string;
  cookbookTitle: string;
  role: "family" | "contributor";
}

async function keeperClient(bookId: string) {
  const user = await getUser();
  if (!user || !idSchema.safeParse(bookId).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("book_members").select("role")
    .eq("book_id", bookId).eq("user_id", user.id).maybeSingle();
  if (error || !canManageMembers((data?.role as BookRole | undefined) ?? null)) return null;
  return supabase;
}

function revalidateBook(bookId: string) {
  revalidatePath(`/app/books/${bookId}/members`);
  revalidatePath(`/app/books/${bookId}/members/add`);
  revalidatePath(`/app/books/${bookId}/settings`);
}

export async function createShareableInvitation(
  bookId: string,
  role: "family" | "contributor"
): Promise<ActionResult<{ url: string; expires_at: string }>> {
  const parsedRole = updateMemberRoleSchema.safeParse(role);
  if (!parsedRole.success) return { success: false, error: "Choose Family or Contributor access." };
  const user = await getUser();
  if (!user || !idSchema.safeParse(bookId).success) return { success: false, error: "You do not have permission to invite people to this cookbook." };
  const supabase = await createClient();
  const { data: canInvite } = await supabase.rpc("can_invite_to_book", { target_book_id: bookId, target_user_id: user.id });
  if (!canInvite) return { success: false, error: "You do not have permission to invite people to this cookbook." };

  let baseUrl: string;
  try {
    baseUrl = getAppBaseUrl();
  } catch {
    return { success: false, error: "Invitation links are unavailable right now. Please try again later." };
  }

  const { data, error } = await supabase.rpc("create_book_invitation_link", {
    target_book_id: bookId,
    invitation_role: parsedRole.data,
  }).single();
  if (error || !data) {
    return { success: false, error: error?.message ?? "Could not create the invitation link. Please try again." };
  }
  const link = data as { token: string; expires_at: string };
  revalidateBook(bookId);
  return { success: true, data: { url: `${baseUrl}/invite/link/${link.token}`, expires_at: link.expires_at } };
}

export async function getPendingShareableInvitations(bookId: string): Promise<ActionResult<PendingShareableInvitation[]>> {
  const supabase = await keeperClient(bookId);
  if (!supabase) return { success: false, error: "Only the cookbook keeper can view invitation links." };
  const { data, error } = await supabase.from("book_invitation_links")
    .select("id,role,expires_at,created_at,invited_by")
    .eq("book_id", bookId).is("accepted_at", null).is("cancelled_at", null)
    .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false });
  if (error) return { success: false, error: "Could not load invitation links. Please try again." };
  return { success: true, data: (data ?? []) as PendingShareableInvitation[] };
}

export async function cancelShareableInvitation(bookId: string, id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { success: false, error: "Invalid invitation link." };
  const supabase = await keeperClient(bookId);
  if (!supabase) return { success: false, error: "Only the cookbook keeper can cancel invitation links." };
  const { error } = await supabase.rpc("cancel_book_invitation_link", { invitation_id: id });
  if (error) return { success: false, error: error.message || "Could not cancel the link. Please try again." };
  revalidateBook(bookId);
  return { success: true, data: undefined };
}

export async function lookupShareableInvitation(token: string): Promise<ShareableInvitationPreview | null> {
  if (!tokenSchema.safeParse(token).success) return null;
  // A bearer token is the access credential. Only return the limited preview,
  // and keep the RLS-bypassing client exclusively on the server.
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("book_invitation_links")
    .select("book_id,role,expires_at,accepted_at,cancelled_at,recipe_books(title,sharing_enabled)")
    .eq("token", token).maybeSingle();
  if (error || !data || data.accepted_at || data.cancelled_at || new Date(data.expires_at) <= new Date()) return null;
  const book = data.recipe_books as unknown as { title: string; sharing_enabled: boolean } | null;
  if (!book?.sharing_enabled) return null;
  return { bookId: data.book_id, cookbookTitle: book.title, role: data.role as "family" | "contributor" };
}

export async function acceptShareableInvitation(token: string): Promise<ActionResult<{ bookId: string }>> {
  if (!tokenSchema.safeParse(token).success) return { success: false, error: "This invitation link is invalid." };
  const user = await getUser();
  if (!user) return { success: false, error: "Sign in to join this cookbook." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_book_invitation_link", { invitation_token: token });
  if (error || !data) return { success: false, error: error?.message ?? "Could not join the cookbook. Please try again." };
  const bookId = data as string;
  revalidateBook(bookId);
  revalidatePath(`/app/books/${bookId}`);
  revalidatePath("/app");
  return { success: true, data: { bookId } };
}
