import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { BookName } from "@/components/book/BookName";
import { RecipeCard, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

interface Props {
  params: Promise<{ bookId: string }>;
}

interface FavoriteRecipe {
  id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  source_name: string | null;
  cook_minutes: number | null;
  servings: number | null;
  category: { name: string } | null;
  creator?: { full_name: string | null } | { full_name: string | null }[] | null;
}

function getRecipeAttribution(recipe: FavoriteRecipe) {
  const creator = Array.isArray(recipe.creator) ? recipe.creator[0] : recipe.creator;
  return recipe.source_name?.trim() || creator?.full_name?.trim() || undefined;
}

export default async function FavoritesPage({ params }: Props) {
  const { bookId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: favorites } = await supabase
    .from("recipes")
    .select("id, title, description, photo_url, source_name, cook_minutes, servings, category:book_categories!recipes_category_id_fkey(name), creator:profiles!created_by(full_name), reactions:recipe_reactions!inner(user_id, type)")
    .eq("book_id", bookId)
    .eq("recipe_reactions.user_id", user.id)
    .eq("recipe_reactions.type", "favorite")
    .order("title", { ascending: true });

  return (
    <AppShell bookId={bookId}>
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-5 lg:px-8">
        <div className="mb-7 flex flex-col gap-4 border-b border-line-soft pb-6">
          <div>
            <BookName className="mb-2 block text-sm font-semibold text-ink-muted" />
            <h1
              className="text-3xl font-bold leading-tight text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Favorites
            </h1>
          </div>
        </div>

        {(favorites ?? []).length === 0 ? (
          <EmptyState
            title="No favorites yet."
            description="Heart a recipe while browsing to save it here."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {((favorites ?? []) as unknown as FavoriteRecipe[]).map((recipe) => (
              <Link
                key={recipe.id}
                href={`/app/books/${bookId}/recipes/${recipe.id}`}
              >
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
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
