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
 * Cascades from the auth-user delete (via migration 020) remove the profile and
 * every owned cookbook/household plus the user's contributions elsewhere. This
 * also purges the user's Storage objects, which do not cascade from DB rows.
 *
 * This is irreversible.
 */
export async function deleteAccount(): Promise<ActionResult> {
  const user = await requireUser();
  const service = createServiceClient();

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
      const { error: removeError } = await service.storage.from(bucket).remove(paths);
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
