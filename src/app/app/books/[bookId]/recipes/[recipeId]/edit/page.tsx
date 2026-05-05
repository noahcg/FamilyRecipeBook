import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { BookName } from "@/components/book/BookName";
import { RecipeForm } from "@/components/recipe/RecipeForm";
import { getRecipe } from "@/lib/actions/recipes";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canEditRecipe } from "@/lib/permissions";

interface Props {
  params: Promise<{ bookId: string; recipeId: string }>;
}

export default async function EditRecipePage({ params }: Props) {
  const { bookId, recipeId } = await params;
  const user = await requireUser();

  const supabase = await createClient();
  const [recipe, memberRes] = await Promise.all([
    getRecipe(recipeId),
    supabase
      .from("book_members")
      .select("role")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .single(),
  ]);

  if (!recipe || recipe.book_id !== bookId) notFound();

  const userRole = memberRes.data?.role ?? null;
  if (!canEditRecipe(userRole as import("@/lib/types").BookRole | null, recipe.created_by === user.id)) notFound();

  return (
    <AppShell bookId={bookId}>
      <div className="mx-auto max-w-[920px] px-5 py-8 lg:px-8">
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

        <RecipeForm bookId={bookId} recipe={recipe} />
      </div>
    </AppShell>
  );
}
