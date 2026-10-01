"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

// Buckets whose objects are namespaced by `${userId}/` as the first path
// segment (see src/lib/upload.ts). book-covers has no per-user uploads.
const USER_STORAGE_BUCKETS = ["recipe-images", "avatars"] as const;

/**
 * Permanently deletes the current user's account and all of their data.
 *
 * Shared cookbook ownership must be resolved before the profile disappears.
 * Migration 026 preserves authored content in cookbooks that survive account
 * deletion; it does not allow a shared cookbook to vanish with its owner.
 *
 * This is irreversible.
 */
export async function deleteAccount(): Promise<ActionResult> {
  const user = await requireUser();
  const service = createServiceClient();

  const { data: ownedBooks, error: ownedBooksError } = await service
    .from("recipe_books")
    .select("id,title,members:book_members(user_id)")
    .eq("owner_id", user.id);
  if (ownedBooksError) return { success: false, error: "Could not check your cookbook ownership. Please try again." };
  const sharedBook = (ownedBooks ?? []).find((book) =>
    (book.members ?? []).some((member) => member.user_id !== user.id)
  );
  if (sharedBook) {
    return {
      success: false,
      error: `Transfer ownership of “${sharedBook.title}” before deleting your account. An administrator can help with this.`,
    };
  }

  // Remove Storage objects under `${userId}/` in each user-namespaced bucket.
  for (const bucket of USER_STORAGE_BUCKETS) {
    const { data: objects, error: listError } = await service.storage
      .from(bucket)
      .list(user.id);

    if (listError) {
      return { success: false, error: "Could not remove your files. Please try again." };
    }

    if (objects && objects.length > 0) {
      const paths = objects.map((obj) => `${user.id}/${obj.name}`);
      let pathsToRemove = paths;
      if (bucket === "recipe-images") {
        const urls = paths.map((path) => service.storage.from(bucket).getPublicUrl(path).data.publicUrl);
        const { data: referenced, error: referencesError } = await service
          .from("recipes")
          .select("photo_url")
          .in("photo_url", urls);
        if (referencesError) {
          return { success: false, error: "Could not verify your recipe images. Please try again." };
        }
        const referencedUrls = new Set((referenced ?? []).map((recipe) => recipe.photo_url));
        pathsToRemove = paths.filter((path, index) => !referencedUrls.has(urls[index]));
      }
      const { error: removeError } = pathsToRemove.length
        ? await service.storage.from(bucket).remove(pathsToRemove)
        : { error: null };
      if (removeError) {
        return { success: false, error: "Could not remove your files. Please try again." };
      }
    }
  }

  // Delete the auth user; profile + all owned/contributed rows cascade.
  const { error: deleteError } = await service.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return { success: false, error: "Could not delete your account. Please try again." };
  }

  // Clear the now-orphaned session cookies for this browser.
  const supabase = await createClient();
  await supabase.auth.signOut();

  return { success: true, data: undefined };
}
