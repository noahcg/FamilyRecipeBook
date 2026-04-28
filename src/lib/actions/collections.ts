"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { canManageCollections } from "@/lib/permissions";
import {
  createCollectionSchema,
  updateCollectionSchema,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from "@/lib/validators/collection";
import type { ActionResult, Collection } from "@/lib/types";

async function getBookRole(supabase: Awaited<ReturnType<typeof createClient>>, bookId: string, userId: string) {
  const { data } = await supabase
    .from("book_members")
    .select("role")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .single();
  return data?.role ?? null;
}

export async function createCollection(
  bookId: string,
  input: CreateCollectionInput
): Promise<ActionResult<Collection>> {
  const user = await requireUser();
  const parsed = createCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);

  if (!canManageCollections(role)) {
    return { success: false, error: "You don't have permission to create collections." };
  }

  const { data: collection, error } = await supabase
    .from("collections")
    .insert({ ...parsed.data, book_id: bookId, created_by: user.id })
    .select()
    .single();

  if (error || !collection) {
    return { success: false, error: error?.message ?? "Could not create collection" };
  }

  revalidatePath(`/app/books/${bookId}/collections`);
  return { success: true, data: collection };
}

export async function updateCollection(
  bookId: string,
  collectionId: string,
  input: UpdateCollectionInput
): Promise<ActionResult<Collection>> {
  const user = await requireUser();
  const parsed = updateCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);

  if (!canManageCollections(role)) {
    return { success: false, error: "You don't have permission to edit collections." };
  }

  const { data: collection, error } = await supabase
    .from("collections")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", collectionId)
    .select()
    .single();

  if (error || !collection) {
    return { success: false, error: error?.message ?? "Could not update collection" };
  }

  revalidatePath(`/app/books/${bookId}/collections`);
  return { success: true, data: collection };
}

export async function addRecipeToCollection(
  bookId: string,
  collectionId: string,
  recipeId: string
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);

  if (!canManageCollections(role)) {
    return { success: false, error: "You don't have permission to manage collections." };
  }

  const { error } = await supabase
    .from("collection_recipes")
    .upsert({ collection_id: collectionId, recipe_id: recipeId });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/app/books/${bookId}/collections/${collectionId}`);
  return { success: true, data: undefined };
}

export async function removeRecipeFromCollection(
  bookId: string,
  collectionId: string,
  recipeId: string
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);

  if (!canManageCollections(role)) {
    return { success: false, error: "You don't have permission to manage collections." };
  }

  const { error } = await supabase
    .from("collection_recipes")
    .delete()
    .eq("collection_id", collectionId)
    .eq("recipe_id", recipeId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/app/books/${bookId}/collections/${collectionId}`);
  return { success: true, data: undefined };
}
