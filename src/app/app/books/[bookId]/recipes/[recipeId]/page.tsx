import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { RecipeDetail } from "@/components/recipe/RecipeDetail";
import { getRecipe } from "@/lib/actions/recipes";
import { getReactionData, getRecipeRatingSummary } from "@/lib/actions/reactions";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getHomeRecipe } from "@/lib/actions/homeRecipe";
import { getAdjacentRecipes } from "@/lib/chapterContents";

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

  const [{ userReactions }, ratingSummary, memberRes, contributionRes, homeRecipe, contentsRes] = await Promise.all([
    getReactionData(recipeId, user.id),
    getRecipeRatingSummary(recipeId, user.id),
    supabase
      .from("book_members")
      .select("role")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .single(),
    supabase.rpc("can_contribute_to_book", { book_uuid: bookId, user_uuid: user.id }),
    getHomeRecipe(),
    supabase.from("recipes")
      .select("id,title,category:book_categories!recipes_category_id_fkey(name,position)")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false }),
  ]);

  const contents = ((contentsRes.data ?? []) as unknown as {
    id: string; title: string; category: { name: string; position: number } | null;
  }[]).map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category?.name ?? null,
    categoryPosition: item.category?.position ?? null,
  }));
  const adjacent = getAdjacentRecipes(contents, recipeId, "Family Notes");

  const storedRole = memberRes.data?.role ?? null;
  const userRole = storedRole === "contributor" && contributionRes.data !== true ? "family" : storedRole;

  return (
    <AppShell bookId={bookId}>
      <RecipeDetail
        key={recipe.id}
        recipe={recipe}
        bookId={bookId}
        userRole={userRole as import("@/lib/types").BookRole | null}
        userId={user.id}
        userReactions={userReactions}
        ratingSummary={ratingSummary}
        homeRecipePinned={homeRecipe?.id === recipe.id}
        previousRecipe={adjacent.previous}
        nextRecipe={adjacent.next}
      />
    </AppShell>
  );
}
