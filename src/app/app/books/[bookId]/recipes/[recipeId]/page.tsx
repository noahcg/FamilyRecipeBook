import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { RecipeDetail } from "@/components/recipe/RecipeDetail";
import { getRecipe } from "@/lib/actions/recipes";
import { getReactionData } from "@/lib/actions/reactions";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ bookId: string; recipeId: string }>;
}

export default async function RecipeDetailPage({ params }: Props) {
  const { bookId, recipeId } = await params;
  const user = await requireUser();

  const [recipe, supabase] = await Promise.all([
    getRecipe(recipeId),
    createClient(),
  ]);

  if (!recipe || recipe.book_id !== bookId) notFound();

  const [{ counts, userReactions }, memberRes] = await Promise.all([
    getReactionData(recipeId, user.id),
    supabase
      .from("book_members")
      .select("role")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .single(),
  ]);

  const userRole = memberRes.data?.role ?? null;

  return (
    <AppShell bookId={bookId}>
      {/* Back link */}
      <div className="px-5 pt-5">
        <Link
          href={`/app/books/${bookId}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back to book
        </Link>
      </div>

      <RecipeDetail
        recipe={recipe}
        bookId={bookId}
        userRole={userRole as any}
        userId={user.id}
        reactionCounts={counts}
        userReactions={userReactions}
      />
    </AppShell>
  );
}
