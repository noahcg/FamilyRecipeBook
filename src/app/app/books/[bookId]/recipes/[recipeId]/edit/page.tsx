import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
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
      <div className="px-5 pt-5">
        <Link
          href={`/app/books/${bookId}/recipes/${recipeId}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition-colors mb-5 block"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back to recipe
        </Link>

        <h1
          className="text-2xl font-bold text-green-deep mb-6"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Edit recipe
        </h1>

        <RecipeForm bookId={bookId} recipe={recipe} />
      </div>
    </AppShell>
  );
}
