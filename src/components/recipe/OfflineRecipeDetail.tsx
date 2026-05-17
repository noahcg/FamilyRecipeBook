"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, Download, Trash2, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button, EmptyState } from "@/components/ui";
import { IngredientChecklist } from "./IngredientChecklist";
import { InstructionList } from "./InstructionList";
import { ServingScaler } from "./ServingScaler";
import {
  createOfflinePhotoUrl,
  getOfflineRecipe,
  removeRecipeOffline,
  type OfflineRecipeRecord,
} from "@/lib/offlineRecipes";
import { useUser } from "@/lib/hooks/useUser";

interface OfflineRecipeDetailProps {
  bookId: string;
  recipeId: string;
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function OfflineRecipeDetail({ bookId, recipeId }: OfflineRecipeDetailProps) {
  const { userId } = useUser();
  const [record, setRecord] = useState<OfflineRecipeRecord | null>(null);
  const [servingScale, setServingScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    getOfflineRecipe(recipeId, userId)
      .then((nextRecord) => {
        if (active) {
          setRecord(nextRecord ?? null);
          setServingScale(1);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [recipeId, userId]);

  const photoUrl = useMemo(() => {
    if (!record) return null;
    return createOfflinePhotoUrl(record);
  }, [record]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  async function handleRemove() {
    if (!userId) return;
    await removeRecipeOffline(recipeId, userId);
    setRemoved(true);
    setRecord(null);
  }

  if (loading) {
    return (
      <AppShell bookId={bookId}>
        <div className="p-6">
          <div className="skeleton-surface h-[420px] rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!record || removed) {
    return (
      <AppShell bookId={bookId}>
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-5 lg:px-8">
          <EmptyState
            title="Recipe is not saved offline"
            description="Open the online recipe and save it for offline viewing on this device."
            icon={<Download size={32} />}
            action={
              <Link href={`/app/books/${bookId}/offline`}>
                <Button variant="primary" size="sm">
                  Offline recipes
                </Button>
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  const recipe = record.recipe;
  const sourceName = firstNonEmpty(recipe.source_name, recipe.creator?.full_name) ?? "Family";
  const story = recipe.story ?? recipe.stories?.[0]?.body ?? recipe.description;
  const displayedServings = recipe.servings ? recipe.servings * servingScale : recipe.servings;

  return (
    <AppShell bookId={bookId}>
      <article>
        <header className="relative h-[310px] overflow-hidden bg-green-pale sm:h-[360px] lg:h-[390px] lg:rounded-tr-xl">
          <div className="absolute inset-0">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={recipe.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BookOpen size={70} strokeWidth={1} className="text-green-sage opacity-50" />
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-black/10" />
          <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/45 to-transparent pb-14 pt-4 sm:pt-5">
            <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-5 lg:px-8">
              <Link
                href={`/app/books/${bookId}/offline`}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/35 bg-white-soft/88 px-3 text-sm font-extrabold text-green-deep shadow-[0_8px_24px_rgba(0,0,0,0.14)] backdrop-blur-md transition hover:bg-white-soft"
              >
                <ArrowLeft size={17} strokeWidth={2} />
                Offline
              </Link>
              <button
                type="button"
                onClick={() => void handleRemove()}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/35 bg-white-soft/88 px-3 text-sm font-extrabold text-green-deep shadow-[0_8px_24px_rgba(0,0,0,0.14)] backdrop-blur-md transition hover:bg-white-soft"
              >
                <Trash2 size={16} />
                Remove
              </button>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent pb-8 pt-24">
            <div className="mx-auto max-w-[1320px] px-4 sm:px-5 lg:px-8">
              <div className="max-w-4xl text-ink-inverse">
                <p className="mb-3 inline-flex rounded-full bg-white-soft/18 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-white/86">
                  Saved offline
                </p>
                <h1
                  className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {recipe.title}
                </h1>
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/86">
                  <span className="font-semibold text-white">From {sourceName}</span>
                  <span>Saved {formatDate(record.savedAt)}</span>
                  {displayedServings != null && (
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={15} />
                      Serves {displayedServings}
                    </span>
                  )}
                  {recipe.cook_minutes != null && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={15} />
                      {recipe.cook_minutes} min
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1320px] px-4 sm:px-5 lg:px-8">
          <section className="grid gap-8 border-b border-line-soft py-7 lg:grid-cols-[minmax(0,1fr)_330px] xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="max-w-[820px]">
              {story && (
                <blockquote className="border-l-2 border-accent-honey pl-5 text-xl leading-relaxed text-accent-cinnamon">
                  <p style={{ fontFamily: "var(--font-caveat)" }}>{story}</p>
                </blockquote>
              )}
              {recipe.description && recipe.description !== story && (
                <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-muted">
                  {recipe.description}
                </p>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-line-soft text-sm lg:border-l lg:pl-8">
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Servings</dt>
                <dd className="mt-1 font-bold text-green-deep">{displayedServings ?? "Family"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Cook</dt>
                <dd className="mt-1 font-bold text-green-deep">{recipe.cook_minutes ? `${recipe.cook_minutes} min` : "Anytime"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Prep</dt>
                <dd className="mt-1 font-bold text-green-deep">{recipe.prep_minutes ? `${recipe.prep_minutes} min` : "Anytime"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Scale</dt>
                <dd>
                  {recipe.servings ? (
                    <ServingScaler
                      baseServings={recipe.servings}
                      scale={servingScale}
                      onChange={setServingScale}
                    />
                  ) : (
                    <span className="mt-1 block font-bold text-green-deep">1x</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_330px] xl:grid-cols-[minmax(0,1fr)_360px]">
            <main className="min-w-0">
              {recipe.instructions.length > 0 && (
                <section id="instructions" className="max-w-[820px]">
                  <div className="mb-6 flex flex-col gap-3 border-b border-line-soft pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                        Method
                      </p>
                      <h2
                        className="text-3xl font-bold text-green-deep"
                        style={{ fontFamily: "var(--font-playfair)" }}
                      >
                        How to make it
                      </h2>
                    </div>
                    <span className="hidden text-sm font-semibold text-ink-soft sm:block">
                      {recipe.instructions.length} {recipe.instructions.length === 1 ? "step" : "steps"}
                    </span>
                  </div>
                  <InstructionList instructions={recipe.instructions} />
                </section>
              )}
            </main>

            <aside className="space-y-8 border-line-soft lg:sticky lg:top-8 lg:self-start lg:border-l lg:pl-8">
              {recipe.ingredients.length > 0 && (
                <section>
                  <div className="mb-4 border-b border-line-soft pb-3">
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                      What you need
                    </p>
                    <h2
                      className="text-2xl font-bold text-green-deep"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      Ingredients
                    </h2>
                  </div>
                  <IngredientChecklist
                    ingredients={recipe.ingredients}
                    className="sm:grid-cols-1"
                    scaleFactor={servingScale}
                  />
                </section>
              )}
              <section className="rounded-lg border border-line bg-paper-warm p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                  View only
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  Ratings, notes, edits, and grocery actions are available from the online recipe.
                </p>
              </section>
            </aside>
          </div>
        </div>
      </article>
    </AppShell>
  );
}
