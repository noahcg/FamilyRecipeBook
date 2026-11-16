"use client";

import { use, useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Plus,
  Search,
  Settings,
  Share2,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, Button } from "@/components/ui";
import { ChapterIndex, ChapterListing, chapterId } from "@/components/book/ChapterListing";
import { BookName } from "@/components/book/BookName";
import { BookMembersDrawer } from "@/components/book/BookMembersDrawer";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/formatDuration";
import { canContribute, canView } from "@/lib/permissions";
import { getBookAccessSummary } from "@/lib/actions/books";
import { groupRecipesByChapter } from "@/lib/chapterContents";
import type { BookRole } from "@/lib/types";

interface Props {
  params: Promise<{ bookId: string }>;
}

interface RecipeReaction {
  type: string;
}

interface RecipeCountRow {
  id: string;
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
  categoryPosition: number | null;
  created_at: string;
  creator: { full_name: string | null } | { full_name: string | null }[] | null;
  reactions: RecipeReaction[] | null;
  ingredients: RecipeCountRow[] | null;
  instructions: RecipeCountRow[] | null;
  loveCount: number;
}

interface FavoriteRow {
  recipe_id: string;
}

interface RecipeAllowanceRow {
  is_free: boolean;
  used: number;
  recipe_limit: number | null;
}

const UNCATEGORIZED = "Family Notes";

const PRACTICAL_FILTERS = {
  quick: {
    label: "Quick",
    description: "Recipes with a cook time of 30 minutes or less.",
  },
  "few-steps": {
    label: "Few Steps",
    description: "Recipes with 5 or fewer instruction steps.",
  },
  "few-ingredients": {
    label: "Few Ingredients",
    description: "Recipes with 8 or fewer ingredients.",
  },
} as const;

type PracticalFilter = keyof typeof PRACTICAL_FILTERS;

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
    recipe.cook_minutes ? formatDuration(recipe.cook_minutes) : null,
    recipe.servings ? `Serves ${recipe.servings}` : null,
  ];

  return items.filter(Boolean).join(" · ");
}

function recipeCreatorName(recipe: RecipeListItem) {
  const creator = Array.isArray(recipe.creator) ? recipe.creator[0] : recipe.creator;
  return creator?.full_name;
}

function recipeHaystack(recipe: RecipeListItem) {
  return [
    recipe.title,
    recipe.source_name,
    recipeCreatorName(recipe),
    recipe.category,
    recipe.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isPracticalFilter(value: string | null): value is PracticalFilter {
  return value === "quick" || value === "few-steps" || value === "few-ingredients";
}

function recipeMatchesPracticalFilter(recipe: RecipeListItem, filter: PracticalFilter) {
  if (filter === "quick") return recipe.cook_minutes != null && recipe.cook_minutes <= 30;
  if (filter === "few-steps") {
    const stepCount = recipe.instructions?.length ?? 0;
    return stepCount > 0 && stepCount <= 5;
  }

  const ingredientCount = recipe.ingredients?.length ?? 0;
  return ingredientCount > 0 && ingredientCount <= 8;
}

export default function RecipesPage({ params }: Props) {
  const { bookId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const activeFilter: PracticalFilter | null = isPracticalFilter(filterParam) ? filterParam : null;
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [memberCount, setMemberCount] = useState(0);
  const [bookDescription, setBookDescription] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<BookRole | null>(null);
  const [canEffectivelyContribute, setCanEffectivelyContribute] = useState(false);
  const [canInvite, setCanInvite] = useState(false);
  const [recipeAllowance, setRecipeAllowance] = useState<RecipeAllowanceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [isContentsOpen, setIsContentsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function loadRecipes() {
      setLoading(true);

      const recipesRequest = supabase
        .from("recipes")
        .select(
          "*, creator:profiles!created_by(full_name), reactions:recipe_reactions(type), ingredients:recipe_ingredients(id), instructions:recipe_instructions(id), category:book_categories!recipes_category_id_fkey(name, position)"
        )
        .eq("book_id", bookId)
        .order("created_at", { ascending: false });

      const userRequest = supabase.auth.getUser();

      const [recipesRes, userRes, accessSummary, allowanceRes, bookRes] = await Promise.all([
        recipesRequest,
        userRequest,
        getBookAccessSummary(bookId),
        supabase.rpc("get_book_recipe_allowance", { target_book_id: bookId }).maybeSingle(),
        supabase.from("recipe_books").select("description").eq("id", bookId).maybeSingle(),
      ]);
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

      const nextRecipes = ((recipesRes.data ?? []) as unknown as (Omit<
        RecipeListItem,
        "category" | "categoryPosition" | "loveCount"
      > & { category: { name: string; position: number } | null })[]).map((recipe) => ({
        ...recipe,
        category: recipe.category?.name ?? null,
        categoryPosition: recipe.category?.position ?? null,
        loveCount: recipe.reactions?.filter((reaction) => reaction.type === "love").length ?? 0,
      }));

      setRecipes(nextRecipes);
      setFavoriteIds(new Set(favoriteRows.map((row) => row.recipe_id)));
      setMemberCount(accessSummary?.memberCount ?? 0);
      setBookDescription(bookRes.data?.description?.trim() || null);
      setRecipeAllowance((allowanceRes.data as RecipeAllowanceRow | null) ?? null);
      setUserRole(accessSummary?.role ?? null);
      setCanEffectivelyContribute(accessSummary?.canAddRecipes ?? false);
      setCanInvite(accessSummary?.canInvite ?? false);
      setLoading(false);
    }

    loadRecipes().catch(() => {
      if (active) {
        setMemberCount(0);
        setBookDescription(null);
        setUserRole(null);
        setCanEffectivelyContribute(false);
        setCanInvite(false);
        setRecipeAllowance(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [bookId]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const practicalFiltered = activeFilter
      ? recipes.filter((recipe) => recipeMatchesPracticalFilter(recipe, activeFilter))
      : recipes;

    if (!normalizedQuery) return practicalFiltered;

    return practicalFiltered.filter((recipe) =>
      recipeHaystack(recipe).includes(normalizedQuery)
    );
  }, [activeFilter, query, recipes]);

  const chapters = useMemo(() => {
    return groupRecipesByChapter(filtered, UNCATEGORIZED);
  }, [filtered]);

  const listingChapters = chapters.map((chapter) => ({ ...chapter, recipes: chapter.recipes.map((recipe) => ({ id: recipe.id, title: recipe.title, meta: `${recipeMeta(recipe) || "Family recipe"} · Added ${formatAddedDate(recipe.created_at)}`, favorite: favoriteIds.has(recipe.id), loveCount: recipe.loveCount })) }));
  const showContents = !loading && filtered.length > 0;
  const activeFilterDetails = activeFilter ? PRACTICAL_FILTERS[activeFilter] : null;
  const recipeSummary = recipeAllowance?.is_free
    ? `${recipeAllowance.used} of ${recipeAllowance.recipe_limit ?? 50} recipes · ${chapters.length || 0} ${chapters.length === 1 ? "chapter" : "chapters"}`
    : `${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"} across ${chapters.length || 0} ${chapters.length === 1 ? "chapter" : "chapters"}`;
  const canAddRecipes = canContribute(userRole) && canEffectivelyContribute;
  const canManageBookMembers = canView(userRole);
  const canOpenBookSettings = canView(userRole);
  const toolbarActionCount = [canAddRecipes, canInvite, canManageBookMembers, canOpenBookSettings].filter(Boolean).length;

  useEffect(() => {
    if (loading) return;

    // On a refresh (or a browser Back navigation), the native hash jump happens
    // before the async recipe list has rendered its chapter elements. Retry it
    // once the chapters exist, and also support later native hash changes.
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

  function closeContents() {
    setIsContentsOpen(false);
  }

  function scrollToChapter(category: string) {
    const id = chapterId(category);
    // Let the browser own the hash history entry. Manually calling pushState or
    // replaceState here prevents Next from restoring the list route on Back.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Native hash history preserves chapter Back navigation.
    if (window.location.hash !== `#${id}`) window.location.assign(`#${id}`);

    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }

  function handleChapterIndexClick(
    event: MouseEvent<HTMLAnchorElement>,
    category: string,
    closeDrawer = false
  ) {
    if (closeDrawer) {
      event.preventDefault();
      closeContents();
      window.requestAnimationFrame(() => scrollToChapter(category));
    }
  }

  function handleRecipeOpen(event: MouseEvent<HTMLAnchorElement>, recipeId: string) {
    // Preserve normal browser behavior for a new tab/window, but make the
    // ordinary click carry an explicit return destination. This avoids relying
    // on App Router restoration of a hash-only history update.
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    router.push(
      `/app/books/${bookId}/recipes/${recipeId}?returnTo=${encodeURIComponent(returnTo)}`
    );
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
                    <ChapterIndex chapters={listingChapters} onSelect={(event, category) => handleChapterIndexClick(event, category, true)} />
                  </nav>

                </>
              ),
            }
          : undefined
      }
    >
      <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-5 lg:px-8">
        <header className="mb-7 border-b border-line-soft pb-6">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">Cookbook</p>
            <h1
              className="text-4xl font-bold leading-tight text-green-deep lg:text-5xl"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              <BookName />
            </h1>
            {bookDescription && (
              <p className="mt-3 max-w-2xl whitespace-pre-line break-words text-base leading-relaxed text-ink-muted">
                {bookDescription}
              </p>
            )}
            <div className="mt-2 flex max-w-2xl flex-wrap items-center gap-x-2 text-sm leading-relaxed text-ink-muted">
              <span>{activeFilterDetails ? activeFilterDetails.description : recipeSummary}</span>
              {!loading && canView(userRole) && (
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden="true" className="text-line">|</span>
                  <BookMembersDrawer key={bookId} bookId={bookId} memberCount={memberCount} />
                </span>
              )}
            </div>
            {activeFilterDetails && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-sm bg-green-deep px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-ink-inverse">
                  {activeFilterDetails.label}
                </span>
                <Link href={`/app/books/${bookId}/recipes`} className="text-sm font-bold text-green-deep hover:underline">
                  View all recipes
                </Link>
              </div>
            )}
          </div>

          <div
            className={`mt-6 rounded-lg border border-line-soft bg-card/75 p-3 shadow-[var(--shadow-paper)] ${showContents ? "pr-8 lg:pr-3" : ""}`}
            role="toolbar"
            aria-label="Cookbook actions"
          >
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
                  strokeWidth={1.75}
                />
                <input
                  aria-label="Search cookbook contents"
                  className="input-cookbook h-12 w-full text-sm"
                  style={{ paddingLeft: "2.25rem" }}
                  placeholder="Search the contents..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {toolbarActionCount > 0 && (
                <div
                  className={[
                    toolbarActionCount === 1 ? "grid-cols-1" : "",
                    toolbarActionCount === 2 ? "grid-cols-2" : "",
                    toolbarActionCount === 3 ? "grid-cols-3" : "",
                    toolbarActionCount >= 4 ? "grid-cols-4" : "",
                    "grid gap-1 sm:gap-2 xl:flex xl:w-auto xl:shrink-0",
                  ].join(" ")}
                >
                  {canAddRecipes && (
                    <Link href={`/app/books/${bookId}/recipes/new`} className="min-w-0" aria-label="Add Recipe">
                      <Button variant="primary" size="md" className="h-16 w-full flex-col gap-1 rounded-md px-1 text-xs sm:h-12 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm xl:w-auto">
                        <Plus size={17} /> <span className="sm:hidden">Add</span><span className="hidden sm:inline">Add Recipe</span>
                      </Button>
                    </Link>
                  )}
                  {canInvite && (
                    <Link href={`/app/books/${bookId}/members/add`} className="min-w-0">
                      <Button variant="secondary" size="md" className="h-16 w-full flex-col gap-1 rounded-md border-transparent bg-transparent px-1 text-xs sm:h-12 sm:flex-row sm:gap-2 sm:border-line sm:bg-card sm:px-3 sm:text-sm xl:w-auto">
                        <Share2 size={17} /> <span>Share</span>
                      </Button>
                    </Link>
                  )}
                  {canManageBookMembers && (
                    <Link href={`/app/books/${bookId}/members`} className="min-w-0">
                      <Button variant="secondary" size="md" className="h-16 w-full flex-col gap-1 rounded-md border-transparent bg-transparent px-1 text-xs sm:h-12 sm:flex-row sm:gap-2 sm:border-line sm:bg-card sm:px-3 sm:text-sm xl:w-auto">
                        <Users size={17} /> <span>Members</span>
                      </Button>
                    </Link>
                  )}
                  {canOpenBookSettings && (
                    <Link href={`/app/books/${bookId}/settings`} className="min-w-0" aria-label="Book Settings">
                      <Button variant="secondary" size="md" className="h-16 w-full flex-col gap-1 rounded-md border-transparent bg-transparent px-1 text-xs sm:h-12 sm:flex-row sm:gap-2 sm:border-line sm:bg-card sm:px-3 sm:text-sm xl:w-auto">
                        <Settings size={17} /> <span className="sm:hidden">Settings</span><span className="hidden sm:inline">Book Settings</span>
                      </Button>
                    </Link>
                  )}
                </div>
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
            title={query || activeFilterDetails ? "No matching recipes" : "Your first recipe belongs here"}
            description={
              query || activeFilterDetails
                ? "Try another search term or browse the full recipe list."
                : "Start with one recipe you already know you will want to find again."
            }
            action={
              !query ? (
                <div className="flex flex-wrap justify-center gap-3">
                  {canAddRecipes && (
                    <Link href={`/app/books/${bookId}/recipes/new`}>
                      <Button variant="primary" size="sm">
                        <Plus size={14} /> Add a recipe
                      </Button>
                    </Link>
                  )}
                  {canManageBookMembers && (
                    <Link href={`/app/books/${bookId}/members`}>
                      <Button variant="secondary" size="sm">
                        <Users size={14} /> Members
                      </Button>
                    </Link>
                  )}
                  {canOpenBookSettings && (
                    <Link href={`/app/books/${bookId}/settings`}>
                      <Button variant="secondary" size="sm">
                        <Settings size={14} /> Book settings
                      </Button>
                    </Link>
                  )}
                </div>
              ) : undefined
            }
          />
        ) : (
          <ChapterListing chapters={listingChapters} recipeHref={(id) => `/app/books/${bookId}/recipes/${id}`} onRecipeOpen={handleRecipeOpen} onChapterSelect={handleChapterIndexClick} />
        )}
      </div>
    </AppShell>
  );
}
