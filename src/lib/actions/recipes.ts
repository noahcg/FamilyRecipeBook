"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { copyRecipeOriginals } from "@/lib/actions/recipeOriginals";
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
  recipeNoteSchema,
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
import type { BookCategory } from "@/lib/actions/categories";
import { assertCanCreateRecipe, assertFeatureAccess, EntitlementError, getBookRecipeAccess } from "@/lib/entitlements";

const RECIPE_SELECT_WITH_CATEGORY =
  "*, category:book_categories!recipes_category_id_fkey(id, name)";

export interface RecipeAssignmentOption {
  id: string;
  title: string;
  role: BookRole;
  categories: BookCategory[];
}

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
  try {
    await assertCanCreateRecipe(user.id, bookId);
  } catch (error) {
    if (error instanceof EntitlementError) return { success: false, error: error.message };
    throw error;
  }
  const parsed = createRecipeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  if (parsed.data.import_method || parsed.data.import_source || parsed.data.source_url) {
    try { await assertFeatureAccess(user.id, "recipe.import"); }
    catch (error) { if (error instanceof EntitlementError) return { success: false, error: error.message }; throw error; }
  }

  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);

  if (!canContribute(role)) {
    return { success: false, error: "You don't have permission to add recipes." };
  }

  const { ingredients, instructions, category, ...recipeFields } = parsed.data;
  const category_id = await resolveCategoryIdForBook(bookId, category);

  const { data, error } = await supabase.rpc("save_recipe_atomic", {
    p_book_id: bookId,
    p_recipe_id: null,
    p_fields: { ...recipeFields, category_id },
    p_ingredients: ingredients,
    p_instructions: instructions,
  });
  const recipe = data as Recipe | null;
  if (error || !recipe) {
    return { success: false, error: error?.message ?? "Could not create recipe" };
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

  // Capture the pre-edit fingerprint so we can find this recipe's copies in
  // other cookbooks before the edit changes any of those fields.
  const { data: existing } = await supabase
    .from("recipes")
    .select(
      "created_by, title, photo_url, source_name, prep_minutes, cook_minutes, servings"
    )
    .eq("id", recipeId)
    .eq("book_id", bookId)
    .single();

  if (!canEditRecipe(role, existing?.created_by === user.id)) {
    return { success: false, error: "You don't have permission to edit this recipe." };
  }

  const { ingredients, instructions, category, ...recipeFields } = parsed.data;
  const updatePayload: Record<string, unknown> = { ...recipeFields };
  if (category !== undefined) {
    updatePayload.category_id = await resolveCategoryIdForBook(bookId, category);
  }

  // Header and both replacement lists commit together, or all remain unchanged.
  const { data, error } = await supabase.rpc("save_recipe_atomic", {
    p_book_id: bookId,
    p_recipe_id: recipeId,
    p_fields: updatePayload,
    p_ingredients: ingredients ?? null,
    p_instructions: instructions ?? null,
  });
  const recipe = data as Recipe | null;
  if (error || !recipe) {
    return { success: false, error: error?.message ?? "Could not update recipe" };
  }

  // A recipe copied into several cookbooks is stored as independent rows that
  // the "All Recipes" list merges by content. Mirror this edit onto those copies
  // (in cookbooks the user can edit) so they stay in sync and keep merging into
  // a single badged entry instead of splitting apart.
  if (existing) {
    try {
      await syncEditAcrossCopies({
        supabase,
        userId: user.id,
        editedRecipeId: recipeId,
        preEdit: {
          title: existing.title,
          photo_url: existing.photo_url,
          source_name: existing.source_name,
          prep_minutes: existing.prep_minutes,
          cook_minutes: existing.cook_minutes,
          servings: existing.servings,
        },
        recipeFields,
        category,
        ingredients,
        instructions,
      });
    } catch {
      // Best effort: the primary edit already succeeded, so never fail the
      // user's save because a copy in another cookbook couldn't be synced.
    }
  }

  revalidatePath(`/app/books/${bookId}/recipes/${recipeId}`);
  return { success: true, data: recipe };
}

// Propagate an edit to a recipe's content-identical copies in other cookbooks.
// Copies are matched on the pre-edit fingerprint (title plus the fields a copy
// shares verbatim, ignoring description so already-diverged copies still re-
// converge). Only copies the user has permission to edit are touched; writes go
// through the authenticated atomic writer so RLS rechecks current access.
async function syncEditAcrossCopies(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  editedRecipeId: string;
  preEdit: {
    title: string;
    photo_url: string | null;
    source_name: string | null;
    prep_minutes: number | null;
    cook_minutes: number | null;
    servings: number | null;
  };
  recipeFields: Record<string, unknown>;
  category: string | undefined;
  ingredients?: { item: string; [key: string]: unknown }[];
  instructions?: { body: string }[];
}): Promise<void> {
  const { supabase, userId, editedRecipeId, preEdit, recipeFields, category } = params;

  const norm = (v: unknown) => v ?? null;

  // Title is the cheap server-side filter; the rest of the fingerprint is
  // matched in JS to sidestep null-comparison quirks.
  const { data: candidates } = await supabase
    .from("recipes")
    .select(
      "id, book_id, created_by, photo_url, source_name, prep_minutes, cook_minutes, servings"
    )
    .eq("title", preEdit.title)
    .neq("id", editedRecipeId);

  const siblings = (candidates ?? []).filter(
    (c) =>
      norm(c.photo_url) === norm(preEdit.photo_url) &&
      norm(c.source_name) === norm(preEdit.source_name) &&
      norm(c.prep_minutes) === norm(preEdit.prep_minutes) &&
      norm(c.cook_minutes) === norm(preEdit.cook_minutes) &&
      norm(c.servings) === norm(preEdit.servings)
  );
  if (siblings.length === 0) return;

  const { data: memberships } = await supabase
    .from("book_members")
    .select("book_id, role")
    .eq("user_id", userId);
  const roleByBook = new Map(
    (memberships ?? []).map((m) => [m.book_id, m.role as BookRole])
  );

  const editable = siblings.filter((c) =>
    canEditRecipe(roleByBook.get(c.book_id) ?? null, c.created_by === userId)
  );
  if (editable.length === 0) return;

  for (const sibling of editable) {
    const payload: Record<string, unknown> = { ...recipeFields };
    if (category !== undefined) {
      payload.category_id = await resolveCategoryIdForBook(sibling.book_id, category);
    }
    // Sync remains best effort, but an individual copy can never lose its
    // children when replacement fails. RLS also catches membership changes.
    await supabase.rpc("save_recipe_atomic", {
      p_book_id: sibling.book_id,
      p_recipe_id: sibling.id,
      p_fields: payload,
      p_ingredients: params.ingredients ?? null,
      p_instructions: params.instructions ?? null,
    });
  }
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
    .eq("book_id", bookId)
    .single();

  if (!existing || !canDeleteRecipe(role, existing.created_by === user.id)) {
    return { success: false, error: "You don't have permission to delete this recipe." };
  }

  const { data: deleted, error } = await supabase.from("recipes").delete()
    .eq("id", recipeId).eq("book_id", bookId).select("id").maybeSingle();
  if (error || !deleted) return { success: false, error: error?.message ?? "Recipe could not be deleted. Your access may have changed." };

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
    const access = await getBookRecipeAccess(book.id, user.id);
    if (!access.allowed) continue;
    targets.push({ id: book.id, title: book.title, role: row.role });
  }
  return targets.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getRecipeAssignmentOptions(): Promise<RecipeAssignmentOption[]> {
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

  const candidateBooks = rows
    .map((row) => {
      const book = Array.isArray(row.book) ? row.book[0] : row.book;
      return book ? { id: book.id, title: book.title, role: row.role } : null;
    })
    .filter((book): book is { id: string; title: string; role: BookRole } => Boolean(book))
    .sort((a, b) => a.title.localeCompare(b.title));

  const accessByBook = await Promise.all(
    candidateBooks.map(async (book) => ({
      book,
      access: await getBookRecipeAccess(book.id, user.id),
    }))
  );
  const books = accessByBook
    .filter(({ access }) => access.canContribute)
    .map(({ book }) => book);

  const categoriesByBook = await Promise.all(
    books.map(async (book) => ({
      bookId: book.id,
      categories: await listCategories(book.id),
    }))
  );
  const categoryMap = new Map(categoriesByBook.map((entry) => [entry.bookId, entry.categories]));

  return books.map((book) => ({
    ...book,
    categories: categoryMap.get(book.id) ?? [],
  }));
}

// Duplicate a recipe (and everything attached to it — ingredients,
// instructions, memories, reactions, and ratings) into another cookbook.
// The copier owns the new recipe; authored content keeps its original
// authorship through a narrowly authorized database copy transaction.
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

  try {
    await assertCanCreateRecipe(user.id, targetBookId);
  } catch (error) {
    if (error instanceof EntitlementError) return { success: false, error: error.message };
    throw error;
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

  // The source snapshot and every destination database row commit together.
  // The constrained definer RPC preserves authorship without caller-supplied
  // collaboration data or unrestricted service-role writes.
  const { data, error: insertError } = await supabase.rpc("copy_recipe_atomic", {
    p_source_book_id: sourceBookId,
    p_recipe_id: recipeId,
    p_target_book_id: targetBookId,
    p_category_id: targetCategoryId,
  });
  const copy = data as Recipe | null;
  if (insertError || !copy) {
    return { success: false, error: insertError?.message ?? "Could not copy recipe." };
  }

  const originalsResult = await copyRecipeOriginals(recipeId, copy.id);
  if (!originalsResult.success) {
    const { data: removed, error: rollbackError } = await supabase.from("recipes").delete()
      .eq("id", copy.id).eq("book_id", targetBookId).select("id").maybeSingle();
    return {
      success: false,
      error: rollbackError || !removed
        ? "The recipe was copied, but its originals could not be preserved. Check the destination cookbook before retrying."
        : "Could not preserve the original files, so the recipe was not copied. Please try again.",
    };
  }

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
  const [sourceRole, targetRole, sourceAccess, targetAccess] = await Promise.all([
    getBookRole(supabase, sourceBookId, user.id),
    getBookRole(supabase, targetBookId, user.id),
    getBookRecipeAccess(sourceBookId, user.id),
    getBookRecipeAccess(targetBookId, user.id),
  ]);

  // Mirrors the recipes UPDATE policy on both the old and the new row.
  const canRemove =
    canManageBook(sourceRole as BookRole | null) ||
    (isCreator && canContribute(sourceRole as BookRole | null) && sourceAccess.canContribute);
  if (!canRemove) {
    return { success: false, error: "You don't have permission to move this recipe." };
  }

  const canPlace = isCreator
    ? canContribute(targetRole as BookRole | null) && targetAccess.allowed
    : canManageBook(targetRole as BookRole | null) && targetAccess.allowed;
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

  const { data: moved, error } = await supabase
    .from("recipes")
    .update({
      book_id: targetBookId,
      category_id: targetCategoryId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recipeId)
    .eq("book_id", sourceBookId)
    .select("id").maybeSingle();
  if (error || !moved) return { success: false, error: error?.message ?? "Recipe could not be moved. Your access may have changed." };

  // Source collection links are removed atomically by the database trigger.

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
// global All Recipes page, the Home dashboard, and the cross-book meal-plan
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
  const parsed = recipeNoteSchema.safeParse(body);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);
  if (!role) return { success: false, error: "Not a member of this book." };

  const { error } = await supabase
    .from("recipe_stories")
    .insert({ recipe_id: recipeId, author_id: user.id, body: parsed.data });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/app/books/${bookId}/recipes/${recipeId}`);
  return { success: true, data: undefined };
}

export async function updateRecipeStory(
  bookId: string,
  recipeId: string,
  noteId: string,
  body: string
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = recipeNoteSchema.safeParse(body);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);
  if (!role) return { success: false, error: "Not a member of this book." };
  const { data: recipe } = await supabase.from("recipes").select("id").eq("id", recipeId).eq("book_id", bookId).single();
  if (!recipe) return { success: false, error: "Recipe not found." };
  const { data: note } = await supabase.from("recipe_stories").select("author_id").eq("id", noteId).eq("recipe_id", recipeId).single();
  if (!note) return { success: false, error: "Note not found." };
  if (role !== "keeper" && note.author_id !== user.id) return { success: false, error: "You cannot edit this note." };

  const { data, error } = await supabase.from("recipe_stories").update({ body: parsed.data })
    .eq("id", noteId).eq("recipe_id", recipeId).select("id").single();
  if (error || !data) return { success: false, error: "Could not save the note. Please try again." };
  revalidatePath(`/app/books/${bookId}/recipes/${recipeId}`);
  return { success: true, data: undefined };
}

export async function deleteRecipeStory(
  bookId: string,
  recipeId: string,
  noteId: string
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);
  if (!role) return { success: false, error: "Not a member of this book." };
  const { data: recipe } = await supabase.from("recipes").select("id").eq("id", recipeId).eq("book_id", bookId).single();
  if (!recipe) return { success: false, error: "Recipe not found." };
  const { data: note } = await supabase.from("recipe_stories").select("author_id").eq("id", noteId).eq("recipe_id", recipeId).single();
  if (!note) return { success: false, error: "Note not found." };
  if (role !== "keeper" && note.author_id !== user.id) return { success: false, error: "You cannot delete this note." };

  const { data, error } = await supabase.from("recipe_stories").delete()
    .eq("id", noteId).eq("recipe_id", recipeId).select("id").single();
  if (error || !data) return { success: false, error: "Could not delete the note. Please try again." };
  revalidatePath(`/app/books/${bookId}/recipes/${recipeId}`);
  return { success: true, data: undefined };
}
