import { notFound } from "next/navigation";
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
      <RecipeDetail
        recipe={recipe}
        bookId={bookId}
        userRole={userRole as import("@/lib/types").BookRole | null}
        userId={user.id}
        reactionCounts={counts}
        userReactions={userReactions}
      />
    </AppShell>
  );
}
