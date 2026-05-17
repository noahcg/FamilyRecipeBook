"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Heart,
  Plus,
  Search,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, Button } from "@/components/ui";
import { BookName } from "@/components/book/BookName";
import { createClient } from "@/lib/supabase/client";

interface Props {
  params: Promise<{ bookId: string }>;
}

interface RecipeReaction {
  type: string;
}

interface RecipeListItem {
  id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  source_name: string | null;
  cook_minutes: number | null;
  servings: number | null;
  category: string | null;
  created_at: string;
  creator: { full_name: string | null } | { full_name: string | null }[] | null;
  reactions: RecipeReaction[] | null;
  loveCount: number;
}

interface FavoriteRow {
  recipe_id: string;
}

const UNCATEGORIZED = "Family Notes";

function chapterId(category: string) {
  return `chapter-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function formatAddedDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function recipeMeta(recipe: RecipeListItem) {
  const creator = Array.isArray(recipe.creator) ? recipe.creator[0] : recipe.creator;
  const attribution = recipe.source_name?.trim() || creator?.full_name?.trim();
  const items = [
    attribution,
    recipe.cook_minutes ? `${recipe.cook_minutes} min` : null,
    recipe.servings ? `Serves ${recipe.servings}` : null,
  ];

  return items.filter(Boolean).join(" · ");
}

function recipeCreatorName(recipe: RecipeListItem) {
  const creator = Array.isArray(recipe.creator) ? recipe.creator[0] : recipe.creator;
  return creator?.full_name;
}

export default function RecipesPage({ params }: Props) {
  const { bookId } = use(params);
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isContentsOpen, setIsContentsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function loadRecipes() {
      setLoading(true);

      const recipesRequest = supabase
        .from("recipes")
        .select("*, creator:profiles!created_by(full_name), reactions:recipe_reactions(type)")
        .eq("book_id", bookId)
        .order("created_at", { ascending: false });

      const userRequest = supabase.auth.getUser();

      const [recipesRes, userRes] = await Promise.all([recipesRequest, userRequest]);
      let favoriteRows: FavoriteRow[] = [];

      const user = userRes.data.user;
      if (user) {
        const favoritesRes = await supabase
          .from("recipe_reactions")
          .select("recipe_id")
          .eq("user_id", user.id)
          .eq("type", "favorite");
        favoriteRows = (favoritesRes.data ?? []) as FavoriteRow[];
      }

      if (!active) return;

      const nextRecipes = ((recipesRes.data ?? []) as RecipeListItem[]).map((recipe) => ({
        ...recipe,
        loveCount: recipe.reactions?.filter((reaction) => reaction.type === "love").length ?? 0,
      }));

      setRecipes(nextRecipes);
      setFavoriteIds(new Set(favoriteRows.map((row) => row.recipe_id)));
      setLoading(false);
    }

    loadRecipes().catch(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [bookId]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return recipes;

    return recipes.filter((recipe) =>
      [
        recipe.title,
        recipe.source_name,
        recipeCreatorName(recipe),
        recipe.category,
        recipe.description,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery))
    );
  }, [query, recipes]);

  const chapters = useMemo(() => {
    const grouped = new Map<string, RecipeListItem[]>();

    for (const recipe of filtered) {
      const category = recipe.category?.trim() || UNCATEGORIZED;
      grouped.set(category, [...(grouped.get(category) ?? []), recipe]);
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, items], index) => ({
        category,
        number: String(index + 1).padStart(2, "0"),
        recipes: items.sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [filtered]);

  const newestRecipe = recipes[0] ?? null;
  const favoriteCount = favoriteIds.size;
  const showContents = !loading && filtered.length > 0;

  function closeContents() {
    setIsContentsOpen(false);
  }

  return (
    <AppShell
      bookId={bookId}
      mobileSideDrawer={
        showContents
          ? {
              label: "Index",
              ariaLabel: "Open recipe contents",
              eyebrow: "Recipe Index",
              title: "Chapters",
              icon: <BookOpen size={17} strokeWidth={1.8} />,
              isOpen: isContentsOpen,
              onOpen: () => setIsContentsOpen(true),
              onClose: closeContents,
              children: (
                <>
                  <nav className="min-h-0 flex-1 overflow-y-auto pr-1">
                    {chapters.map((chapter) => (
                      <a
                        key={chapter.category}
                        href={`#${chapterId(chapter.category)}`}
                        onClick={closeContents}
                        className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-line-soft py-3 last:border-b-0"
                      >
                        <span className="text-xs font-bold text-accent-cinnamon">{chapter.number}</span>
                        <span
                          className="truncate text-base font-semibold text-ink transition-colors group-hover:text-green-deep"
                          style={{ fontFamily: "var(--font-playfair)" }}
                        >
                          {chapter.category}
                        </span>
                        <span className="rounded-sm bg-paper-warm px-2 py-0.5 text-xs font-bold text-ink-soft">
                          {chapter.recipes.length}
                        </span>
                      </a>
                    ))}
                  </nav>

                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line-soft pt-4">
                    <div className="rounded-sm bg-paper-warm px-3 py-3">
                      <p className="text-xs font-semibold text-ink-soft">Recipes</p>
                      <p className="mt-1 text-2xl font-bold text-green-deep">{recipes.length}</p>
                    </div>
                    <div className="rounded-sm bg-paper-warm px-3 py-3">
                      <p className="text-xs font-semibold text-ink-soft">Showing</p>
                      <p className="mt-1 text-2xl font-bold text-green-deep">{filtered.length}</p>
                    </div>
                  </div>
                </>
              ),
            }
          : undefined
      }
    >
      <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-5 lg:px-8">
        <header className="mb-7 border-b border-line-soft pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <BookName className="mb-2 block text-sm font-semibold text-ink-muted" />
              <h1
                className="text-4xl font-bold leading-tight text-green-deep lg:text-5xl"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Contents
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
                {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} across{" "}
                {chapters.length || 0} {chapters.length === 1 ? "chapter" : "chapters"}
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="relative min-w-0 flex-1 lg:w-[340px] lg:flex-none">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
                  strokeWidth={1.75}
                />
                <input
                  className="input-cookbook h-12 w-full text-sm"
                  style={{ paddingLeft: "2.25rem" }}
                  placeholder="Search the contents..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Link href={`/app/books/${bookId}/recipes/new`}>
                <Button variant="primary" size="md" className="h-12 w-full rounded-md px-5 sm:w-auto">
                  <Plus size={17} /> Add Recipe
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="skeleton-surface h-28 rounded-lg" />
              ))}
            </div>
            <div className="skeleton-surface hidden h-[520px] rounded-xl lg:block" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query ? "No matching recipes" : "Your first recipe belongs here"}
            description={
              query
                ? "Try another search term or browse the full recipe list."
                : "Start with one recipe you already know you will want to find again."
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
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
            <main className="min-w-0">
              <div className="space-y-10">
                {chapters.map((chapter) => (
                  <section
                    key={chapter.category}
                    id={chapterId(chapter.category)}
                    className="scroll-mt-6 border-b border-line-soft pb-8 last:border-b-0"
                  >
                    <div className="mb-4 flex items-baseline gap-4">
                      <span className="text-sm font-bold text-accent-cinnamon">{chapter.number}</span>
                      <h2
                        className="text-2xl font-bold leading-tight text-green-deep"
                        style={{ fontFamily: "var(--font-playfair)" }}
                      >
                        {chapter.category}
                      </h2>
                      <span className="h-px flex-1 bg-line-soft" />
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
                        {chapter.recipes.length}
                      </span>
                    </div>

                    <ol className="divide-y divide-line-soft">
                      {chapter.recipes.map((recipe) => {
                        return (
                          <li key={recipe.id}>
                            <Link
                              href={`/app/books/${bookId}/recipes/${recipe.id}`}
                              className="group grid gap-3 py-4 outline-none transition-colors hover:bg-card/50 focus-visible:bg-card/70 sm:grid-cols-[minmax(0,1fr)_auto]"
                            >
                              <span className="min-w-0">
                                <span className="flex items-baseline gap-3">
                                  <span
                                    className="text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-green-deep group-focus-visible:text-green-deep"
                                    style={{ fontFamily: "var(--font-playfair)" }}
                                  >
                                    {recipe.title}
                                  </span>
                                  <span className="hidden h-px min-w-8 flex-1 border-b border-dotted border-line sm:block" />
                                </span>
                                <span className="mt-1 block truncate text-sm text-ink-muted">
                                  {recipeMeta(recipe) || "Family recipe"} · Added {formatAddedDate(recipe.created_at)}
                                </span>
                              </span>

                              <span className="flex items-center gap-3 text-xs font-semibold text-ink-soft sm:justify-end">
                                {favoriteIds.has(recipe.id) && (
                                  <span className="inline-flex items-center gap-1 text-accent-terracotta">
                                    <Heart size={13} fill="currentColor" />
                                    Favorite
                                  </span>
                                )}
                                {recipe.loveCount > 0 && (
                                  <span className="inline-flex items-center gap-1">
                                    <Heart size={13} />
                                    {recipe.loveCount}
                                  </span>
                                )}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                ))}
              </div>
            </main>

            <aside className="hidden lg:sticky lg:top-8 lg:block lg:self-start">
              <div className="overflow-hidden rounded-xl border border-line bg-card shadow-[var(--shadow-paper)]">
                <div className="border-b border-line-soft bg-paper-warm px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                    In this book
                  </p>
                  <h2
                    className="mt-1 text-2xl font-bold leading-tight text-green-deep"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    Chapter Index
                  </h2>
                </div>

                <nav className="px-5 py-3">
                  {chapters.map((chapter) => (
                    <a
                      key={chapter.category}
                      href={`#${chapterId(chapter.category)}`}
                      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-line-soft py-3 last:border-b-0"
                    >
                      <span className="text-xs font-bold text-accent-cinnamon">{chapter.number}</span>
                      <span
                        className="truncate text-base font-semibold text-ink transition-colors group-hover:text-green-deep"
                        style={{ fontFamily: "var(--font-playfair)" }}
                      >
                        {chapter.category}
                      </span>
                      <span className="rounded-sm bg-paper-warm px-2 py-0.5 text-xs font-bold text-ink-soft">
                        {chapter.recipes.length}
                      </span>
                    </a>
                  ))}
                </nav>

                {newestRecipe && (
                  <Link
                    href={`/app/books/${bookId}/recipes/${newestRecipe.id}`}
                    className="group block border-t border-line-soft px-5 py-5 hover:bg-green-pale/50"
                  >
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">
                      Newest recipe
                    </p>
                    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
                      <div className="aspect-square overflow-hidden rounded-md bg-green-pale">
                        {newestRecipe.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={newestRecipe.photo_url}
                            alt={newestRecipe.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <BookOpen size={28} strokeWidth={1.2} className="text-green-sage" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3
                          className="truncate text-lg font-bold leading-tight text-green-deep"
                          style={{ fontFamily: "var(--font-playfair)" }}
                        >
                          {newestRecipe.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-snug text-ink-muted">
                          {recipeMeta(newestRecipe) || `Added ${formatAddedDate(newestRecipe.created_at)}`}
                        </p>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
