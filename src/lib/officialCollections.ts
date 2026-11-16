import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { collectionSlugSchema } from "@/lib/validators/officialCollection";

export interface OfficialCollection {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_style: string;
}

export interface OfficialCollectionLibraryItem extends OfficialCollection {
  published: boolean;
  recipe_count: number;
}

export interface OfficialCollectionChapter {
  name: string;
  recipe_count: number;
}

export interface CollectionRecipeSummary {
  id: string;
  title: string;
  description: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number | null;
  category_name: string | null;
  has_photo: boolean;
}

export interface CollectionRecipeDetail extends CollectionRecipeSummary {
  ingredients: { quantity: string | null; unit: string | null; item: string; note: string | null; group_label: string | null; position: number }[];
  instructions: { body: string; group_label: string | null; position: number }[];
}

// All content reads use the signed-in client's narrow RPCs. A collection reader
// never gains RLS access to the source cookbook or its family collaboration data.
export async function getOfficialCollectionPreview(slug: string): Promise<OfficialCollection | null> {
  if (!collectionSlugSchema.safeParse(slug).success) return null;
  const client = await createClient();
  const { data, error } = await client.rpc("official_collection_preview", { collection_slug: slug });
  if (error) throw new Error("Unable to load this collection. Please try again.");
  return (data?.[0] as OfficialCollection | undefined) ?? null;
}

export async function getOfficialCollectionChapters(slug: string): Promise<OfficialCollectionChapter[] | null> {
  if (!collectionSlugSchema.safeParse(slug).success) return [];
  const client = await createClient();
  // This public RPC deliberately exposes chapter names/counts only. Recipes,
  // photos, and family activity keep their existing access requirements.
  const { data, error } = await client.rpc("official_collection_chapters", { collection_slug: slug });
  if (error) return null;
  return ((data ?? []) as OfficialCollectionChapter[]).map((chapter) => ({ name: chapter.name, recipe_count: Number(chapter.recipe_count) }));
}

export async function getOfficialCollectionLibrary(): Promise<OfficialCollectionLibraryItem[]> {
  const client = await createClient();
  const { data, error } = await client.rpc("official_collection_library");
  if (error) throw new Error("Unable to load your Home Cooked collections. Please try again.");
  return (data ?? []) as OfficialCollectionLibraryItem[];
}

export async function getCollectionRecipes(collectionId: string, query: string, page: number): Promise<{ recipes: CollectionRecipeSummary[]; total: number } | null> {
  if (!z.uuid().safeParse(collectionId).success) return null;
  const client = await createClient();
  const { data, error } = await client.rpc("official_collection_recipes", {
    target_collection_id: collectionId, search_query: query.slice(0, 120), page_number: page,
  });
  if (error?.code === "42501") return null;
  if (error) throw new Error("Unable to load the recipes. Please try again.");
  return data as { recipes: CollectionRecipeSummary[]; total: number } | null;
}

export async function getCollectionRecipe(collectionId: string, recipeId: string): Promise<CollectionRecipeDetail | null> {
  if (!z.uuid().safeParse(collectionId).success || !z.uuid().safeParse(recipeId).success) return null;
  const client = await createClient();
  const { data, error } = await client.rpc("official_collection_recipe", { target_collection_id: collectionId, target_recipe_id: recipeId });
  if (error?.code === "42501") return null;
  if (error) throw new Error("Unable to load this recipe. Please try again.");
  return data as CollectionRecipeDetail | null;
}
