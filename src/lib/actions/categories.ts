"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { canContribute } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { FALLBACK_CATEGORY_NAME } from "@/lib/recipeCategories";
import type { ActionResult, BookRole } from "@/lib/types";

export interface BookCategory {
  id: string;
  book_id: string;
  name: string;
  position: number;
  is_default: boolean;
}

export type DeleteCategoryError =
  | { kind: "permission"; message: string }
  | { kind: "not_found"; message: string }
  | { kind: "has_recipes"; message: string; recipeCount: number }
  | { kind: "other"; message: string };

const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "Give the chapter a name.")
  .max(60, "Chapter names are 60 characters or fewer.");

async function getBookRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookId: string,
  userId: string
): Promise<BookRole | null> {
  const { data } = await supabase
    .from("book_members")
    .select("role")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role ?? null) as BookRole | null;
}

function revalidateBook(bookId: string) {
  revalidatePath(`/app/books/${bookId}`, "layout");
}

export async function listCategories(bookId: string): Promise<BookCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("book_categories")
    .select("id, book_id, name, position, is_default")
    .eq("book_id", bookId)
    .order("position", { ascending: true });
  return (data ?? []) as BookCategory[];
}

export async function createCategory(
  bookId: string,
  name: string
): Promise<ActionResult<BookCategory>> {
  const user = await requireUser();
  const parsed = categoryNameSchema.safeParse(name);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);
  if (!canContribute(role)) {
    return { success: false, error: "You can't manage chapters in this cookbook." };
  }

  const { data: maxRow } = await supabase
    .from("book_categories")
    .select("position")
    .eq("book_id", bookId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (maxRow?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("book_categories")
    .insert({ book_id: bookId, name: parsed.data, position: nextPosition, is_default: false })
    .select("id, book_id, name, position, is_default")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A chapter with that name already exists." };
    }
    return { success: false, error: error.message };
  }

  revalidateBook(bookId);
  return { success: true, data: data as BookCategory };
}

export async function renameCategory(
  categoryId: string,
  name: string
): Promise<ActionResult<BookCategory>> {
  const user = await requireUser();
  const parsed = categoryNameSchema.safeParse(name);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("book_categories")
    .select("book_id")
    .eq("id", categoryId)
    .maybeSingle();
  if (!existing) {
    return { success: false, error: "Chapter not found." };
  }

  const role = await getBookRole(supabase, existing.book_id, user.id);
  if (!canContribute(role)) {
    return { success: false, error: "You can't manage chapters in this cookbook." };
  }

  const { data, error } = await supabase
    .from("book_categories")
    .update({ name: parsed.data })
    .eq("id", categoryId)
    .select("id, book_id, name, position, is_default")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Another chapter already has that name." };
    }
    return { success: false, error: error.message };
  }

  revalidateBook(existing.book_id);
  return { success: true, data: data as BookCategory };
}

export async function reorderCategories(
  bookId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const role = await getBookRole(supabase, bookId, user.id);
  if (!canContribute(role)) {
    return { success: false, error: "You can't manage chapters in this cookbook." };
  }

  // Confirm every id belongs to this book before reordering — prevents a caller
  // from sneaking another book's category into the list.
  const { data: rows } = await supabase
    .from("book_categories")
    .select("id")
    .eq("book_id", bookId);
  const valid = new Set((rows ?? []).map((r) => r.id));
  if (orderedIds.length !== valid.size || !orderedIds.every((id) => valid.has(id))) {
    return { success: false, error: "Chapter list is out of sync. Reload and try again." };
  }

  const updates = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("book_categories").update({ position: index }).eq("id", id)
    )
  );
  const failed = updates.find((u) => u.error);
  if (failed?.error) {
    return { success: false, error: failed.error.message };
  }

  revalidateBook(bookId);
  return { success: true, data: undefined };
}

export async function deleteCategory(
  categoryId: string
): Promise<{ success: true } | { success: false; error: DeleteCategoryError }> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("book_categories")
    .select("book_id, name")
    .eq("id", categoryId)
    .maybeSingle();
  if (!existing) {
    return { success: false, error: { kind: "not_found", message: "Chapter not found." } };
  }

  const role = await getBookRole(supabase, existing.book_id, user.id);
  if (!canContribute(role)) {
    return {
      success: false,
      error: { kind: "permission", message: "You can't manage chapters in this cookbook." },
    };
  }

  const { count } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: {
        kind: "has_recipes",
        recipeCount: count ?? 0,
        message: `This chapter has ${count} recipe${count === 1 ? "" : "s"}. Move them first.`,
      },
    };
  }

  const { error } = await supabase.from("book_categories").delete().eq("id", categoryId);
  if (error) {
    return { success: false, error: { kind: "other", message: error.message } };
  }

  revalidateBook(existing.book_id);
  return { success: true };
}

export async function moveRecipesAndDeleteCategory(
  sourceCategoryId: string,
  targetCategoryId: string
): Promise<ActionResult> {
  if (sourceCategoryId === targetCategoryId) {
    return { success: false, error: "Pick a different chapter to move recipes into." };
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("book_categories")
    .select("id, book_id")
    .in("id", [sourceCategoryId, targetCategoryId]);
  const source = rows?.find((r) => r.id === sourceCategoryId);
  const target = rows?.find((r) => r.id === targetCategoryId);
  if (!source || !target) {
    return { success: false, error: "Chapter not found." };
  }
  if (source.book_id !== target.book_id) {
    return { success: false, error: "Both chapters must belong to the same cookbook." };
  }

  const role = await getBookRole(supabase, source.book_id, user.id);
  if (!canContribute(role)) {
    return { success: false, error: "You can't manage chapters in this cookbook." };
  }

  const moveRes = await supabase
    .from("recipes")
    .update({ category_id: targetCategoryId })
    .eq("category_id", sourceCategoryId);
  if (moveRes.error) {
    return { success: false, error: moveRes.error.message };
  }

  const deleteRes = await supabase
    .from("book_categories")
    .delete()
    .eq("id", sourceCategoryId);
  if (deleteRes.error) {
    return { success: false, error: deleteRes.error.message };
  }

  revalidateBook(source.book_id);
  return { success: true, data: undefined };
}

// Helper used by other server-side flows (import, AI) that need to resolve a
// free-text category name to a row id. Falls back to the book's "Other" row
// when no exact (case-insensitive) match is found.
export async function resolveCategoryIdForBook(
  bookId: string,
  candidate: string | null | undefined
): Promise<string | null> {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("book_categories")
    .select("id, name")
    .eq("book_id", bookId);
  if (!categories || categories.length === 0) return null;

  const trimmed = candidate?.trim().toLowerCase();
  if (trimmed) {
    const match = categories.find((c) => c.name.toLowerCase() === trimmed);
    if (match) return match.id;
  }
  const fallback = categories.find(
    (c) => c.name.toLowerCase() === FALLBACK_CATEGORY_NAME.toLowerCase()
  );
  return fallback?.id ?? categories[0].id;
}
