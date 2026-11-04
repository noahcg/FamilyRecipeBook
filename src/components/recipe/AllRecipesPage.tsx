"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Heart, Library, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CookbookBadge } from "@/components/recipe/CookbookBadge";
import { Button, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/formatDuration";

interface RecipeReaction {
  type: string;
}

interface CountRow {
  id: string;
}

interface RecipeRow {
  id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  source_name: string | null;
  cook_minutes: number | null;
  servings: number | null;
  category: string | null;
  book_id: string;
  bookTitle: string;
  created_at: string;
  creator: { full_name: string | null } | { full_name: string | null }[] | null;
  reactions: RecipeReaction[] | null;
  ingredients: CountRow[] | null;
  instructions: CountRow[] | null;
  loveCount: number;
}

// One de-duplicated entry on the master list. A recipe copied into several
// cookbooks collapses to a single representative row that knows how many (and
// which) cookbooks it lives in.
interface RecipeListItem extends RecipeRow {
  bookCount: number;
  bookTitles: string[];
  books: { id: string; title: string }[];
  groupIds: string[];
}

// Copies are byte-identical in these fields (only id/book_id/created_by differ),
// so this reliably merges true copies without merging two distinct same-titled
// recipes.
function recipeContentKey(r: RecipeRow) {
  return [r.title.trim().toLowerCase(), r.photo_url ?? "", (r.description ?? "").trim().toLowerCase()].join("\u0000");
}

function dedupeAcrossCookbooks(rows: RecipeRow[]): RecipeListItem[] {
  const groups = new Map<string, RecipeRow[]>();
  for (const row of rows) {
    const key = recipeContentKey(row);
    const existing = groups.get(key);
    if (existing) existing.push(row);
    else groups.set(key, [row]);
  }
  return Array.from(groups.values()).map((group) => {
    // Represent the group with the user's most recent copy.
    const rep = group.reduce((a, b) =>
      new Date(b.created_at).getTime() > new Date(a.created_at).getTime() ? b : a
    );
    return {
      ...rep,
      loveCount: Math.max(...group.map((r) => r.loveCount)),
      bookCount: new Set(group.map((r) => r.book_id)).size,
      bookTitles: Array.from(new Set(group.map((r) => r.bookTitle))),
      books: Array.from(new Map(group.map((r) => [r.book_id, { id: r.book_id, title: r.bookTitle }])).values()),
      groupIds: group.map((r) => r.id),
    };
  });
}

interface FavoriteRow {
  recipe_id: string;
}

interface BookTargetRow {
  id: string;
}

const UNCATEGORIZED = "Family Notes";

const PRACTICAL_FILTERS = {
  quick: { label: "Quick", description: "Recipes with a cook time of 30 minutes or less." },
  "few-steps": { label: "Few Steps", description: "Recipes with 5 or fewer instruction steps." },
  "few-ingredients": { label: "Few Ingredients", description: "Recipes with 8 or fewer ingredients." },
} as const;

type PracticalFilter = keyof typeof PRACTICAL_FILTERS;

function isPracticalFilter(value: string | null): value is PracticalFilter {
  return value === "quick" || value === "few-steps" || value === "few-ingredients";
}

function recipeMatchesPracticalFilter(recipe: RecipeListItem, filter: PracticalFilter) {
  if (filter === "quick") return recipe.cook_minutes != null && recipe.cook_minutes <= 30;
  if (filter === "few-steps") {
    const steps = recipe.instructions?.length ?? 0;
    return steps > 0 && steps <= 5;
  }
  const ingredients = recipe.ingredients?.length ?? 0;
  return ingredients > 0 && ingredients <= 8;
}

function chapterId(category: string) {
  return `chapter-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function formatAddedDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(value));
}

function recipeCreatorName(recipe: RecipeListItem) {
  const creator = Array.isArray(recipe.creator) ? recipe.creator[0] : recipe.creator;
  return creator?.full_name;
}

function recipeMeta(recipe: RecipeListItem) {
  const attribution = recipe.source_name?.trim() || recipeCreatorName(recipe)?.trim();
  return [
    attribution,
    recipe.cook_minutes ? formatDuration(recipe.cook_minutes) : null,
    recipe.servings ? `Serves ${recipe.servings}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function recipeHaystack(recipe: RecipeListItem) {
  return [recipe.title, recipe.source_name, recipeCreatorName(recipe), recipe.category, ...recipe.bookTitles, recipe.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// One entry's cookbook denotation: the cookbook name when it lives in a single
// book, or a stacked-books "In N cookbooks" pill (names on hover) when copied
// across several — so a multi-cookbook recipe shows once, clearly marked.
function CookbookIndicator({
  bookCount,
  bookTitle,
  bookTitles,
  visible = true,
}: {
  bookCount: number;
  bookTitle: string;
  bookTitles: string[];
  visible?: boolean;
}) {
  if (!visible) return null;
  if (bookCount <= 1) return <CookbookBadge title={bookTitle} />;
  return (
    <span
      title={`In ${bookCount} cookbooks: ${bookTitles.join(", ")}`}
      className="inline-flex max-w-full items-center gap-1 rounded-sm border border-green-sage/40 bg-green-soft px-2 py-0.5 text-xs font-bold text-green-deep"
    >
      <Library size={11} strokeWidth={2} className="shrink-0" />
      <span className="truncate">In {bookCount} cookbooks</span>
    </span>
  );
}

export function AllRecipesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const activeFilter: PracticalFilter | null = isPracticalFilter(filterParam) ? filterParam : null;
  const activeFilterDetails = activeFilter ? PRACTICAL_FILTERS[activeFilter] : null;
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [cookbookCount, setCookbookCount] = useState(0);
  const [addRecipeBookId, setAddRecipeBookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isContentsOpen, setIsContentsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function loadRecipes() {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        if (active) {
          setRecipes([]);
          setAddRecipeBookId(null);
          setLoading(false);
        }
        return;
      }

      // Plus combines every recipe the user can access. RLS scopes rows to
      // cookbook memberships; the cookbook join powers visible destinations.
      const [recipesRes, favoritesRes, settingsRes, booksRes] = await Promise.all([
        supabase
          .from("recipes")
          .select(
            "id, title, description, photo_url, source_name, cook_minutes, servings, created_at, book_id, creator:profiles!created_by(full_name), reactions:recipe_reactions(type), ingredients:recipe_ingredients(id), instructions:recipe_instructions(id), category:book_categories!recipes_category_id_fkey(name), book:recipe_books!recipes_book_id_fkey(title)"
          )
          .order("title", { ascending: true }),
        supabase.from("recipe_reactions").select("recipe_id").eq("user_id", user.id).eq("type", "favorite"),
        supabase.from("user_settings").select("default_book_id").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("recipe_books")
          .select("id, book_members!inner(user_id)")
          .eq("book_members.user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      const rows: RecipeRow[] = ((recipesRes.data ?? []) as unknown as (Omit<
        RecipeRow,
        "category" | "loveCount" | "bookTitle"
      > & {
        category: { name: string } | null;
        book: { title: string } | { title: string }[] | null;
      })[]).map((recipe) => {
        const book = Array.isArray(recipe.book) ? recipe.book[0] : recipe.book;
        return {
          ...recipe,
          category: recipe.category?.name ?? null,
          bookTitle: book?.title ?? "Recipe Book",
          loveCount: recipe.reactions?.filter((r) => r.type === "love").length ?? 0,
        };
      });

      const books = (booksRes.data ?? []) as unknown as BookTargetRow[];
      const defaultBookId = settingsRes.data?.default_book_id ?? null;

      setRecipes(dedupeAcrossCookbooks(rows));
      setFavoriteIds(new Set(((favoritesRes.data ?? []) as FavoriteRow[]).map((r) => r.recipe_id)));
      setCookbookCount(books.length);
      setAddRecipeBookId(
        books.some((book) => book.id === defaultBookId)
          ? defaultBookId
          : books[0]?.id ?? null
      );
      setLoading(false);
    }

    loadRecipes().catch(() => {
      if (active) {
        setAddRecipeBookId(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const base = activeFilter
      ? recipes.filter((recipe) => recipeMatchesPracticalFilter(recipe, activeFilter))
      : recipes;
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return base;
    return base.filter((recipe) => recipeHaystack(recipe).includes(normalizedQuery));
  }, [activeFilter, query, recipes]);

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

  const visibleCookbooks = useMemo(() => {
    const books = new Map<string, { id: string; title: string; count: number }>();
    for (const recipe of filtered) {
      for (const book of recipe.books) {
        const existing = books.get(book.id);
        if (existing) existing.count += 1;
        else books.set(book.id, { ...book, count: 1 });
      }
    }
    return Array.from(books.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [filtered]);

  const showContents = !loading && filtered.length > 0;
  const addRecipeHref = addRecipeBookId
    ? `/app/books/${addRecipeBookId}/recipes/new`
    : "/onboarding/create-book";

  useEffect(() => {
    if (loading) return;

    // The chapters are fetched on the client, so a native browser hash jump
    // happens too early on refresh or Back. Restore it after they render.
    const restoreHashTarget = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      window.requestAnimationFrame(() => {
        document.getElementById(decodeURIComponent(id))?.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
      });
    };

    restoreHashTarget();
    window.addEventListener("hashchange", restoreHashTarget);
    return () => window.removeEventListener("hashchange", restoreHashTarget);
  }, [chapters, loading]);

  function handleRecipeOpen(event: MouseEvent<HTMLAnchorElement>, recipe: RecipeListItem) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const href = `/app/books/${recipe.book_id}/recipes/${recipe.id}?returnTo=${encodeURIComponent(returnTo)}`;

    // A native document navigation retains a valid browser history entry when
    // an Index anchor is active. App Router's client navigation does not.
    if (window.location.hash) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Preserve native document history when opening from a chapter hash.
      window.location.assign(href);
      return;
    }

    router.push(href);
  }

  function renderRecipeRow(recipe: RecipeListItem) {
    return (
      <li key={recipe.id}>
        <Link
          href={`/app/books/${recipe.book_id}/recipes/${recipe.id}`}
          onClick={(event) => handleRecipeOpen(event, recipe)}
          className="group -mx-3 grid gap-3 rounded-md px-3 py-4 outline-none transition-colors hover:bg-green-sage/30 focus-visible:bg-green-sage/30 sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <span className="min-w-0">
            <span className="mb-2 flex">
              <CookbookIndicator
                bookCount={recipe.bookCount}
                bookTitle={recipe.bookTitle}
                bookTitles={recipe.bookTitles}
                visible
              />
            </span>
            <span
              className="block text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-green-deep group-focus-visible:text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {recipe.title}
            </span>
            <span className="mt-1 block truncate text-sm text-ink-muted">
              {recipeMeta(recipe) || "Family recipe"} · Added {formatAddedDate(recipe.created_at)}
            </span>
          </span>
          <span className="flex items-center gap-3 text-xs font-semibold text-ink-soft sm:justify-end">
            {recipe.groupIds.some((id) => favoriteIds.has(id)) && (
              <span className="inline-flex items-center gap-1 text-accent-terracotta">
                <Heart size={13} fill="currentColor" /> Favorite
              </span>
            )}
            {recipe.loveCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Heart size={13} /> {recipe.loveCount}
              </span>
            )}
          </span>
        </Link>
      </li>
    );
  }

  return (
    <AppShell
      mobileSideDrawer={
        showContents
          ? {
              label: "Cookbooks",
              ariaLabel: "Open cookbooks",
              eyebrow: "Across your books",
              title: "Cookbooks",
              icon: <BookOpen size={17} strokeWidth={1.8} />,
              isOpen: isContentsOpen,
              onOpen: () => setIsContentsOpen(true),
              onClose: () => setIsContentsOpen(false),
              children: (
                <nav className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {visibleCookbooks.map((book) => (
                    <Link
                      key={book.id}
                      href={`/app/books/${book.id}/recipes`}
                      onClick={() => setIsContentsOpen(false)}
                      className="group flex min-h-11 items-center justify-between gap-3 border-b border-line-soft py-3 last:border-b-0"
                    >
                      <span className="min-w-0 truncate text-base font-semibold text-ink transition-colors group-hover:text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>
                        {book.title}
                      </span>
                      <span className="shrink-0 rounded-sm bg-paper-warm px-2 py-0.5 text-xs font-bold text-ink-soft" aria-label={`${book.count} ${book.count === 1 ? "recipe" : "recipes"} shown`}>
                        {book.count}
                      </span>
                    </Link>
                  ))}
                </nav>
              ),
            }
          : undefined
      }
    >
      <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-5 lg:px-8">
        <header className="mb-7 border-b border-line-soft pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="mb-2 block text-sm font-semibold text-ink-muted">Your collection</p>
              <h1
                className="text-4xl font-bold leading-tight text-green-deep lg:text-5xl"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                All Recipes
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
                {activeFilterDetails
                  ? activeFilterDetails.description
                  : `${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"} across ${cookbookCount} ${cookbookCount === 1 ? "cookbook" : "cookbooks"}`}
              </p>
              {activeFilterDetails && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-sm bg-accent-honey/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                    {activeFilterDetails.label}
                  </span>
                  <Link href="/app/recipes" className="text-sm font-bold text-green-deep hover:underline">
                    View all recipes
                  </Link>
                </div>
              )}
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="relative min-w-0 flex-1 lg:w-[320px] lg:flex-none">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" strokeWidth={1.75} />
                <input
                  className="input-cookbook h-12 w-full text-sm"
                  style={{ paddingLeft: "2.25rem" }}
                  placeholder="Search all your recipes..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {loading ? (
                <Button variant="primary" size="md" className="h-12 w-full rounded-md px-5 sm:w-auto" loading>
                  Add Recipe
                </Button>
              ) : (
                <Link href={addRecipeHref}>
                  <Button variant="primary" size="md" className="h-12 w-full rounded-md px-5 sm:w-auto">
                    <Plus size={17} /> {addRecipeBookId ? "Add Recipe" : "Create Cookbook"}
                  </Button>
                </Link>
              )}
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
            title={query ? "No matching recipes" : "No recipes yet"}
            description={
              query
                ? "Try another search term."
                : addRecipeBookId
                ? "Add your first recipe and it will gather here with the rest of your collection."
                : "Create a cookbook first, then add recipes to your collection."
            }
            action={
              !query ? (
                <Link
                  href={addRecipeHref}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-green-deep px-4 text-sm font-bold text-ink-inverse transition-colors hover:bg-green-forest-dark"
                >
                  <Plus size={14} /> {addRecipeBookId ? "Add your first recipe" : "Create a cookbook"}
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
                    className="scroll-mt-6 border-b-2 border-dotted border-line pb-8 last:border-b-0"
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
                    <ol className="divide-y divide-line-soft/45">{chapter.recipes.map(renderRecipeRow)}</ol>
                  </section>
                ))}
              </div>
            </main>

            <aside className="hidden lg:sticky lg:top-8 lg:block lg:self-start">
              <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain rounded-xl border border-line bg-card shadow-[var(--shadow-paper)]">
                <div className="sticky top-0 z-10 border-b border-line-soft bg-paper-warm px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">Across your books</p>
                  <h2
                    className="mt-1 text-2xl font-bold leading-tight text-green-deep"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    Cookbooks
                  </h2>
                </div>
                <nav className="px-5 py-3">
                  {visibleCookbooks.map((book) => (
                    <Link
                      key={book.id}
                      href={`/app/books/${book.id}/recipes`}
                      className="group flex min-h-11 items-center justify-between gap-3 border-b border-line-soft py-3 last:border-b-0"
                    >
                      <span className="min-w-0 truncate text-base font-semibold text-ink transition-colors group-hover:text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>
                        {book.title}
                      </span>
                      <span className="shrink-0 rounded-sm bg-paper-warm px-2 py-0.5 text-xs font-bold text-ink-soft" aria-label={`${book.count} ${book.count === 1 ? "recipe" : "recipes"} shown`}>
                        {book.count}
                      </span>
                    </Link>
                  ))}
                </nav>

              </div>
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
