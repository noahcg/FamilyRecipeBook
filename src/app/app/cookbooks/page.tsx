import Link from "next/link";
import { Plus, Search, Star } from "lucide-react";
import { BookCover, type CoverStyle } from "@/components/ui";
import { getUserBooks } from "@/lib/actions/books";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

interface CookbooksPageProps {
  searchParams: Promise<{ q?: string }>;
}

function formatDate(value: string | null) {
  if (!value) return "Recently updated";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function CookbooksPage({ searchParams }: CookbooksPageProps) {
  const [{ q = "" }, user, books, supabase] = await Promise.all([
    searchParams,
    requireUser(),
    getUserBooks(),
    createClient(),
  ]);
  const query = q.trim();
  const { data: settings } = await supabase
    .from("user_settings")
    .select("default_book_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const defaultBookId = settings?.default_book_id ?? null;
  const filteredBooks = query
    ? books.filter((book) => book.title.toLowerCase().includes(query.toLowerCase()))
    : books;

  return (
    <div className="app-paper-bg paper-texture min-h-screen px-4 py-7 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-[1180px]">
        <div className="mb-7 flex flex-col gap-5 border-b border-line-soft pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/app" className="text-sm font-bold text-green-deep hover:underline">
              Back to current cookbook
            </Link>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.08em] text-accent-cinnamon">
              Cookbook shelf
            </p>
            <h1
              className="mt-1 text-4xl font-bold leading-tight text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Choose a cookbook
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Pick the book you want to open. Each cookbook keeps its own recipes, members, and settings.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-xl">
            <form
              action="/app/cookbooks"
              className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full border border-line-soft bg-card/90 px-4 shadow-xs"
            >
              <span className="flex shrink-0 items-center justify-center text-ink-soft">
                <Search size={16} />
              </span>
              <input
                name="q"
                defaultValue={query}
                placeholder="Search cookbooks"
                className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
              />
            </form>
            <Link
              href="/onboarding/create-book"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-green-deep px-5 text-sm font-extrabold text-ink-inverse shadow-xs transition-colors hover:bg-green-forest-dark focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
            >
              <Plus size={17} /> New cookbook
            </Link>
          </div>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line-soft bg-card/70 px-6 py-14 text-center">
            <p className="font-bold text-green-deep">No cookbooks found</p>
            <p className="mt-1 text-sm text-ink-muted">
              Try another search or create a new cookbook.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBooks.map((book) => (
              <Link
                key={book.id}
                href={`/app/books/${book.id}`}
                className="group rounded-lg border border-line-soft bg-card/78 p-4 shadow-xs transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-accent-honey/55 hover:bg-white-soft hover:shadow-[0_14px_34px_rgba(75,53,31,0.12)] focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
              >
                <div className="flex items-start gap-4">
                  <BookCover
                    title={book.title}
                    style={(book.cover_style ?? "sage") as CoverStyle}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2
                        className="truncate text-lg font-bold leading-tight text-green-deep"
                        style={{ fontFamily: "var(--font-playfair)" }}
                      >
                        {book.title}
                      </h2>
                      {book.id === defaultBookId && (
                        <span
                          aria-label="Default cookbook"
                          title="Default cookbook"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-honey/30 text-accent-cinnamon"
                        >
                          <Star size={14} />
                        </span>
                      )}
                    </div>
                    {book.description && (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                        {book.description}
                      </p>
                    )}
                    <p className="mt-4 text-xs font-semibold text-ink-soft">
                      Updated {formatDate(book.updated_at)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
