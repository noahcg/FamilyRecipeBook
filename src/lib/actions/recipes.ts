"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { canContribute, canEditRecipe, canDeleteRecipe } from "@/lib/permissions";
import {
  createRecipeSchema,
  updateRecipeSchema,
  type CreateRecipeInput,
  type UpdateRecipeInput,
} from "@/lib/validators/recipe";
import type { ActionResult, Recipe, RecipeWithRelations } from "@/lib/types";

async function getBookRole(supabase: Awaited<ReturnType<typeof createClient>>, bookId: string, userId: string) {
  const { data } = await supabase
    .from("book_members")
    .select("role")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .single();
  return data?.role ?? null;
}

export async function createRecipe(
  bookId: string,
  input: CreateRecipeInput
): Promise<ActionResult<Recipe>> {
  const user = await requireUser();
  const parsed = createRecipeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);

  if (!canContribute(role)) {
    return { success: false, error: "You don't have permission to add recipes." };
  }

  const { ingredients, instructions, ...recipeFields } = parsed.data;

  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({ ...recipeFields, book_id: bookId, created_by: user.id })
    .select()
    .single();

  if (error || !recipe) {
    return { success: false, error: error?.message ?? "Could not create recipe" };
  }

  // Insert ingredients and instructions
  if (ingredients.length) {
    await supabase.from("recipe_ingredients").insert(
      ingredients.map((ing, i) => ({ ...ing, recipe_id: recipe.id, position: i + 1 }))
    );
  }
  if (instructions.length) {
    await supabase.from("recipe_instructions").insert(
      instructions.map((ins, i) => ({ body: ins.body, recipe_id: recipe.id, position: i + 1 }))
    );
  }

  // Log activity
  await supabase.from("activity_events").insert({
    book_id: bookId,
    recipe_id: recipe.id,
    actor_id: user.id,
    type: "recipe_created",
    metadata: { recipe_title: recipe.title },
  });

  revalidatePath(`/app/books/${bookId}`);
  return { success: true, data: recipe };
}

export async function updateRecipe(
  bookId: string,
  recipeId: string,
  input: UpdateRecipeInput
): Promise<ActionResult<Recipe>> {
  const user = await requireUser();
  const parsed = updateRecipeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);

  const { data: existing } = await supabase
    .from("recipes")
    .select("created_by")
    .eq("id", recipeId)
    .single();

  if (!canEditRecipe(role, existing?.created_by === user.id)) {
    return { success: false, error: "You don't have permission to edit this recipe." };
  }

  const { ingredients, instructions, ...recipeFields } = parsed.data;

  const { data: recipe, error } = await supabase
    .from("recipes")
    .update({ ...recipeFields, updated_at: new Date().toISOString() })
    .eq("id", recipeId)
    .select()
    .single();

  if (error || !recipe) {
    return { success: false, error: error?.message ?? "Could not update recipe" };
  }

  // Replace ingredients/instructions if provided
  if (ingredients) {
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
    await supabase.from("recipe_ingredients").insert(
      ingredients.map((ing, i) => ({ ...ing, recipe_id: recipeId, position: i + 1 }))
    );
  }
  if (instructions) {
    await supabase.from("recipe_instructions").delete().eq("recipe_id", recipeId);
    await supabase.from("recipe_instructions").insert(
      instructions.map((ins, i) => ({ body: ins.body, recipe_id: recipeId, position: i + 1 }))
    );
  }

  revalidatePath(`/app/books/${bookId}/recipes/${recipeId}`);
  return { success: true, data: recipe };
}

export async function deleteRecipe(
  bookId: string,
  recipeId: string
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);

  const { data: existing } = await supabase
    .from("recipes")
    .select("created_by")
    .eq("id", recipeId)
    .single();

  if (!canDeleteRecipe(role, existing?.created_by === user.id)) {
    return { success: false, error: "You don't have permission to delete this recipe." };
  }

  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/app/books/${bookId}`);
  return { success: true, data: undefined };
}

export async function getRecipe(recipeId: string): Promise<RecipeWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipes")
    .select(`
      *,
      ingredients:recipe_ingredients(* order by position asc),
      instructions:recipe_instructions(* order by position asc),
      stories:recipe_stories(*, author:profiles(*)),
      reactions:recipe_reactions(*),
      creator:profiles!created_by(*)
    `)
    .eq("id", recipeId)
    .single();

  return data as RecipeWithRelations | null;
}

export async function addRecipeStory(
  bookId: string,
  recipeId: string,
  body: string
): Promise<ActionResult> {
  const user = await requireUser();
  if (!body.trim()) return { success: false, error: "Memory cannot be empty." };

  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);
  if (!role) return { success: false, error: "Not a member of this book." };

  const { error } = await supabase
    .from("recipe_stories")
    .insert({ recipe_id: recipeId, author_id: user.id, body: body.trim() });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/app/books/${bookId}/recipes/${recipeId}`);
  return { success: true, data: undefined };
}
