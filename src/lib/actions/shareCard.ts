"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { shareCardPhoto } from "@/lib/shareCardPhoto";
import { validMediaPath } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function saveShareCard(bookId: string, recipeId: string | null, customPath: string | null = null): Promise<ActionResult> {
  if (!z.uuid().safeParse(bookId).success || (recipeId !== null && !z.uuid().safeParse(recipeId).success) || (recipeId && customPath) || (customPath !== null && !validMediaPath(customPath))) {
    return { success: false, error: "Choose a valid recipe." };
  }
  const user = await getUser();
  if (!user) return { success: false, error: "Please sign in and try again." };
  const supabase = await createClient();
  const { data: member } = await supabase.from("book_members").select("role").eq("book_id", bookId).eq("user_id", user.id).maybeSingle();
  if (member?.role !== "keeper") return { success: false, error: "Only the cookbook keeper can change the sharing image." };
  if (customPath && (!customPath.startsWith(`${user.id}/`) || !/^[0-9a-f-]{36}\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(customPath))) return { success: false, error: "Choose an image you uploaded." };
  if (recipeId) {
    const { data: recipe } = await supabase.from("recipes").select("photo_url,moderation_hidden").eq("id", recipeId).eq("book_id", bookId).maybeSingle();
    if (!recipe?.photo_url || recipe.moderation_hidden || !shareCardPhoto(recipe.photo_url)) {
      return { success: false, error: "Choose a recipe in this cookbook with an uploaded or Pexels photo." };
    }
  }
  const { data: previous } = await supabase.from("recipe_books").select("share_card_custom_path").eq("id", bookId).maybeSingle();
  const { error } = await supabase.from("recipe_books").update({ share_card_recipe_id: recipeId, share_card_custom_path: customPath }).eq("id", bookId);
  if (error) return { success: false, error: "Could not save the sharing image. Check that the latest database migration is installed and try again." };
  if (previous?.share_card_custom_path && previous.share_card_custom_path !== customPath && previous.share_card_custom_path.startsWith(`${user.id}/`)) {
    await supabase.storage.from("recipe-images").remove([previous.share_card_custom_path]);
  }
  revalidatePath(`/app/books/${bookId}/settings`);
  return { success: true, data: undefined };
}
