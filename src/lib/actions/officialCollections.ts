"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { configureCollectionSchema, type ConfigureCollectionInput } from "@/lib/validators/officialCollection";
import type { ActionResult } from "@/lib/types";

export async function configureOfficialCollection(input: ConfigureCollectionInput): Promise<ActionResult<{ id: string; slug: string; published: boolean }>> {
  const user = await requireAdmin();
  const parsed = configureCollectionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  // The service-only RPC verifies ownership and source-book safety under a lock,
  // then saves publication and its audit entry in the same transaction.
  const admin = createServiceClient();
  const { data, error } = await admin.rpc("configure_official_collection", {
    actor_id: user.id,
    target_book_id: parsed.data.bookId,
    collection_slug: parsed.data.slug,
    collection_title: parsed.data.title,
    collection_description: parsed.data.description,
    collection_cover_style: parsed.data.coverStyle,
    make_published: parsed.data.published,
  });
  if (error || !data) return { success: false, error: error?.code === "23505" ? "That collection link is already in use. Choose another." : error?.message ?? "Could not save the collection. Please try again." };
  revalidatePath(`/app/admin/books/${parsed.data.bookId}`);
  revalidatePath("/collections/[slug]", "page");
  revalidatePath("/app/collections/[collectionId]", "page");
  revalidatePath("/app/collections/[collectionId]/recipes/[recipeId]", "page");
  revalidatePath("/app/bookshelf");
  const collection = Array.isArray(data) ? data[0] : data;
  return { success: true, data: { id: collection.id, slug: collection.slug, published: collection.published } };
}

export async function addOfficialCollection(collectionId: string): Promise<ActionResult> {
  await requireUser();
  if (!z.uuid().safeParse(collectionId).success) return { success: false, error: "Collection unavailable." };
  const client = await createClient();
  const { error } = await client.rpc("join_official_collection", { target_collection_id: collectionId });
  if (error) return { success: false, error: "This collection is no longer available. Refresh the page and try again." };
  revalidatePath("/app", "layout");
  return { success: true, data: undefined };
}

export async function removeOfficialCollection(collectionId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!z.uuid().safeParse(collectionId).success) return { success: false, error: "Collection unavailable." };
  const client = await createClient();
  const { error } = await client.from("official_collection_readers").delete().eq("collection_id", collectionId).eq("user_id", user.id);
  if (error) return { success: false, error: "Could not remove the collection. Please try again." };
  // The current collection page may be this account's only app access. Refresh
  // the destination rather than rerendering its now-inaccessible app layout.
  revalidatePath("/app/bookshelf");
  return { success: true, data: undefined };
}
