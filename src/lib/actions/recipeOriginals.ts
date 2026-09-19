"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canEditRecipe } from "@/lib/permissions";
import { isRecipeOriginalPath, originalFileName, recipeOriginalUploadSchema, type RecipeOriginal } from "@/lib/recipeOriginals";
import type { ActionResult, BookRole } from "@/lib/types";

const BUCKET = "recipe-originals";

async function recipeAccess(recipeId: string, edit = false) {
  if (!z.uuid().safeParse(recipeId).success) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: recipe } = await supabase.from("recipes").select("book_id, created_by").eq("id", recipeId).single();
  if (!recipe) return null;
  const { data: member } = await supabase.from("book_members").select("role").eq("book_id", recipe.book_id).eq("user_id", user.id).single();
  if (!member || (edit && !canEditRecipe(member.role as BookRole, recipe.created_by === user.id))) return null;
  return supabase;
}

async function listFiles(supabase: Awaited<ReturnType<typeof createClient>>, recipeId: string) {
  const files: { name: string }[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(BUCKET).list(recipeId, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) return { data: null, error };
    files.push(...data.filter((file) => file.id && isRecipeOriginalPath(recipeId, `${recipeId}/${file.name}`)));
    if (data.length < 100) return { data: files, error: null };
  }
}

export async function listRecipeOriginals(recipeId: string): Promise<ActionResult<RecipeOriginal[]>> {
  const supabase = await recipeAccess(recipeId);
  if (!supabase) return { success: false, error: "You don't have access to this recipe." };
  const { data: files, error } = await listFiles(supabase, recipeId);
  if (error) return { success: false, error: "Couldn't load original recipes. Please try again." };
  if (!files.length) return { success: true, data: [] };
  const { data, error: signError } = await supabase.storage.from(BUCKET).createSignedUrls(files.map((file) => `${recipeId}/${file.name}`), 300);
  if (signError || !data || data.some((file) => file.error || !file.signedUrl)) return { success: false, error: "Couldn't open original recipes. Please try again." };
  return { success: true, data: data.map((file, i) => ({ path: `${recipeId}/${files[i].name}`, name: files[i].name.slice(37), url: file.signedUrl! })) };
}

export async function prepareRecipeOriginalUpload(recipeId: string, name: string, size: number, type: string): Promise<ActionResult<{ path: string; token: string }>> {
  const parsed = recipeOriginalUploadSchema.safeParse({ recipeId, name, size, type });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  const supabase = await recipeAccess(recipeId, true);
  if (!supabase) return { success: false, error: "You don't have permission to attach originals to this recipe." };
  const path = `${recipeId}/${crypto.randomUUID()}_${originalFileName(parsed.data.name, type)}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { success: false, error: "Couldn't prepare the upload. Please try again." };
  return { success: true, data: { path, token: data.token } };
}

export async function removeRecipeOriginal(recipeId: string, path: string): Promise<ActionResult> {
  if (!isRecipeOriginalPath(recipeId, path)) return { success: false, error: "Invalid original recipe." };
  const supabase = await recipeAccess(recipeId, true);
  if (!supabase) return { success: false, error: "You don't have permission to remove originals from this recipe." };
  const { data, error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error || !data?.length) return { success: false, error: "Couldn't remove the original. Please refresh and try again." };
  return { success: true, data: undefined };
}

export async function copyRecipeOriginals(sourceId: string, targetId: string): Promise<ActionResult> {
  const sourceClient = await recipeAccess(sourceId);
  const targetClient = await recipeAccess(targetId, true);
  if (!sourceClient || !targetClient || sourceId === targetId) return { success: false, error: "You don't have permission to copy these originals." };
  const { data: files, error } = await listFiles(sourceClient, sourceId);
  if (error) {
    // During rollout, recipes cannot have originals before the bucket exists.
    if (error.message.toLowerCase().includes("bucket not found")) return { success: true, data: undefined };
    return { success: false, error: "Couldn't load original recipes for copying." };
  }
  const copied: string[] = [];
  for (const file of files) {
    const targetPath = `${targetId}/${crypto.randomUUID()}_${file.name.slice(37)}`;
    const { error: copyError } = await targetClient.storage.from(BUCKET).copy(`${sourceId}/${file.name}`, targetPath);
    if (copyError) {
      if (copied.length) await targetClient.storage.from(BUCKET).remove(copied);
      return { success: false, error: "Couldn't copy the original recipe files. Please try again." };
    }
    copied.push(targetPath);
  }
  return { success: true, data: undefined };
}
