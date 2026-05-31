"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";

const shareBookSchema = z.object({
  bookId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["contributor", "family"]),
});

export type ShareBookInput = z.infer<typeof shareBookSchema>;

/**
 * Admin-only: share a cookbook with an existing user by writing a book_members
 * row directly via the service-role client. No email/token is needed because the
 * target already has an account. Mirrors the membership write in acceptInvitation.
 */
export async function shareBookWithUser(
  input: ShareBookInput
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = shareBookSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { bookId, userId, role } = parsed.data;

  const admin = createServiceClient();

  const { data: book, error: bookError } = await admin
    .from("recipe_books")
    .select("id, owner_id")
    .eq("id", bookId)
    .single();

  if (bookError || !book) {
    return { success: false, error: "Cookbook not found." };
  }
  if (book.owner_id === userId) {
    return { success: false, error: "That person already owns this cookbook." };
  }

  // onConflict targets the (book_id, user_id) unique constraint so re-sharing
  // updates the role instead of throwing a duplicate-key error.
  const { error: memberError } = await admin
    .from("book_members")
    .upsert(
      { book_id: bookId, user_id: userId, role },
      { onConflict: "book_id,user_id" }
    );

  if (memberError) {
    return { success: false, error: memberError.message };
  }

  // Keep the sharing model consistent: a book with non-owner members is shared.
  await admin
    .from("recipe_books")
    .update({ sharing_enabled: true })
    .eq("id", bookId);

  revalidatePath("/app/admin");
  revalidatePath(`/app/books/${bookId}/members`);
  return { success: true, data: undefined };
}
