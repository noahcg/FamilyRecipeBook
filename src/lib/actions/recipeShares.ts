"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { canContribute, canView } from "@/lib/permissions";
import type { ActionResult, RecipeWithRelations } from "@/lib/types";

export type PublicSharedRecipe = Pick<RecipeWithRelations, "title" | "description" | "photo_url" | "source_name" | "story" | "prep_minutes" | "cook_minutes" | "servings" | "category" | "ingredients" | "instructions">;

export async function getOrCreateRecipeShare(bookId: string, recipeId: string): Promise<ActionResult<{ shareId: string }>> {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: membership }, { data: recipe }] = await Promise.all([
    supabase.from("book_members").select("role").eq("book_id", bookId).eq("user_id", user.id).single(),
    supabase.from("recipes").select("id, book_id").eq("id", recipeId).single(),
  ]);
  if (!recipe || recipe.book_id !== bookId || !canView(membership?.role ?? null)) return { success: false, error: "This recipe is not available to share." };
  const { data, error } = await createServiceClient().from("recipe_public_shares").upsert(
    { recipe_id: recipeId, created_by: user.id }, { onConflict: "recipe_id", ignoreDuplicates: false }
  ).select("share_id").single();
  if (error || !data) return { success: false, error: "Could not create a share link." };
  return { success: true, data: { shareId: data.share_id } };
}

export async function getPublicSharedRecipe(shareId: string): Promise<PublicSharedRecipe | null> {
  const service = createServiceClient();
  const { data: share } = await service.from("recipe_public_shares").select("recipe_id").eq("share_id", shareId).single();
  if (!share) return null;
  const [{ data: recipe }, { data: ingredients }, { data: instructions }] = await Promise.all([
    service.from("recipes").select("title, description, photo_url, source_name, story, prep_minutes, cook_minutes, servings, category:book_categories!recipes_category_id_fkey(id, name)").eq("id", share.recipe_id).single(),
    service.from("recipe_ingredients").select("id, position, quantity, unit, item, note, group_label, created_at").eq("recipe_id", share.recipe_id).order("position"),
    service.from("recipe_instructions").select("id, position, body, created_at").eq("recipe_id", share.recipe_id).order("position"),
  ]);
  if (!recipe) return null;
  return { ...recipe, category: recipe.category as unknown as PublicSharedRecipe["category"], ingredients: ingredients ?? [], instructions: instructions ?? [] } as PublicSharedRecipe;
}

export async function saveSharedRecipe(shareId: string): Promise<ActionResult<{ bookId: string; recipeId: string }>> {
  const user = await requireUser();
  const recipe = await getPublicSharedRecipe(shareId);
  if (!recipe) return { success: false, error: "This shared recipe is no longer available." };
  const supabase = await createClient();
  const { data: memberships } = await supabase.from("book_members").select("book_id, role").eq("user_id", user.id).order("created_at");
  const destination = (memberships ?? []).find((membership) => canContribute(membership.role));
  if (!destination) return { success: false, error: "Create a cookbook before saving recipes." };
  const { data: inserted, error } = await supabase.from("recipes").insert({
    book_id: destination.book_id, created_by: user.id, title: recipe.title, description: recipe.description,
    photo_url: recipe.photo_url, source_name: recipe.source_name, story: recipe.story,
    prep_minutes: recipe.prep_minutes, cook_minutes: recipe.cook_minutes, servings: recipe.servings,
  }).select("id").single();
  if (error || !inserted) return { success: false, error: "Could not save this recipe." };
  if (recipe.ingredients.length) await supabase.from("recipe_ingredients").insert(recipe.ingredients.map((item, index) => ({
    recipe_id: inserted.id, position: index + 1, quantity: item.quantity, unit: item.unit,
    item: item.item, note: item.note, group_label: item.group_label,
  })));
  if (recipe.instructions.length) await supabase.from("recipe_instructions").insert(recipe.instructions.map((item, index) => ({
    recipe_id: inserted.id, position: index + 1, body: item.body,
  })));
  revalidatePath(`/app/books/${destination.book_id}`);
  return { success: true, data: { bookId: destination.book_id, recipeId: inserted.id } };
}
