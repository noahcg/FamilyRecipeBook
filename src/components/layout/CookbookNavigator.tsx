"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { clsx } from "clsx";
import { ChevronRight, Library, Plus, X } from "lucide-react";
import { BookCoverArt } from "@/components/ui";
import { resolveCoverColor } from "@/lib/bookCovers";
import { getCookbookNavData, setDefaultBook, type CookbookNavItem } from "@/lib/actions/books";

interface NavData {
  books: CookbookNavItem[];
  defaultBookId: string | null;
}

// Module-level cache so the list survives the per-page AppShell remounts
// without a refetch flash on every navigation.
let navCache: NavData | null = null;

interface CookbookNavigatorProps {
  currentBookId: string | null;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

/**
 * A single "Bookshelf" button that opens a one-level flyout listing the user's
 * cookbooks. Choosing a cookbook makes it the active (default) book and opens
 * its recipe table of contents — there is no deeper drill-down in the nav.
 */
export function CookbookNavigator({
  currentBookId,
  mobileOpen,
  onMobileOpenChange,
}: CookbookNavigatorProps) {
  const [data, setData] = useState<NavData | null>(navCache);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

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

  // Dismiss the desktop flyout on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || flyoutRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const books = data?.books ?? [];
  const activeBookId = currentBookId ?? data?.defaultBookId ?? null;
  const activeBook = books.find((b) => b.id === activeBookId) ?? null;

  const select = useCallback((bookId: string) => {
    setDefaultBook(bookId).catch(() => {});
    if (navCache) navCache = { ...navCache, defaultBookId: bookId };
    setData((prev) => (prev ? { ...prev, defaultBookId: bookId } : prev));
  }, []);

  function renderList(onNavigate: () => void) {
    return (
      <div className="space-y-1.5 pt-1">
        {books.map((book) => {
          const isActive = activeBookId === book.id;
          return (
            <Link
              key={book.id}
              href={`/app/books/${book.id}/recipes`}
              onClick={() => {
                select(book.id);
                onNavigate();
              }}
              aria-current={isActive ? "true" : undefined}
              className={clsx(
                "flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border px-3 py-2.5 transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-px",
                isActive
                  ? "border-green-sage/40 bg-green-soft/80 shadow-xs"
                  : "border-transparent bg-white-soft/45 hover:border-green-sage/30 hover:bg-green-pale/75 hover:shadow-xs"
              )}
            >
              <span className="block w-9 shrink-0 overflow-hidden">
                <BookCoverArt
                  title={book.title}
                  seed={book.id}
                  color={resolveCoverColor(book.cover_style, book.id)}
                  className="w-9 shrink-0"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-green-deep">{book.title}</span>
                <span className="block truncate text-xs font-semibold text-ink-soft">
                  {book.recipeCount} {book.recipeCount === 1 ? "recipe" : "recipes"}
                </span>
              </span>
            </Link>
          );
        })}

        <Link
          href="/onboarding/create-book"
          onClick={onNavigate}
          className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-green-sage/55 bg-paper-warm/70 px-3 py-2.5 text-sm font-bold text-green-deep transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px hover:border-green-sage hover:bg-green-pale"
        >
          <Plus size={15} /> New Cookbook
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* The single Bookshelf button (desktop rail). */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-ink transition-colors hover:bg-green-soft/55 hover:text-green-deep"
      >
        <Library size={18} strokeWidth={1.75} />
        <span className="min-w-0 flex-1 truncate text-left">Bookshelf</span>
        <ChevronRight size={16} className="shrink-0 text-ink-soft" />
      </button>

      {/* Active cookbook indicator — which book you're currently viewing. */}
      {activeBook && (
        <div className="mb-6 mt-3">
          <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft/70">Viewing</p>
          <Link
            href={`/app/books/${activeBook.id}/recipes`}
            className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-md border border-line-soft bg-white-soft/60 px-3 py-2.5 transition-colors hover:border-green-sage/40 hover:bg-green-pale"
          >
            <span className="block w-7 shrink-0 overflow-hidden">
              <BookCoverArt
                title={activeBook.title}
                seed={activeBook.id}
                color={resolveCoverColor(activeBook.cover_style, activeBook.id)}
                className="w-7 shrink-0"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-green-deep">{activeBook.title}</span>
              <span className="block truncate text-xs font-semibold text-ink-soft">
                {activeBook.recipeCount} {activeBook.recipeCount === 1 ? "recipe" : "recipes"}
              </span>
            </span>
          </Link>
        </div>
      )}

      {/* One-level flyout: the cookbook list. */}
      {open && (
        <div
          ref={flyoutRef}
          className="bookshelf-flyout-anim fixed bottom-4 left-[300px] top-4 z-50 hidden w-[324px] lg:flex"
        >
          <div className="relative flex min-h-0 w-full flex-col overflow-hidden rounded-r-lg border border-line bg-card shadow-[0_28px_70px_rgba(31,58,45,0.24)]">
            <div className="bookshelf-top-wash pointer-events-none absolute inset-x-0 top-0 h-24" />
            <div className="relative flex items-center justify-between gap-3 border-b border-line-soft px-4 py-4">
              <div className="min-w-0">
                <h2
                  className="truncate text-xl font-bold leading-tight text-green-deep"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Your Cookbooks
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line-soft bg-white-soft/80 text-ink-soft transition-colors hover:bg-white-soft hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
            <div className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3.5">{renderList(() => setOpen(false))}</div>
          </div>
        </div>
      )}

      {/* Mobile: the same list in a drawer, portaled out of the hidden rail. */}
      {mobileOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close bookshelf menu"
              className="drawer-backdrop-anim absolute inset-0 bg-ink/18"
              onClick={() => onMobileOpenChange(false)}
            />
            <section className="bookshelf-drawer-anim relative ml-auto flex h-full w-[min(88vw,380px)] flex-col overflow-hidden rounded-l-lg border-l border-line-soft bg-card shadow-[-24px_0_60px_rgba(31,58,45,0.22)]">
              <div className="bookshelf-top-wash pointer-events-none absolute inset-x-0 top-0 h-28" />
              <div className="relative flex items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
                <div className="min-w-0">
                  <h2
                    className="truncate text-2xl font-bold leading-tight text-green-deep"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    Your Cookbooks
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => onMobileOpenChange(false)}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line-soft bg-white-soft/85 text-green-deep shadow-xs transition-colors hover:bg-white-soft"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3.5">
                {renderList(() => onMobileOpenChange(false))}
              </div>
            </section>
          </div>,
          document.body
        )}
    </>
  );
}
