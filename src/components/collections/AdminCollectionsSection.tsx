"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ArrowUpRight, Library, Search } from "lucide-react";
import { Badge, BookCoverArt, Button, Card, EmptyState, Input } from "@/components/ui";
import { resolveCoverColor } from "@/lib/bookCovers";

export type AdminCollectionBook = {
  id: string;
  title: string;
  coverStyle: string | null;
  configured: boolean;
  published: boolean;
};

type PublicationFilter = "all" | "published" | "unpublished";

const filters: { value: PublicationFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "unpublished", label: "Not published" },
];

export function AdminCollectionsSection({
  books,
  error = false,
}: {
  books: AdminCollectionBook[];
  error?: boolean;
}) {
  const headingId = useId();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PublicationFilter>("all");
  const publishedCount = books.filter((book) => book.published).length;
  const visibleBooks = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return books
      .filter((book) => (
        (filter === "all" || book.published === (filter === "published"))
        && book.title.toLocaleLowerCase().includes(search)
      ))
      .sort((a, b) => Number(b.published) - Number(a.published) || a.title.localeCompare(b.title));
  }, [books, query, filter]);

  function clearFilters() {
    setQuery("");
    setFilter("all");
  }

  return (
    <section className="mb-6" aria-labelledby={headingId}>
      <Card padded={false} className="overflow-hidden">
        <div className="px-4 pb-4 pt-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id={headingId}
              className="text-2xl font-bold leading-tight text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Home Cooked collections
            </h2>
            {!error && <Badge variant="sage">{publishedCount} published</Badge>}
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">
            Publish a free cookbook or manage one you’ve shared.
          </p>

          {!error && books.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="w-full sm:max-w-xs">
                <Input
                  type="search"
                  aria-label="Find a cookbook"
                  placeholder="Find a cookbook"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  rightElement={<Search size={17} aria-hidden="true" className="text-ink-soft" />}
                  className="min-h-11 py-2 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by publication status">
                {filters.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={filter === option.value}
                    onClick={() => setFilter(option.value)}
                    className="min-h-11 whitespace-nowrap aria-pressed:bg-green-pale aria-[pressed=false]:text-ink-muted"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error ? (
          <div role="alert" className="border-t border-line-soft px-4 py-5 sm:px-6">
            <p className="text-sm text-ink-muted">Your cookbooks couldn’t be loaded. Reload the page to try again.</p>
            <a
              href="/app/admin"
              className="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-green-deep underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-deep"
            >
              Reload page
            </a>
          </div>
        ) : books.length === 0 ? (
          <EmptyState
            icon={<Library size={26} aria-hidden="true" className="text-green-sage" />}
            title="Start with a cookbook"
            description="Create a cookbook of your own, then choose when to share it as a free collection."
            className="border-t border-line-soft !py-8"
            action={(
              <Link
                href="/onboarding/create-book"
                className="inline-flex min-h-11 items-center text-sm font-bold text-green-deep underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-deep"
              >
                Create a cookbook
              </Link>
            )}
          />
        ) : (
          <>
            <p className="sr-only" role="status">
              {visibleBooks.length} {visibleBooks.length === 1 ? "cookbook" : "cookbooks"} shown.
            </p>
            {visibleBooks.length > 0 ? (
              <ul className="grid gap-px border-t border-line-soft bg-line-soft sm:grid-cols-2">
                {visibleBooks.map((book) => (
                  <li key={book.id} className="min-w-0 bg-card">
                    <Link
                      href={`/app/admin/books/${book.id}#home-cooked-collection`}
                      aria-label={`${book.configured ? "Manage" : "Set up"} collection: ${book.title}`}
                      className="group flex h-full min-h-28 items-center gap-4 bg-card p-4 transition-colors hover:bg-green-pale focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-green-deep"
                    >
                      <BookCoverArt
                        title={book.title}
                        seed={book.id}
                        color={resolveCoverColor(book.coverStyle, book.id)}
                        className="w-14 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 break-words text-base font-bold leading-snug text-green-deep">
                          {book.title}
                        </span>
                        <Badge variant={book.published ? "sage" : "family"} className="mt-1 px-2 text-[11px]">
                          {book.published ? "Published" : "Not published"}
                        </Badge>
                      </span>
                      <ArrowUpRight
                        size={17}
                        aria-hidden="true"
                        className="shrink-0 text-ink-soft motion-safe:transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5 group-hover:text-green-deep"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<Search size={26} aria-hidden="true" className="text-green-sage" />}
                title="No matching cookbooks"
                description="Try another title or clear your filters to see all your cookbooks."
                className="border-t border-line-soft !py-8"
                action={<Button type="button" variant="secondary" size="sm" className="min-h-11" onClick={clearFilters}>Clear filters</Button>}
              />
            )}
          </>
        )}
      </Card>
    </section>
  );
}
