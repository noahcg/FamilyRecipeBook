"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Library, Plus, Search } from "lucide-react";
import { Button, CookbookIcon, EmptyState, Input } from "@/components/ui";
import { useAccount } from "@/lib/context/AccountContext";
import type { CookbookNavItem } from "@/lib/actions/books";
import { resolveCoverColor } from "@/lib/bookCovers";

interface BookshelfPageProps {
  books: CookbookNavItem[];
}

function createHref(plan: "free" | "plus", books: CookbookNavItem[]) {
  return plan === "plus" || !books.some((book) => book.isOwned)
    ? "/onboarding/create-book"
    : "/pricing";
}

export function BookshelfPage({ books }: BookshelfPageProps) {
  const { plan } = useAccount();
  const [query, setQuery] = useState("");
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      setColumns(width >= 1536 ? 4 : width >= 768 ? 3 : width >= 420 ? 2 : 1);
    };
    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleBooks = useMemo(
    () => books.filter((book) => book.title.toLocaleLowerCase().includes(normalizedQuery)),
    [books, normalizedQuery]
  );
  const totalRecipes = books.reduce((total, book) => total + book.recipeCount, 0);
  const newCookbookHref = createHref(plan, books);
  const newCookbookLabel = "New Cookbook";
  const shelfRows = useMemo(
    () => Array.from({ length: Math.ceil(visibleBooks.length / columns) }, (_, index) => visibleBooks.slice(index * columns, index * columns + columns)),
    [columns, visibleBooks]
  );

  return (
    <div className="min-h-dvh px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <header className="border-b border-line-soft pb-6 sm:pb-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent-cinnamon">
              Your cookbooks
            </p>
            <h1
              className="mt-2 text-4xl font-bold leading-none text-green-deep sm:text-5xl"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              My Bookshelf
            </h1>
            <p className="mt-3 text-sm font-semibold text-ink-muted sm:text-base">
              {books.length} {books.length === 1 ? "cookbook" : "cookbooks"} • {totalRecipes} {totalRecipes === 1 ? "recipe" : "recipes"}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <Input
              label="Search cookbooks"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your cookbooks"
              className="h-12 min-w-0 sm:w-[260px]"
              rightElement={<Search size={18} className="text-ink-soft" aria-hidden="true" />}
            />
            <Link href={newCookbookHref} className="shrink-0 sm:self-end">
              <Button type="button" className="w-full sm:w-auto">
                <Plus size={18} aria-hidden="true" /> {newCookbookLabel}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="pt-9 sm:pt-11" aria-label="Cookbooks">
        {books.length === 0 ? (
          <EmptyState
            icon={<Library size={28} strokeWidth={1.5} className="text-green-sage" aria-hidden="true" />}
            title="Your bookshelf is waiting for its first cookbook."
            description="Start a collection for the recipes and stories your family returns to most."
            action={
              <Link href={newCookbookHref}>
                <Button type="button"><Plus size={17} aria-hidden="true" /> {newCookbookLabel}</Button>
              </Link>
            }
            className="min-h-[320px]"
          />
        ) : visibleBooks.length === 0 ? (
          <EmptyState
            title="No cookbooks match that search."
            description="Try a different title, or clear the search to see your whole shelf."
            action={<Button type="button" variant="secondary" onClick={() => setQuery("")}>Clear search</Button>}
            className="min-h-[320px]"
          />
        ) : (
          <div className="space-y-9 sm:space-y-11">
            {shelfRows.map((row) => (
              <div
                key={row.map((book) => book.id).join("-")}
                className="relative grid grid-cols-1 gap-x-5 pb-3 min-[420px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4"
              >
                {row.map((book) => (
                  <div key={book.id} className="flex min-w-0 flex-col justify-end">
                <Link
                  href={`/app/books/${book.id}/recipes`}
                  aria-label={`Open ${book.title}, ${book.recipeCount} ${book.recipeCount === 1 ? "recipe" : "recipes"}`}
                  className="group relative mx-auto flex aspect-[4/5] w-full max-w-[200px] flex-col overflow-visible rounded-[var(--radius-md)] bg-[var(--book-color)] text-ink-inverse shadow-sm transition-shadow duration-200 hover:shadow-lg focus-visible:shadow-lg after:pointer-events-none after:absolute after:inset-0 after:rounded-[var(--radius-md)] after:bg-white/0 after:transition-colors after:duration-200 hover:after:bg-white/[0.1]"
                  style={{ "--book-color": resolveCoverColor(book.cover_style, book.id) } as React.CSSProperties}
                >
                  <span className="absolute inset-y-0 left-0 w-[17%] rounded-l-[var(--radius-md)] bg-black/15 shadow-[inset_-1px_0_0_rgba(255,255,255,0.12),inset_7px_0_10px_rgba(0,0,0,0.12)]" aria-hidden="true" />
                  <span className="absolute inset-y-0 left-[17%] w-px bg-white/20" aria-hidden="true" />
                  <span className="absolute left-[calc(17%+1px)] top-0 h-12 w-7 bg-accent-mustard shadow-[inset_-2px_0_0_rgba(0,0,0,0.14)]" aria-hidden="true" />
                  <span className="absolute left-[calc(17%+1px)] top-11 h-3 w-7 bg-accent-mustard [clip-path:polygon(0_0,50%_65%,100%_0,100%_100%,0_100%)]" aria-hidden="true" />

                  <span className="relative flex flex-1 -translate-y-2 translate-x-[8.5%] flex-col items-center px-7 pb-20 pt-15 text-center">
                    <span className="text-[11px] font-extrabold tracking-[0.18em] text-ink-inverse/80">
                      {getInitials(book.title)}
                    </span>
                    <span
                      className="my-auto text-balance font-bold leading-tight text-ink-inverse [font-family:var(--font-playfair)] text-[clamp(1.25rem,2vw,1.7rem)]"
                      style={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 3,
                        overflow: "hidden",
                      }}
                    >
                      {book.title}
                    </span>
                    <span className="absolute bottom-5 left-0 right-0 flex flex-col items-center">
                      <CookbookIcon name={book.icon} size={22} strokeWidth={1.5} className="!text-ink-inverse/80" />
                      <span className="mt-3 text-xs font-bold text-ink-inverse/85">
                        {book.recipeCount} {book.recipeCount === 1 ? "recipe" : "recipes"}
                      </span>
                    </span>
                  </span>
                </Link>
                  </div>
                ))}
                <div className="absolute inset-x-0 bottom-0 h-3 rounded-b-sm border-t border-accent-honey/70 bg-accent-cinnamon shadow-[0_3px_4px_rgba(75,53,31,0.18),inset_0_1px_0_rgba(255,252,246,0.42)]" aria-hidden="true" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function getInitials(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "?";
  return words
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, "")[0])
    .filter(Boolean)
    .slice(0, 3)
    .join("")
    .toUpperCase() || "?";
}
