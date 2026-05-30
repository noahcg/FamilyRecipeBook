"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Library,
  Plus,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { BookCoverArt } from "@/components/ui";
import { resolveCoverColor } from "@/lib/bookCovers";
import {
  getCookbookNavData,
  setDefaultBook,
  type CookbookNavItem,
} from "@/lib/actions/books";
import {
  getCategoryRecipes,
  getCookbookCategories,
  type CookbookCategoryNav,
} from "@/lib/actions/recipes";

interface NavData {
  books: CookbookNavItem[];
  defaultBookId: string | null;
}

interface CategoryRecipe {
  id: string;
  title: string;
  photo_url: string | null;
  cook_minutes: number | null;
}

type CategoryEntry = { total: number; categories: CookbookCategoryNav[] };

// Module-level cache so the navigator data survives the per-page AppShell
// remounts without a flash or a refetch on every navigation.
let navCache: NavData | null = null;

function categoryKey(bookId: string, categoryId: string | null) {
  return `${bookId}::${categoryId ?? "_uncat_"}`;
}

function recipesHref(bookId: string, categoryId: string | null) {
  return categoryId
    ? `/app/books/${bookId}/recipes?category=${categoryId}`
    : `/app/books/${bookId}/recipes`;
}

const PANEL_CLASS =
  "flex max-h-[min(70vh,560px)] w-[280px] flex-col overflow-y-auto border-l border-line-soft bg-card first:border-l-0";

function BookThumb({ book, className }: { book: CookbookNavItem; className: string }) {
  return (
    <BookCoverArt
      title={book.title}
      seed={book.id}
      color={resolveCoverColor(book.cover_style, book.id)}
      className={className}
    />
  );
}

// ── Presentational lists (shared by desktop flyout + mobile drawer) ──
function CategoryList({
  entry,
  selectedCategoryId,
  onHover,
  onOpen,
}: {
  entry?: CategoryEntry;
  selectedCategoryId?: string | null;
  onHover: (category: CookbookCategoryNav) => void;
  onOpen: (category: CookbookCategoryNav) => void;
}) {
  if (!entry) return <p className="px-3 py-4 text-sm text-ink-soft">Loading…</p>;
  if (entry.categories.length === 0) {
    return <p className="px-3 py-4 text-sm text-ink-soft">No recipes yet.</p>;
  }
  return (
    <ul className="py-1">
      {entry.categories.map((category) => {
        const isActive = selectedCategoryId !== undefined && selectedCategoryId === category.id;
        return (
          <li key={category.id ?? "_uncat_"}>
            <button
              type="button"
              onMouseEnter={() => onHover(category)}
              onFocus={() => onHover(category)}
              onClick={() => onOpen(category)}
              className={clsx(
                "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
                isActive
                  ? "bg-green-soft/70 text-green-deep"
                  : "text-ink hover:bg-green-soft/55 hover:text-green-deep"
              )}
            >
              <UtensilsCrossed size={15} strokeWidth={1.75} className="shrink-0 text-green-sage" />
              <span className="min-w-0 flex-1 truncate font-medium">{category.name}</span>
              <span className="shrink-0 text-xs font-semibold text-ink-soft">{category.count}</span>
              <ChevronRight size={14} className="shrink-0 text-ink-soft" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function RecipeList({
  rows,
  bookId,
  onNavigate,
}: {
  rows?: CategoryRecipe[];
  bookId: string;
  onNavigate: () => void;
}) {
  if (!rows) return <p className="px-3 py-4 text-sm text-ink-soft">Loading…</p>;
  if (rows.length === 0) return <p className="px-3 py-4 text-sm text-ink-soft">No recipes here yet.</p>;
  return (
    <ul className="py-1">
      {rows.map((recipe) => (
        <li key={recipe.id}>
          <Link
            href={`/app/books/${bookId}/recipes/${recipe.id}`}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink transition-colors hover:bg-green-soft/55 hover:text-green-deep"
          >
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-green-pale">
              {recipe.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={recipe.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <UtensilsCrossed size={15} className="text-green-sage" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{recipe.title}</span>
              {recipe.cook_minutes ? (
                <span className="flex items-center gap-1 text-xs text-ink-soft">
                  <Clock size={11} /> {recipe.cook_minutes} min
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ColumnHeader({
  title,
  viewAllHref,
  onViewAll,
}: {
  title: string;
  viewAllHref: string;
  onViewAll: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line-soft px-3 py-3">
      <p
        className="min-w-0 truncate text-base font-bold text-green-deep"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        {title}
      </p>
      <Link href={viewAllHref} onClick={onViewAll} className="shrink-0 text-xs font-bold text-green-deep hover:underline">
        View all
      </Link>
    </div>
  );
}

interface CookbookNavigatorProps {
  currentBookId: string | null;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export function CookbookNavigator({
  currentBookId,
  mobileOpen,
  onMobileOpenChange,
}: CookbookNavigatorProps) {
  const router = useRouter();
  const [data, setData] = useState<NavData | null>(navCache);

  // Desktop flyout state.
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"all" | "book">("all");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<{ bookId: string; categoryId: string | null } | null>(null);
  const [flyoutTop, setFlyoutTop] = useState(16);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  // Lazy caches for categories + recipes, shared with the mobile drawer.
  const [catCache, setCatCache] = useState<Record<string, CategoryEntry>>({});
  const [recipeCache, setRecipeCache] = useState<Record<string, CategoryRecipe[]>>({});

  const activeBookId = currentBookId ?? data?.defaultBookId ?? null;
  const activeBook = data?.books.find((b) => b.id === activeBookId) ?? null;
  const books = data?.books ?? [];

  useEffect(() => {
    let active = true;
    if (!navCache) {
      getCookbookNavData()
        .then((result) => {
          navCache = result;
          if (active) setData(result);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, []);

  const loadCategories = useCallback((bookId: string) => {
    setCatCache((prev) => {
      if (prev[bookId]) return prev;
      getCookbookCategories(bookId)
        .then((result) => setCatCache((p) => ({ ...p, [bookId]: result })))
        .catch(() => {});
      return prev;
    });
  }, []);

  const loadRecipes = useCallback((bookId: string, categoryId: string | null) => {
    const key = categoryKey(bookId, categoryId);
    setRecipeCache((prev) => {
      if (prev[key]) return prev;
      getCategoryRecipes(bookId, categoryId)
        .then((result) => setRecipeCache((p) => ({ ...p, [key]: result })))
        .catch(() => {});
      return prev;
    });
  }, []);

  const closeDesktop = useCallback(() => {
    setOpen(false);
    setSelectedCat(null);
  }, []);

  const openDesktop = useCallback(() => {
    const top = triggerRef.current?.getBoundingClientRect().top ?? 16;
    setFlyoutTop(Math.max(16, Math.min(top, window.innerHeight - 120)));
    setSelectedCat(null);
    if (activeBook) {
      setView("book");
      setSelectedBookId(activeBook.id);
      loadCategories(activeBook.id);
    } else {
      setView("all");
      setSelectedBookId(null);
    }
    setOpen(true);
  }, [activeBook, loadCategories]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDesktop();
    }
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || flyoutRef.current?.contains(t)) return;
      closeDesktop();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, closeDesktop]);

  const handleSelectBook = useCallback(
    (bookId: string) => {
      setDefaultBook(bookId).catch(() => {});
      if (navCache) navCache = { ...navCache, defaultBookId: bookId };
      setData((prev) => (prev ? { ...prev, defaultBookId: bookId } : prev));
      closeDesktop();
      onMobileOpenChange(false);
      router.push(`/app/books/${bookId}`);
    },
    [router, closeDesktop, onMobileOpenChange]
  );

  function hoverBook(bookId: string) {
    setSelectedBookId(bookId);
    setSelectedCat(null);
    loadCategories(bookId);
  }

  function hoverCategory(bookId: string, categoryId: string | null) {
    setSelectedCat({ bookId, categoryId });
    loadRecipes(bookId, categoryId);
  }

  const closeAll = useCallback(() => {
    closeDesktop();
    onMobileOpenChange(false);
  }, [closeDesktop, onMobileOpenChange]);

  return (
    <>
      {/* ── Desktop rail trigger ─────────────────────────────── */}
      {activeBook ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? closeDesktop() : openDesktop())}
          aria-expanded={open}
          className="flex w-full items-center gap-3 rounded-md border border-line-soft bg-white-soft/60 px-3 py-2.5 text-left transition-colors hover:border-green-sage/40 hover:bg-green-pale"
        >
          <BookThumb book={activeBook} className="w-7" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-green-deep">{activeBook.title}</span>
            <span className="block text-xs font-semibold text-ink-soft">
              {activeBook.recipeCount} {activeBook.recipeCount === 1 ? "recipe" : "recipes"}
            </span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-ink-soft" />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? closeDesktop() : openDesktop())}
          aria-expanded={open}
          className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-ink transition-colors hover:bg-green-soft/55 hover:text-green-deep"
        >
          <Library size={18} strokeWidth={1.75} />
          <span className="min-w-0 flex-1 truncate text-left">Cookbooks</span>
          <ChevronRight size={16} className="shrink-0 text-ink-soft" />
        </button>
      )}

      {/* ── Desktop cascading flyout ─────────────────────────── */}
      {open && (
        <div
          ref={flyoutRef}
          className="fixed left-[300px] z-50 hidden overflow-hidden rounded-xl border border-line bg-card shadow-[0_24px_60px_rgba(31,58,45,0.22)] lg:flex"
          style={{ top: flyoutTop }}
        >
          {view === "all" ? (
            <>
              {/* Column A — all cookbooks */}
              <div className={PANEL_CLASS}>
                <div className="flex items-center justify-between gap-2 border-b border-line-soft px-3 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">All Cookbooks</p>
                  <button type="button" aria-label="Close" onClick={closeDesktop} className="text-ink-soft hover:text-ink">
                    <X size={16} />
                  </button>
                </div>
                <Link
                  href="/onboarding/create-book"
                  onClick={closeDesktop}
                  className="mx-2 mt-2 flex items-center gap-2 rounded-md border border-dashed border-green-sage/50 px-3 py-2 text-sm font-bold text-green-deep transition-colors hover:bg-green-pale"
                >
                  <Plus size={15} /> New Cookbook
                </Link>
                <ul className="py-2">
                  {books.map((book) => (
                    <li key={book.id}>
                      <button
                        type="button"
                        onMouseEnter={() => hoverBook(book.id)}
                        onFocus={() => hoverBook(book.id)}
                        onClick={() => handleSelectBook(book.id)}
                        className={clsx(
                          "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                          selectedBookId === book.id ? "bg-green-soft/60" : "hover:bg-green-soft/45"
                        )}
                      >
                        <BookThumb book={book} className="w-7" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-green-deep">{book.title}</span>
                          <span className="block text-xs font-semibold text-ink-soft">
                            {book.recipeCount} {book.recipeCount === 1 ? "recipe" : "recipes"}
                          </span>
                        </span>
                        <ChevronRight size={14} className="shrink-0 text-ink-soft" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column B — selected cookbook's categories */}
              {selectedBookId && (
                <div className={PANEL_CLASS}>
                  <ColumnHeader
                    title={books.find((b) => b.id === selectedBookId)?.title ?? "Cookbook"}
                    viewAllHref={recipesHref(selectedBookId, null)}
                    onViewAll={closeDesktop}
                  />
                  <CategoryList
                    entry={catCache[selectedBookId]}
                    selectedCategoryId={selectedCat?.bookId === selectedBookId ? selectedCat.categoryId : undefined}
                    onHover={(c) => hoverCategory(selectedBookId, c.id)}
                    onOpen={(c) => {
                      closeDesktop();
                      router.push(recipesHref(selectedBookId, c.id));
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            activeBook && (
              <div className={PANEL_CLASS}>
                <div className="flex items-center justify-between gap-2 border-b border-line-soft px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setView("all");
                      setSelectedBookId(null);
                      setSelectedCat(null);
                    }}
                    className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-green-deep hover:underline"
                  >
                    <ArrowLeft size={15} className="shrink-0" />
                    <span className="truncate">All Cookbooks</span>
                  </button>
                  <button type="button" aria-label="Close" onClick={closeDesktop} className="text-ink-soft hover:text-ink">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2.5 border-b border-line-soft px-3 py-2.5">
                  <BookThumb book={activeBook} className="w-7" />
                  <p
                    className="min-w-0 flex-1 truncate text-base font-bold text-green-deep"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {activeBook.title}
                  </p>
                </div>
                <CategoryList
                  entry={catCache[activeBook.id]}
                  selectedCategoryId={selectedCat?.bookId === activeBook.id ? selectedCat.categoryId : undefined}
                  onHover={(c) => hoverCategory(activeBook.id, c.id)}
                  onOpen={(c) => {
                    closeDesktop();
                    router.push(recipesHref(activeBook.id, c.id));
                  }}
                />
                <Link
                  href={recipesHref(activeBook.id, null)}
                  onClick={closeDesktop}
                  className="m-2 rounded-md bg-green-pale px-3 py-2 text-center text-sm font-bold text-green-deep transition-colors hover:bg-green-soft"
                >
                  View all {activeBook.recipeCount} recipes
                </Link>
              </div>
            )
          )}

          {/* Last column — recipes within the hovered category */}
          {selectedCat && (
            <div className={PANEL_CLASS}>
              <ColumnHeader
                title={
                  catCache[selectedCat.bookId]?.categories.find((c) => c.id === selectedCat.categoryId)?.name ??
                  "Recipes"
                }
                viewAllHref={recipesHref(selectedCat.bookId, selectedCat.categoryId)}
                onViewAll={closeDesktop}
              />
              <RecipeList
                rows={recipeCache[categoryKey(selectedCat.bookId, selectedCat.categoryId)]}
                bookId={selectedCat.bookId}
                onNavigate={closeDesktop}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Mobile drawer drill-down (portaled out of the desktop-only rail) ── */}
      {mobileOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <MobileCookbookDrawer
            books={books}
            activeBook={activeBook}
            catCache={catCache}
            recipeCache={recipeCache}
            loadCategories={loadCategories}
            loadRecipes={loadRecipes}
            onSelectBook={handleSelectBook}
            onNavigate={closeAll}
            onClose={() => onMobileOpenChange(false)}
          />,
          document.body
        )}
    </>
  );
}

function MobileCookbookDrawer({
  books,
  activeBook,
  catCache,
  recipeCache,
  loadCategories,
  loadRecipes,
  onSelectBook,
  onNavigate,
  onClose,
}: {
  books: CookbookNavItem[];
  activeBook: CookbookNavItem | null;
  catCache: Record<string, CategoryEntry>;
  recipeCache: Record<string, CategoryRecipe[]>;
  loadCategories: (bookId: string) => void;
  loadRecipes: (bookId: string, categoryId: string | null) => void;
  onSelectBook: (bookId: string) => void;
  onNavigate: () => void;
  onClose: () => void;
}) {
  // Initialized once per open (the drawer only mounts while open): start on the
  // active cookbook's categories when there is one, otherwise the full list.
  const [level, setLevel] = useState<"books" | "categories" | "recipes">(
    activeBook ? "categories" : "books"
  );
  const [book, setBook] = useState<CookbookNavItem | null>(activeBook);
  const [cat, setCat] = useState<CookbookCategoryNav | null>(null);

  useEffect(() => {
    if (activeBook) loadCategories(activeBook.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openBook(next: CookbookNavItem) {
    setBook(next);
    setCat(null);
    setLevel("categories");
    loadCategories(next.id);
  }

  function openCategory(next: CookbookCategoryNav) {
    if (!book) return;
    setCat(next);
    setLevel("recipes");
    loadRecipes(book.id, next.id);
  }

  function back() {
    if (level === "recipes") setLevel("categories");
    else if (level === "categories") {
      setLevel("books");
      setBook(null);
    }
  }

  const title = level === "books" ? "Cookbooks" : level === "categories" ? book?.title : cat?.name;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close cookbooks menu"
        className="absolute inset-0 animate-in fade-in duration-150 bg-ink/18"
        onClick={onClose}
      />
      <section className="relative ml-auto flex h-full w-[min(86vw,360px)] animate-in slide-in-from-right-5 duration-200 flex-col border-l border-line-soft bg-card">
        <div className="flex items-center gap-2 border-b border-line-soft px-4 py-4">
          {level !== "books" && (
            <button
              type="button"
              aria-label="Back"
              onClick={back}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line-soft text-green-deep"
            >
              <ArrowLeft size={17} />
            </button>
          )}
          <h2
            className="min-w-0 flex-1 truncate text-xl font-bold text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line-soft bg-white-soft text-green-deep"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {level === "books" && (
            <>
              <Link
                href="/onboarding/create-book"
                onClick={onClose}
                className="mx-1 mb-1 flex items-center gap-2 rounded-md border border-dashed border-green-sage/50 px-3 py-2.5 text-sm font-bold text-green-deep"
              >
                <Plus size={16} /> New Cookbook
              </Link>
              <ul>
                {books.map((b) => (
                  <li key={b.id} className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => onSelectBook(b.id)}
                      className="flex flex-1 items-center gap-3 rounded-l-md px-3 py-2.5 text-left hover:bg-green-soft/45"
                    >
                      <BookThumb book={b} className="w-8" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-green-deep">{b.title}</span>
                        <span className="block text-xs font-semibold text-ink-soft">
                          {b.recipeCount} {b.recipeCount === 1 ? "recipe" : "recipes"}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Browse ${b.title}`}
                      onClick={() => openBook(b)}
                      className="flex w-11 shrink-0 items-center justify-center rounded-r-md text-ink-soft hover:bg-green-soft/45"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {level === "categories" && book && (
            <>
              <Link
                href={recipesHref(book.id, null)}
                onClick={onNavigate}
                className="mx-1 mb-1 block rounded-md bg-green-pale px-3 py-2.5 text-center text-sm font-bold text-green-deep"
              >
                View all {book.recipeCount} recipes
              </Link>
              <CategoryList entry={catCache[book.id]} onHover={() => {}} onOpen={openCategory} />
            </>
          )}

          {level === "recipes" && book && cat && (
            <RecipeList
              rows={recipeCache[categoryKey(book.id, cat.id)]}
              bookId={book.id}
              onNavigate={onNavigate}
            />
          )}
        </div>
      </section>
    </div>
  );
}
