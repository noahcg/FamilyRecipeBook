"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RecipeCard, EmptyState, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { use } from "react";

interface Props {
  params: Promise<{ bookId: string }>;
}

export default function RecipesPage({ params }: Props) {
  const { bookId } = use(params);
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("recipes")
      .select("*, creator:profiles!created_by(full_name), reactions:recipe_reactions(type)")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRecipes(
          (data ?? []).map((r: any) => ({
            ...r,
            loveCount: r.reactions?.filter((rx: any) => rx.type === "love").length ?? 0,
          }))
        );
        setLoading(false);
      });
  }, [bookId]);

  const filtered = query.trim()
    ? recipes.filter(
        (r) =>
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          (r.source_name ?? "").toLowerCase().includes(query.toLowerCase()) ||
          (r.category ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : recipes;

  return (
    <AppShell bookId={bookId}>
      <div className="mx-auto max-w-[1180px] px-5 py-8 lg:px-8">
        <div className="mb-7 flex flex-col gap-4 border-b border-line-soft pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-muted">The Family Table</p>
            <h1
              className="text-3xl font-bold leading-tight text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              All Recipes
            </h1>
          </div>
          <Link href={`/app/books/${bookId}/recipes/new`}>
            <Button variant="primary" size="md" className="rounded-md">
              <Plus size={16} /> Add Recipe
            </Button>
          </Link>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4">
          <h1
            className="text-xl font-semibold text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Browse the book
          </h1>
          <div className="relative w-full max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              strokeWidth={1.75}
            />
            <input
              className="input-cookbook h-11 w-full pl-9 text-sm"
              placeholder="Search recipes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-lg aspect-[3/4] animate-pulse"
                style={{ background: "var(--color-sage-pale)" }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query ? "No recipes found" : "No recipes yet"}
            description={
              query
                ? "Try a different search."
                : "Add your first recipe to this book."
            }
            action={
              !query ? (
                <Link href={`/app/books/${bookId}/recipes/new`}>
                  <Button variant="primary" size="sm">
                    <Plus size={14} /> Add a recipe
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {filtered.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/app/books/${bookId}/recipes/${recipe.id}`}
              >
                <RecipeCard
                  title={recipe.title}
                  description={recipe.description}
                  imageUrl={recipe.photo_url ?? undefined}
                  fromPerson={recipe.source_name ?? recipe.creator?.full_name}
                  cookTime={recipe.cook_minutes ? `${recipe.cook_minutes} min` : undefined}
                  servings={recipe.servings ?? undefined}
                  loveCount={recipe.loveCount}
                  category={recipe.category ?? undefined}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
