"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireUser } from "@/lib/auth";
import { listCategories, resolveCategoryIdForBook } from "@/lib/actions/categories";
import {
  canContribute,
  canEditRecipe,
  canDeleteRecipe,
  canManageBook,
  canView,
} from "@/lib/permissions";
import {
  createRecipeSchema,
  updateRecipeSchema,
  type CreateRecipeInput,
  type UpdateRecipeInput,
} from "@/lib/validators/recipe";
import type {
  ActionResult,
  BookRole,
  Recipe,
  RecipeTransferTarget,
  RecipeWithRelations,
} from "@/lib/types";

const RECIPE_SELECT_WITH_CATEGORY =
  "*, category:book_categories!recipes_category_id_fkey(id, name)";

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

  const { ingredients, instructions, category, ...recipeFields } = parsed.data;
  const category_id = await resolveCategoryIdForBook(bookId, category);

  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({ ...recipeFields, category_id, book_id: bookId, created_by: user.id })
    .select(RECIPE_SELECT_WITH_CATEGORY)
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

export async function createRecipesBatch(
  bookId: string,
  inputs: CreateRecipeInput[]
): Promise<ActionResult<{ ids: string[] }>> {
  const ids: string[] = [];

  if (!inputs.length) {
    return { success: false, error: "Select at least one recipe to import." };
  }

  for (const input of inputs) {
    const result = await createRecipe(bookId, input);
    if (!result.success) {
      return {
        success: false,
        error: ids.length
          ? `Saved ${ids.length} recipe${ids.length === 1 ? "" : "s"}, then stopped: ${result.error}`
          : result.error,
      };
    }
    ids.push(result.data.id);
  }

  revalidatePath(`/app/books/${bookId}`);
  revalidatePath(`/app/books/${bookId}/recipes`);
  return { success: true, data: { ids } };
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

  const { ingredients, instructions, category, ...recipeFields } = parsed.data;
  const updatePayload: Record<string, unknown> = {
    ...recipeFields,
    updated_at: new Date().toISOString(),
  };
  if (category !== undefined) {
    updatePayload.category_id = await resolveCategoryIdForBook(bookId, category);
  }

  const { data: recipe, error } = await supabase
    .from("recipes")
    .update(updatePayload)
    .eq("id", recipeId)
    .select(RECIPE_SELECT_WITH_CATEGORY)
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

// ─── Copy / move recipes between books ────────────────────────

// The user's other cookbooks (excluding the current one) with their role in
// each, used to power the "copy/move to another book" picker.
export async function getRecipeTransferTargets(
  currentBookId: string
): Promise<RecipeTransferTarget[]> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("book_members")
    .select("role, book:recipe_books(id, title)")
    .eq("user_id", user.id);

  const rows = (data ?? []) as unknown as {
    role: BookRole;
    book: { id: string; title: string } | { id: string; title: string }[] | null;
  }[];

  const targets: RecipeTransferTarget[] = [];
  for (const row of rows) {
    const book = Array.isArray(row.book) ? row.book[0] : row.book;
    if (!book || book.id === currentBookId) continue;
    targets.push({ id: book.id, title: book.title, role: row.role });
  }
  return targets.sort((a, b) => a.title.localeCompare(b.title));
}

// Duplicate a recipe (and everything attached to it — ingredients,
// instructions, memories, reactions, and ratings) into another cookbook.
// The copier owns the new recipe; authored content keeps its original
// authorship, which requires the service-role client to preserve.
export async function copyRecipeToBook(
  sourceBookId: string,
  recipeId: string,
  targetBookId: string
): Promise<ActionResult<{ recipeId: string; bookId: string }>> {
  const user = await requireUser();
  if (sourceBookId === targetBookId) {
    return { success: false, error: "Choose a different cookbook." };
  }

  const supabase = await createClient();
  const [sourceRole, targetRole] = await Promise.all([
    getBookRole(supabase, sourceBookId, user.id),
    getBookRole(supabase, targetBookId, user.id),
  ]);

  if (!canView(sourceRole as BookRole | null)) {
    return { success: false, error: "You don't have access to this recipe." };
  }
  if (!canContribute(targetRole as BookRole | null)) {
    return {
      success: false,
      error: "You can only copy into cookbooks where you can add recipes.",
    };
  }

  const { data: src } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT_WITH_CATEGORY)
    .eq("id", recipeId)
    .eq("book_id", sourceBookId)
    .single();
  if (!src) return { success: false, error: "Recipe not found." };

  const sourceCategoryName = (src as unknown as { category: { name?: string } | null })
    .category?.name ?? null;
  const targetCategoryId = await resolveCategoryIdForBook(targetBookId, sourceCategoryName);

  const [
    { data: ingredients },
    { data: instructions },
    { data: stories },
    { data: reactions },
    { data: ratings },
  ] = await Promise.all([
    supabase
      .from("recipe_ingredients")
      .select("position, quantity, unit, item, note")
      .eq("recipe_id", recipeId)
      .order("position", { ascending: true }),
    supabase
      .from("recipe_instructions")
      .select("position, body")
      .eq("recipe_id", recipeId)
      .order("position", { ascending: true }),
    supabase
      .from("recipe_stories")
      .select("author_id, body, created_at")
      .eq("recipe_id", recipeId),
    supabase
      .from("recipe_reactions")
      .select("user_id, type, created_at")
      .eq("recipe_id", recipeId),
    supabase
      .from("recipe_ratings")
      .select("user_id, rating, created_at")
      .eq("recipe_id", recipeId),
  ]);

  const { data: copy, error: insertError } = await supabase
    .from("recipes")
    .insert({
      book_id: targetBookId,
      created_by: user.id,
      title: src.title,
      description: src.description,
      photo_url: src.photo_url,
      source_name: src.source_name,
      story: src.story,
      prep_minutes: src.prep_minutes,
      cook_minutes: src.cook_minutes,
      servings: src.servings,
      category_id: targetCategoryId,
      tags: src.tags ?? [],
    })
    .select()
    .single();

  if (insertError || !copy) {
    return { success: false, error: insertError?.message ?? "Could not copy recipe." };
  }

  if (ingredients?.length) {
    await supabase
      .from("recipe_ingredients")
      .insert(ingredients.map((ing) => ({ ...ing, recipe_id: copy.id })));
  }
  if (instructions?.length) {
    await supabase
      .from("recipe_instructions")
      .insert(instructions.map((ins) => ({ ...ins, recipe_id: copy.id })));
  }

  // Memories, reactions, and ratings keep their original author/user, which
  // RLS would otherwise reject — duplicate them with the service-role client.
  const hasAuthored =
    (stories?.length ?? 0) + (reactions?.length ?? 0) + (ratings?.length ?? 0) > 0;
  if (hasAuthored) {
    const admin = createServiceClient();
    if (stories?.length) {
      await admin.from("recipe_stories").insert(
        stories.map((s) => ({
          recipe_id: copy.id,
          author_id: s.author_id,
          body: s.body,
          created_at: s.created_at,
        }))
      );
    }
    if (reactions?.length) {
      await admin.from("recipe_reactions").insert(
        reactions.map((r) => ({
          recipe_id: copy.id,
          user_id: r.user_id,
          type: r.type,
          created_at: r.created_at,
        }))
      );
    }
    if (ratings?.length) {
      await admin.from("recipe_ratings").insert(
        ratings.map((r) => ({
          recipe_id: copy.id,
          user_id: r.user_id,
          rating: r.rating,
          created_at: r.created_at,
        }))
      );
    }
  }

  await supabase.from("activity_events").insert({
    book_id: targetBookId,
    recipe_id: copy.id,
    actor_id: user.id,
    type: "recipe_created",
    metadata: { recipe_title: copy.title, copied_from: sourceBookId },
  });

  revalidatePath(`/app/books/${targetBookId}`);
  revalidatePath(`/app/books/${targetBookId}/recipes`);
  return { success: true, data: { recipeId: copy.id, bookId: targetBookId } };
}

// Move a recipe to another cookbook, removing it from the current one. Child
// rows reference the recipe, so they travel with it automatically.
export async function moveRecipeToBook(
  sourceBookId: string,
  recipeId: string,
  targetBookId: string
): Promise<ActionResult<{ bookId: string }>> {
  const user = await requireUser();
  if (sourceBookId === targetBookId) {
    return { success: false, error: "Choose a different cookbook." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("recipes")
    .select("created_by, book_id, title, category:book_categories!recipes_category_id_fkey(name)")
    .eq("id", recipeId)
    .single();
  if (!existing || existing.book_id !== sourceBookId) {
    return { success: false, error: "Recipe not found." };
  }
  const sourceCategoryName = (existing as unknown as { category: { name?: string } | null })
    .category?.name ?? null;

  const isCreator = existing.created_by === user.id;
  const [sourceRole, targetRole] = await Promise.all([
    getBookRole(supabase, sourceBookId, user.id),
    getBookRole(supabase, targetBookId, user.id),
  ]);

  // Mirrors the recipes UPDATE policy on both the old and the new row.
  const canRemove =
    canManageBook(sourceRole as BookRole | null) ||
    (isCreator && canContribute(sourceRole as BookRole | null));
  if (!canRemove) {
    return { success: false, error: "You don't have permission to move this recipe." };
  }

  const canPlace = isCreator
    ? canContribute(targetRole as BookRole | null)
    : canManageBook(targetRole as BookRole | null);
  if (!canPlace) {
    return {
      success: false,
      error: "You can only move into cookbooks where you can add recipes.",
    };
  }

  // The recipe's category_id points at a row in the source book's category
  // list, which is no longer valid in the target. Re-resolve by name (with the
  // usual fallback to the target's "Other") before flipping book_id.
  const targetCategoryId = await resolveCategoryIdForBook(targetBookId, sourceCategoryName);

  const { error } = await supabase
    .from("recipes")
    .update({
      book_id: targetBookId,
      category_id: targetCategoryId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recipeId);
  if (error) return { success: false, error: error.message };

  // The recipe may have belonged to collections in the old book; those links
  // are no longer valid once it leaves. Best-effort cleanup.
  const admin = createServiceClient();
  await admin.from("collection_recipes").delete().eq("recipe_id", recipeId);

  await supabase.from("activity_events").insert({
    book_id: targetBookId,
    recipe_id: recipeId,
    actor_id: user.id,
    type: "recipe_created",
    metadata: { recipe_title: existing.title, moved_from: sourceBookId },
  });

  revalidatePath(`/app/books/${sourceBookId}`);
  revalidatePath(`/app/books/${targetBookId}`);
  revalidatePath(`/app/books/${targetBookId}/recipes/${recipeId}`);
  return { success: true, data: { bookId: targetBookId } };
}

export async function getRecipe(recipeId: string): Promise<RecipeWithRelations | null> {
  const supabase = await createClient();

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .select(
      "*, creator:profiles!created_by(*), category:book_categories!recipes_category_id_fkey(id, name)"
    )
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

export async function getBookRecipes(
  bookId: string
): Promise<{ id: string; title: string; photo_url: string | null; category: string | null }[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("recipes")
    .select(
      "id, title, photo_url, category:book_categories!recipes_category_id_fkey(name)"
    )
    .eq("book_id", bookId)
    .order("title", { ascending: true });

  const rows = (data ?? []) as unknown as {
    id: string;
    title: string;
    photo_url: string | null;
    category: { name: string } | null;
  }[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    photo_url: row.photo_url,
    category: row.category?.name ?? null,
  }));
}

// Uncategorized recipes group under this label across global listings, matching
// the per-book recipes page.
const UNCATEGORIZED_LABEL = "Family Notes";

export interface CookbookCategoryNav {
  /** null = the uncategorized ("Family Notes") bucket. */
  id: string | null;
  name: string;
  count: number;
}

// Categories for one cookbook with recipe counts, plus the total. Second level
// of the cookbook navigator. Reuses `listCategories` for ordering and appends
// an uncategorized bucket when present.
export async function getCookbookCategories(
  bookId: string
): Promise<{ total: number; categories: CookbookCategoryNav[] }> {
  const supabase = await createClient();
  const [categories, { data: recipeRows }] = await Promise.all([
    listCategories(bookId),
    supabase.from("recipes").select("category_id").eq("book_id", bookId),
  ]);

  const counts = new Map<string, number>();
  let uncategorized = 0;
  let total = 0;
  for (const row of (recipeRows ?? []) as { category_id: string | null }[]) {
    total += 1;
    if (row.category_id) counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
    else uncategorized += 1;
  }

  const result: CookbookCategoryNav[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    count: counts.get(category.id) ?? 0,
  }));
  if (uncategorized > 0) {
    result.push({ id: null, name: UNCATEGORIZED_LABEL, count: uncategorized });
  }

  return { total, categories: result };
}

// Recipes within one category of a cookbook. Third level of the navigator.
// A null categoryId targets the uncategorized bucket.
export async function getCategoryRecipes(
  bookId: string,
  categoryId: string | null
): Promise<{ id: string; title: string; photo_url: string | null; cook_minutes: number | null }[]> {
  const supabase = await createClient();
  let query = supabase
    .from("recipes")
    .select("id, title, photo_url, cook_minutes")
    .eq("book_id", bookId)
    .order("title", { ascending: true });
  query = categoryId ? query.eq("category_id", categoryId) : query.is("category_id", null);

  const { data } = await query;
  return (data ?? []) as {
    id: string;
    title: string;
    photo_url: string | null;
    cook_minutes: number | null;
  }[];
}

// Every recipe the user can see, across all their cookbooks, tagged with the
// cookbook it lives in. RLS scopes `recipes` to the user's books. Powers the
// global My Recipes page, the Home dashboard, and the cross-book meal-plan
// recipe picker.
export async function getAllUserRecipes(): Promise<
  {
    id: string;
    title: string;
    photo_url: string | null;
    category: string | null;
    bookId: string;
    bookTitle: string;
    created_at: string;
  }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipes")
    .select(
      "id, title, photo_url, created_at, book_id, category:book_categories!recipes_category_id_fkey(name), book:recipe_books!recipes_book_id_fkey(title)"
    )
    .order("title", { ascending: true });

  const rows = (data ?? []) as unknown as {
    id: string;
    title: string;
    photo_url: string | null;
    created_at: string;
    book_id: string;
    category: { name: string } | null;
    book: { title: string } | { title: string }[] | null;
  }[];

  return rows.map((row) => {
    const book = Array.isArray(row.book) ? row.book[0] : row.book;
    return {
      id: row.id,
      title: row.title,
      photo_url: row.photo_url,
      category: row.category?.name ?? null,
      bookId: row.book_id,
      bookTitle: book?.title ?? "Recipe Book",
      created_at: row.created_at,
    };
  });
}

// The most recent recipes the signed-in user has personally added, across every
// cookbook. Powers the global Home dashboard's featured / continue-cooking cards.
export async function getAccountRecentRecipes(limit = 6): Promise<
  {
    id: string;
    title: string;
    description: string | null;
    photo_url: string | null;
    bookId: string;
    bookTitle: string;
    created_at: string;
  }[]
> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("recipes")
    .select(
      "id, title, description, photo_url, created_at, book_id, book:recipe_books!recipes_book_id_fkey(title)"
    )
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as unknown as {
    id: string;
    title: string;
    description: string | null;
    photo_url: string | null;
    created_at: string;
    book_id: string;
    book: { title: string } | { title: string }[] | null;
  }[];

  return rows.map((row) => {
    const book = Array.isArray(row.book) ? row.book[0] : row.book;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      photo_url: row.photo_url,
      bookId: row.book_id,
      bookTitle: book?.title ?? "Recipe Book",
      created_at: row.created_at,
    };
  });
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
