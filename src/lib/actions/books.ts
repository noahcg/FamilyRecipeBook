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
import type { ActionResult, BookMember, Profile, Recipe, RecipeBook } from "@/lib/types";

interface BookPageMember extends BookMember {
  profile: Profile | null;
}

interface BookPageBook extends RecipeBook {
  members?: BookPageMember[];
}

interface BookPageRecipe extends Recipe {
  reactions?: { type: string }[] | null;
  creator?: Pick<Profile, "full_name" | "avatar_url"> | null;
  loveCount: number;
}

function isMissingPreferenceMigration(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST204" ||
    message.includes("recipe_books.icon") ||
    message.includes("default_book_id") ||
    message.includes("schema cache")
  );
}

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
  let { data: book, error } = await admin
    .from("recipe_books")
    .insert({ ...parsed.data, owner_id: user.id })
    .select()
    .single();

  if (error && isMissingPreferenceMigration(error) && "icon" in parsed.data) {
    const { icon: _icon, ...withoutIcon } = parsed.data;
    const retry = await admin
      .from("recipe_books")
      .insert({ ...withoutIcon, owner_id: user.id })
      .select()
      .single();
    book = retry.data;
    error = retry.error;
  }

  if (error || !book) {
    return { success: false, error: error?.message ?? "Could not create book" };
  }

  revalidatePath("/app");
  return { success: true, data: book };
}

export async function setDefaultBook(bookId: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("book_members")
    .select("id")
    .eq("book_id", bookId)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return { success: false, error: "You can only set one of your cookbooks as default." };
  }

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      default_book_id: bookId,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return {
      success: false,
      error: isMissingPreferenceMigration(error)
        ? "Apply migration 008_book_preferences.sql before choosing a default cookbook."
        : error.message,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/books/[bookId]", "layout");
  revalidatePath(`/app/books/${bookId}/settings`);
  return { success: true, data: undefined };
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

  const updatePayload = { ...parsed.data, updated_at: new Date().toISOString() };
  let { data: book, error } = await supabase
    .from("recipe_books")
    .update(updatePayload)
    .eq("id", bookId)
    .select()
    .single();

  if (error && isMissingPreferenceMigration(error) && "icon" in parsed.data) {
    const { icon: _icon, ...withoutIcon } = parsed.data;
    const retry = await supabase
      .from("recipe_books")
      .update({ ...withoutIcon, updated_at: new Date().toISOString() })
      .eq("id", bookId)
      .select()
      .single();
    book = retry.data;
    error = retry.error;

    if (!Object.keys(withoutIcon).length && !error) {
      return {
        success: false,
        error: "Apply migration 008_book_preferences.sql before saving cookbook icons.",
      };
    }
  }

  if (error || !book) {
    return {
      success: false,
      error: isMissingPreferenceMigration(error)
        ? "Apply migration 008_book_preferences.sql before saving cookbook icons."
        : error?.message ?? "Could not update book",
    };
  }

  revalidatePath("/app/books/[bookId]", "layout");
  revalidatePath(`/app/books/${bookId}/settings`);
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
  const user = await requireUser();
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("default_book_id")
    .eq("user_id", user.id)
    .single();

  if (settings?.default_book_id) {
    const { data: member } = await supabase
      .from("book_members")
      .select("id")
      .eq("book_id", settings.default_book_id)
      .eq("user_id", user.id)
      .single();

    if (member) return settings.default_book_id;
  }

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
  const book = bookRes.data as BookPageBook;
  const userMember = book.members?.find((member) => member.user_id === user.id);
  if (!userMember) return null;

  const allRecipes = ((recipesRes.data ?? []) as BookPageRecipe[]).map((recipe) => ({
    ...recipe,
    loveCount: recipe.reactions?.filter((reaction) => reaction.type === "love").length ?? 0,
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
  return (data as BookPageBook | null) ?? null;
}
