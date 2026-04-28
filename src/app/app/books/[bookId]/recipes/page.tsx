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
      <div className="px-5 pt-5 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1
            className="text-xl font-bold text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            All Recipes
          </h1>
          <Link href={`/app/books/${bookId}/recipes/new`}>
            <Button variant="primary" size="sm">
              <Plus size={14} /> Add
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
            strokeWidth={1.75}
          />
          <input
            className="input-cookbook pl-9"
            placeholder="Search recipes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
