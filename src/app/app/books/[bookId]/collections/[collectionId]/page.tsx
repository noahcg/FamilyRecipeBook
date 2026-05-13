import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RecipeCard, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

interface Props {
  params: Promise<{ bookId: string; collectionId: string }>;
}

interface FavoriteReactionRow {
  recipe_id: string;
}

interface CollectionRecipeRow {
  recipe: {
    id: string;
    title: string;
    description: string | null;
    photo_url: string | null;
    source_name: string | null;
    category: string | null;
    reactions?: { type: string }[] | null;
  } | null;
}

export default async function CollectionDetailPage({ params }: Props) {
  const { bookId, collectionId } = await params;
  const [user, supabase] = await Promise.all([requireUser(), createClient()]);

  const [{ data: collection }, { data: favReactions }] = await Promise.all([
    supabase
      .from("collections")
      .select(
        "*, recipes:collection_recipes(recipe:recipes(*, reactions:recipe_reactions(type)))"
      )
      .eq("id", collectionId)
      .eq("book_id", bookId)
      .single(),
    supabase
      .from("recipe_reactions")
      .select("recipe_id")
      .eq("user_id", user.id)
      .eq("type", "favorite"),
  ]);

  if (!collection) notFound();

  const favoriteIds = new Set(((favReactions ?? []) as FavoriteReactionRow[]).map((r) => r.recipe_id));
  const recipes = ((collection.recipes ?? []) as CollectionRecipeRow[]).map((cr) => ({
    ...cr.recipe,
    loveCount:
      cr.recipe?.reactions?.filter((rx) => rx.type === "love").length ?? 0,
  })).filter((recipe): recipe is NonNullable<CollectionRecipeRow["recipe"]> & { loveCount: number } => Boolean(recipe.id));

  return (
    <AppShell bookId={bookId}>
      <div className="px-5 pt-5 pb-6">
        <Link
          href={`/app/books/${bookId}/collections`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink mb-4 block"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Collections
        </Link>

        <div className="flex items-center gap-3 mb-6">
          {collection.icon && (
            <span className="text-3xl">{collection.icon}</span>
          )}
          <div>
            <h1
              className="text-xl font-bold text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {collection.title}
            </h1>
            {collection.description && (
              <p className="text-sm text-ink-muted">{collection.description}</p>
            )}
          </div>
        </div>

        {recipes.length === 0 ? (
          <EmptyState
            title="No recipes in this collection yet."
            description="Open any recipe and add it to this collection."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {recipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/app/books/${bookId}/recipes/${recipe.id}`}
              >
                <RecipeCard
                  title={recipe.title}
                  description={recipe.description ?? undefined}
                  imageUrl={recipe.photo_url ?? undefined}
                  fromPerson={recipe.source_name ?? undefined}
                  loveCount={recipe.loveCount}
                  category={recipe.category ?? undefined}
                  isFavorited={favoriteIds.has(recipe.id)}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
