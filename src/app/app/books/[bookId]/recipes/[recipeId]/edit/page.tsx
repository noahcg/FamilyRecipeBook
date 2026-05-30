import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { BookName } from "@/components/book/BookName";
import { RecipeForm } from "@/components/recipe/RecipeForm";
import { getRecipe, getRecipeAssignmentOptions } from "@/lib/actions/recipes";
import { listCategories } from "@/lib/actions/categories";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canContribute, canEditRecipe, canManageBook } from "@/lib/permissions";

interface Props {
  params: Promise<{ bookId: string; recipeId: string }>;
}

export default async function EditRecipePage({ params }: Props) {
  const { bookId, recipeId } = await params;
  const user = await requireUser();

  const supabase = await createClient();
  const [recipe, memberRes, categories, bookOptions] = await Promise.all([
    getRecipe(recipeId),
    supabase
      .from("book_members")
      .select("role")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .single(),
    listCategories(bookId),
    getRecipeAssignmentOptions(),
  ]);

  if (!recipe || recipe.book_id !== bookId) notFound();

  const userRole = memberRes.data?.role ?? null;
  const isCreator = recipe.created_by === user.id;
  if (!canEditRecipe(userRole as import("@/lib/types").BookRole | null, isCreator)) notFound();
  const assignableBooks = bookOptions.filter((book) =>
    book.id === bookId || (isCreator ? canContribute(book.role) : canManageBook(book.role))
  );

  return (
    <AppShell bookId={bookId}>
      <div className="px-5 py-8 lg:px-10">
        <Link
          href={`/app/books/${bookId}/recipes/${recipeId}`}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back to recipe
        </Link>

        <div className="mb-6 border-b border-line-soft pb-6">
          <BookName className="mb-2 block text-sm font-semibold text-ink-muted" />
          <h1
            className="text-3xl font-bold leading-tight text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Edit recipe
          </h1>
        </div>

        <RecipeForm
          bookId={bookId}
          categories={categories}
          bookOptions={assignableBooks}
          recipe={recipe}
        />
      </div>
    </AppShell>
  );
}
