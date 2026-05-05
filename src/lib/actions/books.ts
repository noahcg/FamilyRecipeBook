"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireUser } from "@/lib/auth";
import { canManageBook } from "@/lib/permissions";
import {
  createBookSchema,
  updateBookSchema,
  type CreateBookInput,
  type UpdateBookInput,
} from "@/lib/validators/book";
import type { ActionResult, RecipeBook } from "@/lib/types";

export async function createBook(
  input: CreateBookInput
): Promise<ActionResult<RecipeBook>> {
  const user = await requireUser();
  const parsed = createBookSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Use service client so the DB trigger (handle_new_recipe_book) can insert
  // into book_members without being blocked by RLS. Auth is enforced above
  // via requireUser() and owner_id is explicitly set to user.id.
  const admin = createServiceClient();
  const { data: book, error } = await admin
    .from("recipe_books")
    .insert({ ...parsed.data, owner_id: user.id })
    .select()
    .single();

  if (error || !book) {
    return { success: false, error: error?.message ?? "Could not create book" };
  }

  revalidatePath("/app");
  return { success: true, data: book };
}

export async function updateBook(
  bookId: string,
  input: UpdateBookInput
): Promise<ActionResult<RecipeBook>> {
  const user = await requireUser();
  const parsed = updateBookSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Verify role
  const { data: member } = await supabase
    .from("book_members")
    .select("role")
    .eq("book_id", bookId)
    .eq("user_id", user.id)
    .single();

  if (!canManageBook(member?.role ?? null)) {
    return { success: false, error: "Only the keeper can update the book." };
  }

  const { data: book, error } = await supabase
    .from("recipe_books")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", bookId)
    .select()
    .single();

  if (error || !book) {
    return { success: false, error: error?.message ?? "Could not update book" };
  }

  revalidatePath("/app/books/[bookId]", "layout");
  revalidatePath("/app/settings");
  return { success: true, data: book };
}

export async function getUserBooks(): Promise<RecipeBook[]> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("recipe_books")
    .select("*, book_members!inner(user_id)")
    .eq("book_members.user_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getFirstBookId(): Promise<string | null> {
  const books = await getUserBooks();
  return books[0]?.id ?? null;
}

export async function redirectToBook() {
  const bookId = await getFirstBookId();
  if (bookId) {
    redirect(`/app/books/${bookId}`);
  } else {
    redirect("/onboarding/create-book");
  }
}

export async function getBookPageData(bookId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const [bookRes, recipesRes, collectionsRes] = await Promise.all([
    supabase
      .from("recipe_books")
      .select("*, members:book_members(*, profile:profiles(*))")
      .eq("id", bookId)
      .single(),
    supabase
      .from("recipes")
      .select(
        "*, reactions:recipe_reactions(type), creator:profiles!created_by(full_name, avatar_url)"
      )
      .eq("book_id", bookId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("collections")
      .select("*, recipes:collection_recipes(id)")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false }),
  ]);

  if (!bookRes.data) return null;
  const book = bookRes.data as any;
  const userMember = book.members?.find((m: any) => m.user_id === user.id);
  if (!userMember) return null;

  const allRecipes = (recipesRes.data ?? []).map((r: any) => ({
    ...r,
    loveCount: r.reactions?.filter((rx: any) => rx.type === "love").length ?? 0,
  }));

  const favorites = [...allRecipes]
    .filter((r) => r.loveCount > 0)
    .sort((a, b) => b.loveCount - a.loveCount)
    .slice(0, 4);

  return {
    book,
    userMember,
    userId: user.id,
    recent: allRecipes.slice(0, 6),
    favorites,
    collections: collectionsRes.data ?? [],
  };
}

export async function getBook(bookId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipe_books")
    .select("*, members:book_members(*, profile:profiles(*))")
    .eq("id", bookId)
    .single();
  return data as any ?? null;
}
