"use server";

import { createRecipe } from "@/lib/actions/recipes";
import { selectRecipeImage } from "@/lib/actions/pexels";
import { aiRecipeIdeaSchema, generateRecipeIdea as generateIdea, type AIRecipeIdea } from "@/lib/ai/recipeGeneration";
import type { ActionResult, Recipe } from "@/lib/types";

export type { AIRecipeIdea } from "@/lib/ai/recipeGeneration";

export async function generateRecipeIdea(prompt: string, bookId: string): Promise<ActionResult<AIRecipeIdea>> {
  return generateIdea(prompt, bookId);
}

export async function saveRecipeIdea(
  bookId: string,
  idea: AIRecipeIdea
): Promise<ActionResult<Recipe>> {
  const parsed = aiRecipeIdeaSchema.safeParse(idea);
  if (!parsed.success) {
    return { success: false, error: "This recipe idea is not ready to save." };
  }

  const ingredientNames = parsed.data.ingredients.map((i) => i.item);
  const photo_url = await selectRecipeImage(parsed.data.title, ingredientNames) ?? undefined;

  return createRecipe(bookId, {
    ...parsed.data,
    photo_url,
    source_name: parsed.data.source_name || "AI Recipe Idea",
    ingredients: parsed.data.ingredients.map((ingredient) => ({
      quantity: ingredient.quantity.slice(0, 20),
      unit: ingredient.unit.slice(0, 30),
      item: ingredient.item,
      note: ingredient.note.slice(0, 200),
    })),
    instructions: parsed.data.instructions,
  });
}
