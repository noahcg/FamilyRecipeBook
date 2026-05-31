"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { createMemberInviteEmail } from "@/lib/email/memberInviteTemplate";
import { getAppBaseUrl, getDefaultLogoUrl, sendEmail } from "@/lib/email/sendEmail";
import type { ActionResult } from "@/lib/types";

const inviteToBookSchema = z.object({
  bookId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["contributor", "family"]),
});

export type AdminInviteToBookInput = z.infer<typeof inviteToBookSchema>;

function inviterFirstName(fullName?: string | null) {
  const trimmed = fullName?.trim();
  if (!trimmed || trimmed.includes("@")) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

/**
 * Admin-only: invite an existing user to a cookbook from the admin panel.
 *
 * This creates a pending invitation (and emails it) rather than writing a
 * book_members row directly — the person chooses to accept before the book lands
 * on their shelf. Mirrors the keeper invite flow in inviteMember, but scoped to
 * platform admins and operating via the service-role client.
 */
export async function inviteUserToBook(
  input: AdminInviteToBookInput
): Promise<ActionResult> {
  const adminUser = await requireAdmin();

  const parsed = inviteToBookSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { bookId, userId, role } = parsed.data;

  const service = createServiceClient();

  const [{ data: book, error: bookError }, { data: targetUser, error: userError }] =
    await Promise.all([
      service.from("recipe_books").select("id, title, owner_id").eq("id", bookId).single(),
      service.auth.admin.getUserById(userId),
    ]);

  if (bookError || !book) {
    return { success: false, error: "Cookbook not found." };
  }
  const targetEmail = targetUser?.user?.email?.toLowerCase();
  if (userError || !targetEmail) {
    return { success: false, error: "Could not find that person's email address." };
  }
  if (book.owner_id === userId) {
    return { success: false, error: "That person already owns this cookbook." };
  }

  const { data: existingMember } = await service
    .from("book_members")
    .select("user_id")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existingMember) {
    return { success: false, error: "They're already a member of this cookbook." };
  }

  const { data: existingInvite } = await service
    .from("book_invitations")
    .select("id")
    .eq("book_id", bookId)
    .eq("email", targetEmail)
    .is("accepted_at", null)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();
  if (existingInvite) {
    return { success: false, error: "They already have a pending invite to this cookbook." };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // A cookbook with invitations is, by definition, shared.
  await service.from("recipe_books").update({ sharing_enabled: true }).eq("id", bookId);

  const { error: inviteError } = await service.from("book_invitations").insert({
    book_id: bookId,
    email: targetEmail,
    role,
    token,
    invited_by: adminUser.id,
    expires_at: expiresAt,
  });
  if (inviteError) {
    return { success: false, error: inviteError.message };
  }

  const { data: inviterProfile } = await service
    .from("profiles")
    .select("full_name")
    .eq("id", adminUser.id)
    .single();

  try {
    const inviteUrl = `${getAppBaseUrl()}/invite/${token}`;
    const email = createMemberInviteEmail({
      inviteUrl,
      cookbookTitle: book.title ?? "a cookbook",
      inviterName: inviterFirstName(inviterProfile?.full_name),
      invitedEmail: targetEmail,
      role,
      expiresAt,
      logoUrl: getDefaultLogoUrl(),
    });
    await sendEmail({
      to: targetEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  } catch (emailError) {
    return {
      success: false,
      error:
        emailError instanceof Error
          ? `Invitation was created, but the email could not be sent: ${emailError.message}`
          : "Invitation was created, but the email could not be sent.",
    };
  }

  revalidatePath("/app/admin");
  revalidatePath(`/app/books/${bookId}/members`);
  return { success: true, data: undefined };
}
