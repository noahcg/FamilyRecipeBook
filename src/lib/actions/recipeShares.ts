"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { canContribute, canView } from "@/lib/permissions";
import { getBookRecipeAccess } from "@/lib/entitlements";
import { createRecipe } from "@/lib/actions/recipes";
import type { ActionResult, BookRole, RecipeWithRelations } from "@/lib/types";

export type PublicSharedRecipe = Pick<RecipeWithRelations, "title" | "description" | "photo_url" | "source_name" | "story" | "prep_minutes" | "cook_minutes" | "servings" | "category" | "ingredients" | "instructions">;

const shareInput = z.object({ bookId: z.string().uuid(), recipeId: z.string().uuid() });

async function shareAccess(bookId: string, recipeId: string) {
  const user = await requireUser();
  if (!shareInput.safeParse({ bookId, recipeId }).success) return null;
  const supabase = await createClient();
  const [membershipResult, recipeResult] = await Promise.all([
    supabase.from("book_members").select("role").eq("book_id", bookId).eq("user_id", user.id).single(),
    supabase.from("recipes").select("id, book_id, created_by, moderation_hidden").eq("id", recipeId).single(),
  ]);
  const membership = membershipResult.data;
  const recipe = recipeResult.data;
  if (membershipResult.error || recipeResult.error || !membership || !recipe || recipe.book_id !== bookId || !canView(membership?.role ?? null)) return null;
  return { user, recipe, role: membership.role };
}

export async function getRecipeShareStatus(bookId: string, recipeId: string): Promise<ActionResult<{ shareId: string | null; canRevoke: boolean }>> {
  const access = await shareAccess(bookId, recipeId);
  if (!access) return { success: false, error: "This recipe is not available to share." };
  const { data: share, error } = await createServiceClient().from("recipe_public_shares").select("share_id, created_by").eq("recipe_id", recipeId).maybeSingle();
  if (error) return { success: false, error: "Could not check the public link. Please try again." };
  return { success: true, data: {
    shareId: share?.share_id ?? null,
    canRevoke: Boolean(share && (access.role === "keeper" || access.recipe.created_by === access.user.id || share.created_by === access.user.id)),
  } };
}

export async function revokeRecipeShare(bookId: string, recipeId: string): Promise<ActionResult> {
  const access = await shareAccess(bookId, recipeId);
  if (!access) return { success: false, error: "This recipe is not available to share." };
  const service = createServiceClient();
  const { data: share, error: readError } = await service.from("recipe_public_shares").select("share_id, created_by").eq("recipe_id", recipeId).maybeSingle();
  if (readError) return { success: false, error: "Could not check the public link. Please try again." };
  if (!share) return { success: true, data: undefined };
  if (access.role !== "keeper" && access.recipe.created_by !== access.user.id && share.created_by !== access.user.id) {
    return { success: false, error: "Only the Keeper, recipe author, or person who created the link can disable it." };
  }
  // Delete the inspected link only: a newly created link must not be revoked by a stale request.
  const { error } = await service.from("recipe_public_shares").delete().eq("recipe_id", recipeId).eq("share_id", share.share_id);
  if (error) return { success: false, error: "Could not disable the public link. Please try again." };
  revalidatePath(`/r/${share.share_id}`);
  return { success: true, data: undefined };
}

export async function getOrCreateRecipeShare(bookId: string, recipeId: string): Promise<ActionResult<{ shareId: string }>> {
  const access = await shareAccess(bookId, recipeId);
  if (!access || access.recipe.moderation_hidden) return { success: false, error: "This recipe is not available to share." };
  const service = createServiceClient();
  // Concurrent requests preserve the creator of the original link.
  const { error: insertError } = await service.from("recipe_public_shares").upsert(
    { recipe_id: recipeId, created_by: access.user.id }, { onConflict: "recipe_id", ignoreDuplicates: true }
  );
  if (insertError) return { success: false, error: "Could not create a share link." };
  const { data, error } = await service.from("recipe_public_shares").select("share_id").eq("recipe_id", recipeId).single();
  if (error || !data) return { success: false, error: "Could not create a share link." };
  return { success: true, data: { shareId: data.share_id } };
}

export async function getPublicSharedRecipe(shareId: string): Promise<PublicSharedRecipe | null> {
  if (!z.string().uuid().safeParse(shareId).success) return null;
  const service = createServiceClient();
  const { data: share } = await service.from("recipe_public_shares").select("recipe_id").eq("share_id", shareId).single();
  if (!share) return null;
  const [recipeResult, ingredientsResult, instructionsResult] = await Promise.all([
    service.from("recipes").select("title, description, photo_url, source_name, story, prep_minutes, cook_minutes, servings, category:book_categories!recipes_category_id_fkey(id, name)").eq("id", share.recipe_id).eq("moderation_hidden", false).single(),
    service.from("recipe_ingredients").select("id, position, quantity, unit, item, note, group_label, created_at").eq("recipe_id", share.recipe_id).order("position"),
    service.from("recipe_instructions").select("id, position, body, created_at").eq("recipe_id", share.recipe_id).order("position"),
  ]);
  const recipe = recipeResult.data;
  const ingredients = ingredientsResult.data;
  const instructions = instructionsResult.data;
  if (!recipe || recipeResult.error || ingredientsResult.error || instructionsResult.error) return null;
  return { ...recipe, category: recipe.category as unknown as PublicSharedRecipe["category"], ingredients: ingredients ?? [], instructions: instructions ?? [] } as PublicSharedRecipe;
}

export async function saveSharedRecipe(shareId: string): Promise<ActionResult<{ bookId: string; recipeId: string }>> {
  const user = await requireUser();
  const recipe = await getPublicSharedRecipe(shareId);
  if (!recipe) return { success: false, error: "This shared recipe is no longer available." };
  const supabase = await createClient();
  const { data: memberships } = await supabase.from("book_members").select("book_id, role").eq("user_id", user.id).order("created_at");
  let destination: { book_id: string; role: BookRole } | undefined;
  let hasFullCookbook = false;
  for (const membership of (memberships ?? []) as { book_id: string; role: BookRole }[]) {
    if (!canContribute(membership.role)) continue;
    const access = await getBookRecipeAccess(membership.book_id, user.id);
    if (access.allowed) {
      destination = membership;
      break;
    }
    if (access.canContribute && access.limit !== null && access.used >= access.limit) hasFullCookbook = true;
  }
  if (!destination) return {
    success: false,
    error: hasFullCookbook
      ? "Your Free cookbook already has 50 recipes. Upgrade to Plus to keep saving."
      : "Create a cookbook before saving recipes.",
  };
  // Reuse the atomic recipe writer so a failed child insert never leaves a
  // partially saved public recipe or reports a false success.
  const result = await createRecipe(destination.book_id, {
    title: recipe.title, description: recipe.description ?? undefined,
    photo_url: recipe.photo_url, source_name: recipe.source_name ?? undefined,
    story: recipe.story ?? undefined, prep_minutes: recipe.prep_minutes ?? undefined,
    cook_minutes: recipe.cook_minutes ?? undefined, servings: recipe.servings ?? undefined,
    category: recipe.category?.name,
    ingredients: recipe.ingredients.map((item) => ({
      quantity: item.quantity ?? undefined, unit: item.unit ?? undefined,
      item: item.item, note: item.note ?? undefined, group_label: item.group_label,
    })),
    instructions: recipe.instructions.map((item) => ({ body: item.body })),
  });
  if (!result.success) return result;
  revalidatePath(`/app/books/${destination.book_id}`);
  return { success: true, data: { bookId: destination.book_id, recipeId: result.data.id } };
}
