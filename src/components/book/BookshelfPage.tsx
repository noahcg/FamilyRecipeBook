"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Library, Plus, Search } from "lucide-react";
import { BookCoverArt, Button, CookbookIcon, EmptyState, Input } from "@/components/ui";
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
              <div key={row.map((book) => book.id).join("-")}>
                <div className="grid grid-cols-1 items-end gap-x-5 min-[420px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4">
                  {row.map((book) => (
                    <Link
                      key={book.id}
                      href={`/app/books/${book.id}/recipes`}
                      aria-label={`Open ${book.title}, ${book.recipeCount} ${book.recipeCount === 1 ? "recipe" : "recipes"}`}
                      title={book.title}
                      className="group mx-auto block w-full max-w-[200px] rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-deep"
                    >
                      <span className="relative block transition-transform duration-200 group-hover:-translate-y-1">
                        <BookCoverArt
                          title={book.title}
                          seed={book.id}
                          color={resolveCoverColor(book.cover_style, book.id)}
                          className="w-full"
                        />
                        <span aria-hidden="true" className="absolute bottom-[9%] left-[12%] right-[8%] flex items-center justify-center gap-1 text-[11px] font-semibold text-[#f7ebce]">
                          <CookbookIcon name={book.icon} size={14} strokeWidth={1.5} className="!text-inherit" />
                          {book.recipeCount} {book.recipeCount === 1 ? "recipe" : "recipes"}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
                <div className="relative h-3 rounded-b-sm border-t border-accent-honey/70 bg-accent-cinnamon shadow-[0_3px_4px_rgba(75,53,31,0.18),inset_0_1px_0_rgba(255,252,246,0.42)]" aria-hidden="true" />

              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
