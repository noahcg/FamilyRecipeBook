import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { CookbookBadge } from "@/components/recipe/CookbookBadge";
import { RecipeCard, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

interface FavoriteRecipe {
  id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  source_name: string | null;
  cook_minutes: number | null;
  servings: number | null;
  book_id: string;
  category: { name: string } | null;
  creator?: { full_name: string | null } | { full_name: string | null }[] | null;
  book?: { title: string } | { title: string }[] | null;
}

function getRecipeAttribution(recipe: FavoriteRecipe) {
  const creator = Array.isArray(recipe.creator) ? recipe.creator[0] : recipe.creator;
  return recipe.source_name?.trim() || creator?.full_name?.trim() || undefined;
}

function bookTitle(recipe: FavoriteRecipe) {
  const book = Array.isArray(recipe.book) ? recipe.book[0] : recipe.book;
  return book?.title ?? "Recipe Book";
}

export default async function FavoritesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // No book filter — these are the account's favorites across every cookbook.
  const { data: favorites } = await supabase
    .from("recipes")
    .select(
      "id, title, description, photo_url, source_name, cook_minutes, servings, book_id, category:book_categories!recipes_category_id_fkey(name), creator:profiles!created_by(full_name), book:recipe_books!recipes_book_id_fkey(title), reactions:recipe_reactions!inner(user_id, type)"
    )
    .eq("recipe_reactions.user_id", user.id)
    .eq("recipe_reactions.type", "favorite")
    .order("title", { ascending: true });

  const rows = (favorites ?? []) as unknown as FavoriteRecipe[];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-5 lg:px-8">
        <div className="mb-7 flex flex-col gap-4 border-b border-line-soft pb-6">
          <div>
            <p className="mb-2 block text-sm font-semibold text-ink-muted">Your collection</p>
            <h1
              className="text-3xl font-bold leading-tight text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Favorites
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              The recipes you&apos;ve hearted, from every cookbook.
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No favorites yet."
            description="Heart a recipe while browsing to save it here."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {rows.map((recipe) => (
              <div key={recipe.id} className="flex flex-col gap-2">
                <Link href={`/app/books/${recipe.book_id}/recipes/${recipe.id}`}>
                  <RecipeCard
                    title={recipe.title}
                    description={recipe.description ?? undefined}
                    imageUrl={recipe.photo_url ?? undefined}
                    fromPerson={getRecipeAttribution(recipe)}
                    cookTime={recipe.cook_minutes ? `${recipe.cook_minutes} min` : undefined}
                    servings={recipe.servings ?? undefined}
                    category={recipe.category?.name ?? undefined}
                    isFavorited
                  />
                </Link>
                <CookbookBadge
                  title={bookTitle(recipe)}
                  href={`/app/books/${recipe.book_id}/recipes`}
                  className="self-start"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
