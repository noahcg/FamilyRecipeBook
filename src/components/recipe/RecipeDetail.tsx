"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Clock,
  Edit2,
  Flame,
  Heart,
  MoreHorizontal,
  ShoppingCart,
  Smile,
  Trash2,
  Users,
} from "lucide-react";
import { clsx } from "clsx";
import { Button, Dialog } from "@/components/ui";
import { IngredientChecklist } from "./IngredientChecklist";
import { InstructionList } from "./InstructionList";
import { addRecipeStory, deleteRecipe } from "@/lib/actions/recipes";
import { addRecipeIngredientsToGrocery } from "@/lib/actions/grocery";
import { toggleReaction } from "@/lib/actions/reactions";
import type { RecipeWithRelations, ReactionCounts, UserReactions, BookRole } from "@/lib/types";

interface RecipeDetailProps {
  recipe: RecipeWithRelations;
  bookId: string;
  userRole: BookRole | null;
  userId: string;
  reactionCounts: ReactionCounts;
  userReactions: UserReactions;
}

export function RecipeDetail({
  recipe,
  bookId,
  userRole,
  userId,
  reactionCounts,
  userReactions,
}: RecipeDetailProps) {
  const router = useRouter();
  const [storyText, setStoryText] = useState("");
  const [addingStory, setAddingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(userReactions.favorite);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAddingGroceries, startAddingGroceries] = useTransition();
  const [groceryMessage, setGroceryMessage] = useState<string | null>(null);
  const [confirmGroceryOpen, setConfirmGroceryOpen] = useState(false);

  const canEdit =
    userRole === "keeper" ||
    (userRole === "contributor" && recipe.created_by === userId);

  const canDelete =
    userRole === "keeper" ||
    (userRole === "contributor" && recipe.created_by === userId);

  const sourceName = recipe.source_name ?? recipe.creator?.full_name ?? "Family";
  const story = recipe.story ?? recipe.stories?.[0]?.body ?? recipe.description;
  const noteCount = (recipe.stories?.length ?? 0) + (recipe.story ? 1 : 0);
  const addedDate = new Date(recipe.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const activityItems = [
    {
      id: "created",
      label: `${sourceName} added this recipe`,
      date: addedDate,
      initials: sourceName.slice(0, 1).toUpperCase(),
    },
    ...(recipe.stories ?? []).slice(0, 2).map((storyItem) => ({
      id: storyItem.id,
      label: `${storyItem.author?.full_name ?? "Family"} shared a memory`,
      date: new Date(storyItem.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      initials: (storyItem.author?.full_name ?? "F").slice(0, 1).toUpperCase(),
    })),
  ];

  useEffect(() => {
    if (!groceryMessage) return;
    const timeout = window.setTimeout(() => setGroceryMessage(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [groceryMessage]);

  async function handleAddStory() {
    if (!storyText.trim()) return;
    setAddingStory(true);
    setStoryError(null);
    const result = await addRecipeStory(bookId, recipe.id, storyText);
    if (!result.success) {
      setStoryError(result.error);
    } else {
      setStoryText("");
    }
    setAddingStory(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteRecipe(bookId, recipe.id);
    if (!result.success) {
      setDeleting(false);
      setDeleteOpen(false);
    } else {
      router.push(`/app/books/${bookId}`);
    }
  }

  async function handleFavorite() {
    setFavorited((f) => !f);
    await toggleReaction(bookId, recipe.id, "favorite");
  }

  function formatGroceryMessage(added: number, updated: number, skipped: number) {
    if (added === 0 && updated === 0) {
      return "Those ingredients are already on your grocery list.";
    }

    const parts = [];
    if (added) parts.push(`added ${added}`);
    if (updated) parts.push(`updated ${updated}`);
    const skippedText = skipped ? ` ${skipped} already covered.` : "";
    return `Grocery list ${parts.join(" and ")}.${skippedText}`;
  }

  function handleAddIngredientsToGrocery(force = false) {
    setGroceryMessage(null);
    startAddingGroceries(async () => {
      const result = await addRecipeIngredientsToGrocery(recipe.id, { force });
      if (!result.success) {
        setGroceryMessage(result.error);
        return;
      }

      if (result.data.needsConfirmation) {
        setConfirmGroceryOpen(true);
        return;
      }

      setConfirmGroceryOpen(false);
      setGroceryMessage(
        formatGroceryMessage(result.data.added, result.data.updated, result.data.skipped)
      );
    });
  }

  return (
    <article>
      <div className="mx-auto max-w-[1320px] px-5 py-4 lg:px-8">
        <div className="flex items-center justify-between gap-4">
        <Link
          href={`/app/books/${bookId}/recipes`}
          className="inline-flex h-10 items-center gap-2 text-sm font-bold text-green-deep hover:underline"
        >
          <ArrowLeft size={17} strokeWidth={2} />
          Recipes
        </Link>

        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={handleFavorite}
            aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
            className="flex h-10 w-10 items-center justify-center rounded-md text-green-deep transition-colors hover:bg-green-pale"
          >
            <Heart
              size={18}
              strokeWidth={1.9}
              className={clsx(
                favorited ? "fill-accent-terracotta text-accent-terracotta" : "text-green-deep"
              )}
            />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
            className="flex h-10 w-10 items-center justify-center rounded-md text-green-deep transition-colors hover:bg-green-pale"
          >
            <MoreHorizontal size={19} strokeWidth={2} />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div
                className="absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-xl py-1 shadow-md"
                style={{ background: "var(--color-paper-soft)", border: "1px solid var(--color-line-soft)" }}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink transition-colors hover:bg-green-pale"
                  onClick={() => { handleFavorite(); setMenuOpen(false); }}
                >
                  <Heart size={15} strokeWidth={1.75} className={clsx(favorited ? "fill-accent-terracotta text-accent-terracotta" : "text-ink-soft")} />
                  {favorited ? "Unfavorite" : "Add to favorites"}
                </button>
                {canEdit && (
                  <Link
                    href={`/app/books/${bookId}/recipes/${recipe.id}/edit`}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink transition-colors hover:bg-green-pale"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Edit2 size={15} strokeWidth={1.75} className="text-ink-soft" />
                    Edit recipe
                  </Link>
                )}
                {canDelete && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-danger transition-colors hover:bg-green-pale"
                    onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}
                  >
                    <Trash2 size={15} strokeWidth={1.75} />
                    Delete recipe
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      </div>

      <header className="relative h-[310px] overflow-hidden bg-green-pale sm:h-[360px] lg:h-[390px]">
        <div className="absolute inset-0">
          {recipe.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.photo_url}
              alt={recipe.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen size={70} strokeWidth={1} className="text-green-sage opacity-50" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent pb-8 pt-24">
          <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
            <div className="max-w-4xl text-ink-inverse">
              {recipe.category && (
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-white/80">
                  {recipe.category}
                </p>
              )}
              <h1
                className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {recipe.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/86">
                <span className="font-semibold text-white">Added by {sourceName}</span>
                <span>{addedDate}</span>
                {recipe.servings != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={15} />
                    Serves {recipe.servings}
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

      <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
        <section className="grid gap-8 border-b border-line-soft py-7 lg:grid-cols-[minmax(0,1fr)_330px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="max-w-[820px]">
          {story && (
            <blockquote className="border-l-2 border-accent-honey pl-5 text-xl leading-relaxed text-accent-cinnamon">
              <p style={{ fontFamily: "var(--font-caveat)" }}>{story}</p>
            </blockquote>
          )}

          {recipe.description && recipe.description !== story && (
            <p className={clsx("max-w-3xl text-base leading-relaxed text-ink-muted", story && "mt-5")}>
              {recipe.description}
            </p>
          )}
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-line-soft text-sm lg:border-l lg:pl-8">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Servings</dt>
              <dd className="mt-1 font-bold text-green-deep">{recipe.servings ?? "Family"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Cook</dt>
              <dd className="mt-1 font-bold text-green-deep">{recipe.cook_minutes ? `${recipe.cook_minutes} min` : "Anytime"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Category</dt>
              <dd className="mt-1 truncate font-bold text-green-deep">{recipe.category ?? "Family"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Memories</dt>
              <dd className="mt-1 font-bold text-green-deep">{noteCount}</dd>
            </div>
          </dl>
        </section>

      <div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_330px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0">
          {recipe.instructions && recipe.instructions.length > 0 && (
            <section id="instructions" className="max-w-[820px]">
              <div className="mb-6 flex items-end justify-between gap-4 border-b border-line-soft pb-4">
                <div>
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
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <section>
              <div className="mb-4 border-b border-line-soft pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
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
                  <button
                    type="button"
                    onClick={() => handleAddIngredientsToGrocery()}
                    disabled={isAddingGroceries}
                    className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md bg-green-deep px-3 text-xs font-extrabold text-ink-inverse transition-opacity hover:opacity-90 disabled:opacity-45"
                  >
                    <ShoppingCart size={14} />
                    {isAddingGroceries ? "Adding" : "Add to list"}
                  </button>
                </div>
                {groceryMessage && (
                  <p className="mt-2 text-xs font-semibold text-green-deep">
                    {groceryMessage}
                  </p>
                )}
              </div>
              <IngredientChecklist ingredients={recipe.ingredients} className="sm:grid-cols-1" />
            </section>
          )}

          <section className="border-t border-line-soft pt-6">
            <div className="flex items-center text-sm font-bold text-ink">
              <button type="button" className="flex items-center gap-2 pr-4 text-accent-terracotta">
                <Heart size={17} fill="currentColor" />
                {reactionCounts.love}
              </button>
              <button type="button" className="flex items-center gap-2 border-l border-line-soft px-4 text-accent-terracotta">
                <Flame size={17} fill="currentColor" />
                {reactionCounts.made_it}
              </button>
              <span className="flex items-center gap-2 border-l border-line-soft px-4 text-accent-honey">
                <Smile size={18} />
                {reactionCounts.favorite}
              </span>
              <button type="button" onClick={handleFavorite} aria-label={favorited ? "Remove bookmark" : "Bookmark recipe"} className="ml-auto text-green-deep">
                <Bookmark size={19} className={clsx(favorited && "fill-green-deep")} />
              </button>
            </div>
          </section>
        </aside>
      </div>

        <section className="border-t border-line-soft py-6">
          <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">
                Family notes
              </p>
              <p className="mt-1 text-sm text-ink-muted">{noteCount} saved</p>
            </div>
            <div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  className="input-cookbook h-10 min-w-0 flex-1 text-sm"
                  placeholder="Add a note or memory..."
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                />
                <Button variant="secondary" size="sm" onClick={handleAddStory} disabled={!storyText.trim()} loading={addingStory}>
                  Add
                </Button>
              </div>
              {storyError && (
                <p className="mt-2 text-xs text-danger">{storyError}</p>
              )}
              <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {activityItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-soft text-xs font-bold text-green-deep">
                      {item.initials}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-ink">{item.label}</span>
                    <span className="text-xs text-ink-muted">{item.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {groceryMessage && (
        <div className="fixed bottom-5 right-5 z-[90] w-[min(calc(100vw-2.5rem),380px)] rounded-xl border border-green-deep/20 bg-green-forest-dark px-4 py-3 text-sm font-bold text-ink-inverse shadow-[0_18px_44px_rgba(31,58,45,0.28)]">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white-soft/14 text-green-soft">
              <ShoppingCart size={17} />
            </span>
            <p className="min-w-0 flex-1 leading-snug">{groceryMessage}</p>
            <button
              type="button"
              onClick={() => setGroceryMessage(null)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-inverse/70 transition-colors hover:bg-white-soft/12 hover:text-ink-inverse"
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
        </div>
      )}

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete recipe?"
      >
        <p className="mb-5 text-sm text-ink-muted">
          This will permanently remove{" "}
          <span className="font-semibold text-ink">{recipe.title}</span> and all
          its memories. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => setDeleteOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="flex-1"
            onClick={handleDelete}
            loading={deleting}
          >
            Delete
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={confirmGroceryOpen}
        onClose={() => setConfirmGroceryOpen(false)}
        title="Add this recipe again?"
        className="overflow-hidden border border-line-soft"
      >
        <div className="pt-5">
          <div className="mb-5 rounded-xl bg-paper-warm/65 p-4">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-soft text-green-deep">
                <ShoppingCart size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">This recipe is already on the list.</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                  Adding <span className="font-semibold text-ink">{recipe.title}</span> again may increase count-based quantities like eggs, lemons, cans, or packages.
                </p>
              </div>
            </div>
          </div>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.08em] text-accent-cinnamon">
            Volume and weight amounts still stay grocery-friendly.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => setConfirmGroceryOpen(false)}
            disabled={isAddingGroceries}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => handleAddIngredientsToGrocery(true)}
            loading={isAddingGroceries}
          >
            Add again
          </Button>
        </div>
      </Dialog>
    </article>
  );
}
