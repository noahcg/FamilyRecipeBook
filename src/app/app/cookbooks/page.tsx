import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button, EmptyState } from "@/components/ui";
import { BookshelfGrid } from "@/components/book/BookshelfGrid";
import { getUserBooks } from "@/lib/actions/books";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

interface CookbooksPageProps {
  searchParams: Promise<{ q?: string }>;
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

  // The chooser lives outside any single book, so point the shell's nav at the
  // user's current book (their default, otherwise the first one they belong to).
  const navBookId =
    defaultBookId && books.some((book) => book.id === defaultBookId)
      ? defaultBookId
      : books[0]?.id ?? null;

  const content = (
    <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-5 lg:px-8">
      <header className="mb-7 border-b border-line-soft pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1
              className="text-4xl font-bold leading-tight text-green-deep lg:text-5xl"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Choose a cookbook
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              {books.length} {books.length === 1 ? "cookbook" : "cookbooks"} on your shelf. Each keeps its own
              recipes, members, and settings.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <form action="/app/cookbooks" className="relative min-w-0 flex-1 lg:w-[340px] lg:flex-none">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
                strokeWidth={1.75}
              />
              <input
                name="q"
                defaultValue={query}
                className="input-cookbook h-12 w-full text-sm"
                style={{ paddingLeft: "2.25rem" }}
                placeholder="Search cookbooks..."
              />
            </form>
            <Link href="/onboarding/create-book">
              <Button variant="primary" size="md" className="h-12 w-full rounded-md px-5 sm:w-auto">
                <Plus size={17} /> New cookbook
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {filteredBooks.length === 0 ? (
        <EmptyState
          title={query ? "No matching cookbooks" : "No cookbooks yet"}
          description={
            query
              ? "Try another search term or create a new cookbook."
              : "Create your first cookbook to start collecting recipes."
          }
          action={
            !query ? (
              <Link href="/onboarding/create-book">
                <Button variant="primary" size="sm">
                  <Plus size={14} /> New cookbook
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <BookshelfGrid books={filteredBooks} defaultBookId={defaultBookId} userId={user.id} />
      )}
    </div>
  );

  // With at least one book we render inside the app shell so the chooser keeps
  // the same left nav (desktop) and bottom nav (mobile) as the rest of the app.
  // A brand-new user with no books has nowhere for that nav to point, so they
  // get the bare page with just the empty state.
  if (!navBookId) {
    return <div className="app-paper-bg paper-texture min-h-dvh">{content}</div>;
  }

  return <AppShell bookId={navBookId}>{content}</AppShell>;
}
