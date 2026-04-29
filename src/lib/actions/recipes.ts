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

  if (ingredients.length) {
    const { error: ingredientsError } = await supabase.from("recipe_ingredients").insert(
      ingredients.map((ing, i) => ({ ...ing, recipe_id: recipe.id, position: i + 1 }))
    );
    if (ingredientsError) {
      return { success: false, error: ingredientsError.message };
    }
  }
  if (instructions.length) {
    const { error: instructionsError } = await supabase.from("recipe_instructions").insert(
      instructions.map((ins, i) => ({ body: ins.body, recipe_id: recipe.id, position: i + 1 }))
    );
    if (instructionsError) {
      return { success: false, error: instructionsError.message };
    }
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
  revalidatePath(`/app/books/${bookId}/recipes/${recipe.id}`);
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
    if (ingredients.length) {
      const { error: ingredientsError } = await supabase.from("recipe_ingredients").insert(
        ingredients.map((ing, i) => ({ ...ing, recipe_id: recipeId, position: i + 1 }))
      );
      if (ingredientsError) {
        return { success: false, error: ingredientsError.message };
      }
    }
  }
  if (instructions) {
    await supabase.from("recipe_instructions").delete().eq("recipe_id", recipeId);
    if (instructions.length) {
      const { error: instructionsError } = await supabase.from("recipe_instructions").insert(
        instructions.map((ins, i) => ({ body: ins.body, recipe_id: recipeId, position: i + 1 }))
      );
      if (instructionsError) {
        return { success: false, error: instructionsError.message };
      }
    }
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

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .select("*, creator:profiles!created_by(*)")
    .eq("id", recipeId)
    .single();

  if (recipeError || !recipe) return null;

  const [
    { data: ingredients, error: ingredientsError },
    { data: instructions, error: instructionsError },
    { data: stories, error: storiesError },
    { data: reactions, error: reactionsError },
  ] = await Promise.all([
    supabase
      .from("recipe_ingredients")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("position", { ascending: true }),
    supabase
      .from("recipe_instructions")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("position", { ascending: true }),
    supabase
      .from("recipe_stories")
      .select("*, author:profiles(*)")
      .eq("recipe_id", recipeId)
      .order("created_at", { ascending: true }),
    supabase
      .from("recipe_reactions")
      .select("*")
      .eq("recipe_id", recipeId),
  ]);

  if (ingredientsError || instructionsError || storiesError || reactionsError) {
    return null;
  }

  return {
    ...recipe,
    ingredients: ingredients ?? [],
    instructions: instructions ?? [],
    stories: stories ?? [],
    reactions: reactions ?? [],
  } as RecipeWithRelations;
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
