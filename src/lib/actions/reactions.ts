"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { canReact } from "@/lib/permissions";
import type { ActionResult, ReactionType, ReactionCounts, UserReactions } from "@/lib/types";

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
