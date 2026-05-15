"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { canReact } from "@/lib/permissions";
import type { ActionResult, ReactionType, ReactionCounts, UserReactions, RecipeRatingSummary } from "@/lib/types";

async function getBookRole(supabase: Awaited<ReturnType<typeof createClient>>, bookId: string, userId: string) {
  const { data } = await supabase
    .from("book_members")
    .select("role")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .single();
  return data?.role ?? null;
}

export async function toggleReaction(
  bookId: string,
  recipeId: string,
  type: ReactionType
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);

  if (!canReact(role)) {
    return { success: false, error: "Join this book to react to recipes." };
  }

  // Check if already reacted
  const { data: existing } = await supabase
    .from("recipe_reactions")
    .select("id")
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id)
    .eq("type", type)
    .single();

  if (existing) {
    await supabase.from("recipe_reactions").delete().eq("id", existing.id);
  } else {
    await supabase
      .from("recipe_reactions")
      .insert({ recipe_id: recipeId, user_id: user.id, type });
  }

  revalidatePath(`/app/books/${bookId}/recipes/${recipeId}`);
  return { success: true, data: undefined };
}

export async function getReactionData(
  recipeId: string,
  userId: string
): Promise<{ counts: ReactionCounts; userReactions: UserReactions }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipe_reactions")
    .select("type, user_id")
    .eq("recipe_id", recipeId);

  const reactions = data ?? [];
  const counts: ReactionCounts = { love: 0, made_it: 0, favorite: 0 };
  const userReactions: UserReactions = { love: false, made_it: false, favorite: false };

  for (const r of reactions) {
    counts[r.type as ReactionType]++;
    if (r.user_id === userId) {
      userReactions[r.type as ReactionType] = true;
    }
  }

  return { counts, userReactions };
}

function normalizeRating(rating: number) {
  return Math.round(rating * 2) / 2;
}

export async function setRecipeRating(
  bookId: string,
  recipeId: string,
  rating: number
): Promise<ActionResult<RecipeRatingSummary>> {
  const user = await requireUser();
  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);

  if (!canReact(role)) {
    return { success: false, error: "Join this book to rate recipes." };
  }

  const normalized = normalizeRating(rating);
  if (normalized < 0 || normalized > 5 || normalized !== rating) {
    return { success: false, error: "Choose a rating from 0 to 5 stars." };
  }

  if (normalized === 0) {
    const { error } = await supabase
      .from("recipe_ratings")
      .delete()
      .eq("recipe_id", recipeId)
      .eq("user_id", user.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("recipe_ratings")
      .upsert(
        {
          recipe_id: recipeId,
          user_id: user.id,
          rating: normalized,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "recipe_id,user_id" }
      );
    if (error) return { success: false, error: error.message };
  }

  revalidatePath(`/app/books/${bookId}/recipes/${recipeId}`);
  return { success: true, data: await getRecipeRatingSummary(recipeId, user.id) };
}

export async function getRecipeRatingSummary(
  recipeId: string,
  userId: string
): Promise<RecipeRatingSummary> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipe_ratings")
    .select("rating, user_id")
    .eq("recipe_id", recipeId);

  const ratings = data ?? [];
  const count = ratings.length;
  const total = ratings.reduce((sum, row) => sum + Number(row.rating), 0);
  const average = count ? normalizeRating(total / count) : 0;
  const userRating = Number(ratings.find((row) => row.user_id === userId)?.rating ?? 0);

  return { average, count, userRating };
}
