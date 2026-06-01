"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Download, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CookbookBackLink } from "@/components/book/CookbookBackLink";
import { Button, EmptyState } from "@/components/ui";
import {
  listOfflineRecipes,
  removeRecipeOffline,
  type OfflineRecipeRecord,
} from "@/lib/offlineRecipes";
import { useUser } from "@/lib/hooks/useUser";

interface OfflineRecipesPageContentProps {
  bookId?: string;
}

function formatSavedDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function recipeMeta(record: OfflineRecipeRecord) {
  const recipe = record.recipe;
  const attribution = recipe.source_name?.trim() || recipe.creator?.full_name?.trim();
  return [
    attribution,
    recipe.cook_minutes ? `${recipe.cook_minutes} min` : null,
    recipe.servings ? `Serves ${recipe.servings}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function OfflineRecipesPageContent({ bookId }: OfflineRecipesPageContentProps) {
  const { userId } = useUser();
  const [records, setRecords] = useState<OfflineRecipeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    listOfflineRecipes(userId, bookId)
      .then((nextRecords) => {
        if (active) setRecords(nextRecords);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookId, userId]);

  async function handleRemove(recipeId: string) {
    if (!userId) return;
    await removeRecipeOffline(recipeId, userId);
    setRecords((current) => current.filter((record) => record.recipeId !== recipeId));
  }

  return (
    <AppShell bookId={bookId}>
      <div className="mx-auto max-w-[1040px] px-4 py-8 sm:px-5 lg:px-8">
        <header className="mb-7 border-b border-line-soft pb-6">
          {bookId ? <CookbookBackLink bookId={bookId} className="mb-4" /> : null}
          <div className="flex items-start gap-4">
            <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-pale text-green-deep">
              <Download size={19} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                {bookId ? "Offline" : "Saved on this device"}
              </p>
              <h1
                className="mt-1 text-4xl font-bold leading-tight text-green-deep lg:text-5xl"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Saved recipes
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
                Recipes saved on this device for view-only access when the network is unavailable.
              </p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="skeleton-surface h-24 rounded-lg" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            title="No offline recipes yet"
            description="Open a recipe and use Save offline to keep it available on this device."
            icon={<BookOpen size={32} />}
            action={
              <Link href={bookId ? `/app/books/${bookId}/recipes` : "/app/recipes"}>
                <Button variant="primary" size="sm">
                  Browse recipes
                </Button>
              </Link>
            }
          />
        ) : (
          <ol className="divide-y divide-line-soft rounded-xl border border-line bg-card px-5 shadow-xs">
            {records.map((record) => (
              <li key={record.key} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <Link
                  href={
                    bookId
                      ? `/app/books/${bookId}/offline/${record.recipeId}`
                      : `/app/offline/${record.recipeId}`
                  }
                  className="group min-w-0"
                >
                  <p
                    className="truncate text-xl font-bold text-ink transition-colors group-hover:text-green-deep"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {record.recipe.title}
                  </p>
                  <p className="mt-1 truncate text-sm text-ink-muted">
                    {recipeMeta(record) || "Family recipe"} · Saved {formatSavedDate(record.savedAt)}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => void handleRemove(record.recipeId)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line-soft bg-white-soft px-3 text-sm font-bold text-ink-soft transition hover:border-danger/40 hover:text-danger sm:w-auto"
                >
                  <Trash2 size={15} />
                  Remove
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </AppShell>
  );
}
