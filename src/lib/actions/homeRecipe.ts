"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function getHomeRecipe() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: settings } = await supabase.from("user_settings")
    .select("home_recipe_id").eq("user_id", user.id).maybeSingle();
  if (!settings?.home_recipe_id) return null;

  // The normal user client enforces recipe access even if access has changed.
  const { data } = await supabase.from("recipes")
    .select("id, title, description, photo_url, book_id, book:recipe_books!recipes_book_id_fkey(title)")
    .eq("id", settings.home_recipe_id).maybeSingle();
  if (!data) return null;
  const book = Array.isArray(data.book) ? data.book[0] : data.book;
  return { ...data, bookId: data.book_id, bookTitle: book?.title ?? "Recipe Book" };
}

export async function setHomeRecipe(recipeId: string, pinned: boolean): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(recipeId).success || typeof pinned !== "boolean") {
    return { success: false, error: "Choose a valid recipe." };
  }
  const user = await requireUser();
  const supabase = await createClient();
  if (pinned) {
    const { data: recipe } = await supabase.from("recipes").select("id").eq("id", recipeId).maybeSingle();
    if (!recipe) return { success: false, error: "This recipe is no longer available." };
    const { error } = await supabase.from("user_settings").upsert(
      { user_id: user.id, home_recipe_id: recipeId }, { onConflict: "user_id" }
    );
    if (error) return { success: false, error: "Could not save your home recipe. Try again." };
  } else {
    const { error } = await supabase.from("user_settings").update({ home_recipe_id: null })
      .eq("user_id", user.id).eq("home_recipe_id", recipeId);
    if (error) return { success: false, error: "Could not remove your home recipe. Try again." };
  }
  revalidatePath("/app", "layout");
  return { success: true, data: undefined };
}
