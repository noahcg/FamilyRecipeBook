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
import type { ActionResult, BookMember, BookPreview, BookRole, Profile, Recipe, RecipeBook } from "@/lib/types";

interface BookPageMember extends BookMember {
  profile: Profile | null;
}

interface BookPageBook extends RecipeBook {
  members?: BookPageMember[];
}

interface BookPageRecipe extends Recipe {
  reactions?: { type: string; user_id: string }[] | null;
  creator?: Pick<Profile, "full_name" | "avatar_url"> | null;
  loveCount: number;
  favoriteCount: number;
}

function isMissingPreferenceMigration(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST204" ||
    message.includes("recipe_books.icon") ||
    message.includes("sharing_enabled") ||
    message.includes("default_book_id") ||
    message.includes("schema cache")
  );
}

function getBookMigrationMessage(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  if (message.includes("sharing_enabled")) {
    return "Apply migration 012_cookbook_sharing.sql before changing cookbook sharing.";
  }
  return "Apply migration 008_book_preferences.sql before saving cookbook preferences.";
}

async function getSharingBlockers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookId: string
) {
  const [memberRes, inviteRes] = await Promise.all([
    supabase
      .from("book_members")
      .select("id", { count: "exact", head: true })
      .eq("book_id", bookId)
      .neq("role", "keeper"),
    supabase
      .from("book_invitations")
      .select("id", { count: "exact", head: true })
      .eq("book_id", bookId)
      .is("accepted_at", null)
      .gte("expires_at", new Date().toISOString()),
  ]);

  if (memberRes.error || inviteRes.error) {
    return {
      error: memberRes.error?.message ?? inviteRes.error?.message ?? "Could not check sharing status.",
      memberCount: 0,
      inviteCount: 0,
    };
  }

  return {
    error: null,
    memberCount: memberRes.count ?? 0,
    inviteCount: inviteRes.count ?? 0,
  };
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
  const createPayload = {
    ...parsed.data,
    sharing_enabled: parsed.data.sharing_enabled ?? false,
  };
  let { data: book, error } = await admin
    .from("recipe_books")
    .insert({ ...createPayload, owner_id: user.id })
    .select()
    .single();

  if (error && isMissingPreferenceMigration(error)) {
    const withoutIcon: Partial<typeof createPayload> = { ...createPayload };
    delete withoutIcon.icon;
    delete withoutIcon.sharing_enabled;
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

  if (parsed.data.sharing_enabled === false) {
    const blockers = await getSharingBlockers(supabase, bookId);
    if (blockers.error) {
      return { success: false, error: blockers.error };
    }
    if (blockers.memberCount > 0 || blockers.inviteCount > 0) {
      return {
        success: false,
        error:
          "Remove non-keeper members and cancel pending invitations before making this cookbook private.",
      };
    }
  }

  const updatePayload = { ...parsed.data, updated_at: new Date().toISOString() };
  let { data: book, error } = await supabase
    .from("recipe_books")
    .update(updatePayload)
    .eq("id", bookId)
    .select()
    .single();

  if (error && isMissingPreferenceMigration(error) && "icon" in parsed.data) {
    const withoutIcon = { ...parsed.data };
    delete withoutIcon.icon;
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
        error: getBookMigrationMessage(error),
      };
    }
  }

  if (error || !book) {
    return {
      success: false,
      error: isMissingPreferenceMigration(error)
        ? getBookMigrationMessage(error)
        : error?.message ?? "Could not update book",
    };
  }

  revalidatePath("/app/books/[bookId]", "layout");
  revalidatePath(`/app/books/${bookId}/members`);
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

export interface CookbookNavItem {
  id: string;
  title: string;
  icon: string;
  cover_style: string;
  recipeCount: number;
}

// Books the user belongs to (each with its recipe count) plus their active
// (default) cookbook. Powers the cascading "Cookbooks" navigator in the left
// rail. RLS scopes the queries to the user.
export async function getCookbookNavData(): Promise<{
  books: CookbookNavItem[];
  defaultBookId: string | null;
}> {
  const user = await requireUser();
  const supabase = await createClient();
  const [books, { data: recipeRows }, { data: settings }] = await Promise.all([
    getUserBooks(),
    supabase.from("recipes").select("book_id"),
    supabase.from("user_settings").select("default_book_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const counts = new Map<string, number>();
  for (const row of (recipeRows ?? []) as { book_id: string }[]) {
    counts.set(row.book_id, (counts.get(row.book_id) ?? 0) + 1);
  }

  const defaultBookId = settings?.default_book_id ?? null;
  const navBooks: CookbookNavItem[] = books.map((book) => ({
    id: book.id,
    title: book.title,
    icon: book.icon,
    cover_style: book.cover_style,
    recipeCount: counts.get(book.id) ?? 0,
  }));

  return {
    books: navBooks,
    defaultBookId: navBooks.some((b) => b.id === defaultBookId) ? defaultBookId : null,
  };
}

// High-level summary of a book the user belongs to, used to "peek inside"
// from the cookbook shelf without switching over to it.
export async function getBookPreview(bookId: string): Promise<BookPreview | null> {
  const user = await requireUser();
  const supabase = await createClient();

  // Only members may peek inside.
  const { data: member } = await supabase
    .from("book_members")
    .select("id")
    .eq("book_id", bookId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return null;

  const [recipesRes, memberCountRes] = await Promise.all([
    supabase
      .from("recipes")
      .select(
        "id, title, updated_at, category:book_categories!recipes_category_id_fkey(name)"
      )
      .eq("book_id", bookId)
      .order("title", { ascending: true })
      .limit(300),
    supabase
      .from("book_members")
      .select("id", { count: "exact", head: true })
      .eq("book_id", bookId),
  ]);

  const rows = (recipesRes.data ?? []) as unknown as {
    id: string;
    title: string;
    updated_at: string | null;
    category: { name: string } | null;
  }[];

  const categoryCounts = new Map<string, number>();
  let lastUpdated: string | null = null;
  for (const r of rows) {
    const cat = r.category?.name?.trim() || "Uncategorized";
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    if (r.updated_at && (!lastUpdated || r.updated_at > lastUpdated)) {
      lastUpdated = r.updated_at;
    }
  }

  const categories = [...categoryCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    recipeCount: rows.length,
    memberCount: memberCountRes.count ?? 0,
    categories,
    recipes: rows.map((r) => ({ id: r.id, title: r.title, category: r.category?.name ?? null })),
    lastUpdated,
  };
}

// Permanently delete a cookbook and everything in it (recipes, members, meal
// references all cascade). Keeper-only, enforced here and by RLS.
export async function deleteBook(bookId: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("book_members")
    .select("role")
    .eq("book_id", bookId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!canManageBook((member?.role ?? null) as BookRole | null)) {
    return { success: false, error: "Only the cookbook keeper can delete it." };
  }

  const { error } = await supabase.from("recipe_books").delete().eq("id", bookId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/app");
  return { success: true, data: undefined };
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

  const [bookRes, recipesRes] = await Promise.all([
    supabase
      .from("recipe_books")
      .select("*, members:book_members(*, profile:profiles(*))")
      .eq("id", bookId)
      .single(),
    supabase
      .from("recipes")
      .select(
        "*, reactions:recipe_reactions(type, user_id), creator:profiles!created_by(full_name, avatar_url), category:book_categories!recipes_category_id_fkey(id, name)"
      )
      .eq("book_id", bookId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (!bookRes.data) return null;
  const book = bookRes.data as BookPageBook;
  const userMember = book.members?.find((member) => member.user_id === user.id);
  if (!userMember) return null;

  const allRecipes = ((recipesRes.data ?? []) as BookPageRecipe[]).map((recipe) => ({
    ...recipe,
    loveCount: recipe.reactions?.filter((reaction) => reaction.type === "love").length ?? 0,
    favoriteCount:
      recipe.reactions?.filter(
        (reaction) => reaction.type === "favorite" && reaction.user_id === user.id
      ).length ?? 0,
  }));

  const favorites = [...allRecipes]
    .filter((r) => r.favoriteCount > 0)
    .slice(0, 4);

  return {
    book,
    userMember,
    userId: user.id,
    recent: allRecipes.slice(0, 6),
    favorites,
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
