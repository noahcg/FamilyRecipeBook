import Link from "next/link";
import { ArrowLeft, Pencil, Sparkles, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CreateBookForm } from "@/components/book/CreateBookForm";
import { getUserBooks } from "@/lib/actions/books";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const TIPS = [
  {
    label: "Change it later",
    description: "The title, cover, and description can all be edited anytime.",
    icon: Pencil,
  },
  {
    label: "Add recipes next",
    description: "Once it's created, save your own recipes or generate an idea.",
    icon: Sparkles,
  },
  {
    label: "Share when ready",
    description: "Keep it private for now and invite family whenever you like.",
    icon: Users,
  },
];

export default async function CreateBookPage() {
  const [user, books, supabase] = await Promise.all([
    requireUser(),
    getUserBooks(),
    createClient(),
  ]);

  const { data: settings } = await supabase
    .from("user_settings")
    .select("default_book_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const defaultBookId = settings?.default_book_id ?? null;

  // The chooser lives outside any single book, so point the shell's nav at the
  // user's current book. A brand-new user with no books gets the bare page.
  const navBookId =
    defaultBookId && books.some((book) => book.id === defaultBookId)
      ? defaultBookId
      : books[0]?.id ?? null;

  const content = (
    <div className="px-4 py-8 sm:px-5 lg:px-8">
      <div className="mb-7 border-b border-line-soft pb-6">
        <Link
          href={navBookId ? "/app/cookbooks" : "/onboarding"}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          {navBookId ? "Cookbooks" : "Back"}
        </Link>
        <h1
          className="text-3xl font-bold leading-tight text-green-deep"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Create a cookbook
        </h1>
        <p className="mt-2 max-w-prose text-sm text-ink-muted">
          Give it a name and a cover that feel like home. You can keep adding
          recipes and decide when it&rsquo;s ready to share.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
        <div className="rounded-xl border border-line-soft bg-card p-5 sm:p-6">
          <CreateBookForm />
        </div>

        <aside>
          <div className="rounded-xl border border-line-soft bg-card/70 p-5 sm:p-6">
            <h2 className="text-sm font-bold text-ink">How it works</h2>
            <ul className="mt-4 space-y-4">
              {TIPS.map(({ label, description, icon: Icon }) => (
                <li key={label} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-soft text-green-deep">
                    <Icon size={16} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );

  if (!navBookId) {
    return <AppShell lockNav>{content}</AppShell>;
  }

  return <AppShell bookId={navBookId}>{content}</AppShell>;
}
