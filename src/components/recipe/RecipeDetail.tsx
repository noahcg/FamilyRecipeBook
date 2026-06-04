"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Copy,
  Edit2,
  FolderInput,
  Heart,
  MoreHorizontal,
  Printer,
  Search,
  ShoppingCart,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { clsx } from "clsx";
import { Button, Dialog } from "@/components/ui";
import { IngredientChecklist } from "./IngredientChecklist";
import { InstructionList } from "./InstructionList";
import { OfflineRecipeButton } from "./OfflineRecipeButton";
import { ServingScaler } from "./ServingScaler";
import { hasInAppHistory } from "@/components/layout/RouteHistoryTracker";
import {
  addRecipeStory,
  deleteRecipe,
  getRecipeTransferTargets,
  copyRecipeToBook,
  moveRecipeToBook,
} from "@/lib/actions/recipes";
import { addRecipeIngredientsToGrocery } from "@/lib/actions/grocery";
import { setRecipeRating, toggleReaction } from "@/lib/actions/reactions";
import type {
  RecipeWithRelations,
  UserReactions,
  BookRole,
  RecipeRatingSummary,
  RecipeTransferTarget,
} from "@/lib/types";

interface RecipeDetailProps {
  recipe: RecipeWithRelations;
  bookId: string;
  userRole: BookRole | null;
  userId: string;
  userReactions: UserReactions;
  ratingSummary: RecipeRatingSummary;
}

function StarRatingControl({
  value,
  average,
  count,
  onChange,
}: {
  value: number;
  average: number;
  count: number;
  onChange: (rating: number) => void;
}) {
  const displayValue = value || average;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5" aria-label={`Your rating: ${value} out of 5 stars`}>
          {Array.from({ length: 5 }, (_, index) => {
            const starNumber = index + 1;
            const fillPercent = Math.max(0, Math.min(1, displayValue - index)) * 100;

            return (
              <span key={starNumber} className="relative block h-7 w-7 text-accent-honey">
                <Star aria-hidden="true" size={26} strokeWidth={1.6} className="absolute inset-0 text-line" />
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${fillPercent}%` }}
                >
                  <Star size={26} strokeWidth={1.6} className="fill-accent-honey text-accent-honey" />
                </span>
                <button
                  type="button"
                  aria-label={`Rate ${starNumber - 0.5} stars`}
                  className="absolute inset-y-0 left-0 w-1/2"
                  onClick={() => onChange(starNumber - 0.5)}
                />
                <button
                  type="button"
                  aria-label={`Rate ${starNumber} stars`}
                  className="absolute inset-y-0 right-0 w-1/2"
                  onClick={() => onChange(starNumber)}
                />
              </span>
            );
          })}
        </div>
        {value > 0 && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="text-xs font-bold text-ink-soft transition-colors hover:text-accent-cinnamon"
          >
            Clear
          </button>
        )}
      </div>
      <p className="text-xs font-semibold text-ink-muted">
        {value > 0 ? `Your rating: ${value}/5` : "No rating yet"}
        {count > 0 ? ` · Average ${average}/5 from ${count}` : ""}
      </p>
    </div>
  );
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

export function RecipeDetail({
  recipe,
  bookId,
  userRole,
  userId,
  userReactions,
  ratingSummary,
}: RecipeDetailProps) {
  const router = useRouter();

  // Return to wherever the user came from (My Recipes, Favorites, a cookbook's
  // list, search…). Fall back to this recipe's cookbook for deep links — e.g. a
  // shared recipe opened directly, which has no in-app history to return to.
  function handleBack() {
    if (hasInAppHistory()) router.back();
    else router.push(`/app/books/${bookId}/recipes`);
  }

  const [storyText, setStoryText] = useState("");
  const [addingStory, setAddingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(userReactions.favorite);
  const [localRatingSummary, setLocalRatingSummary] = useState(ratingSummary);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [servingScale, setServingScale] = useState(1);
  const [isAddingGroceries, startAddingGroceries] = useTransition();
  const [groceryMessage, setGroceryMessage] = useState<string | null>(null);
  const [confirmGroceryOpen, setConfirmGroceryOpen] = useState(false);

  // Copy / move to another book
  const [transferMode, setTransferMode] = useState<"copy" | "move" | null>(null);
  const [targets, setTargets] = useState<RecipeTransferTarget[] | null>(null);
  const [targetQuery, setTargetQuery] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [copiedTo, setCopiedTo] = useState<{ bookId: string; recipeId: string } | null>(null);

  const isCreator = recipe.created_by === userId;

  const canEdit =
    userRole === "keeper" ||
    (userRole === "contributor" && recipe.created_by === userId);

  const canDelete =
    userRole === "keeper" ||
    (userRole === "contributor" && recipe.created_by === userId);

  const sourceName = firstNonEmpty(recipe.source_name, recipe.creator?.full_name) ?? "Family";
  const wasAddedViaUpload = recipe.import_method === "image_upload";
  const addedByName = wasAddedViaUpload ? recipe.creator?.full_name ?? "Family" : sourceName;
  const addedByLabel = `${addedByName}${wasAddedViaUpload ? " (via upload)" : ""}`;
  const story = recipe.story ?? recipe.stories?.[0]?.body ?? recipe.description;
  const noteCount = (recipe.stories?.length ?? 0) + (recipe.story ? 1 : 0);
  const displayedServings = recipe.servings ? recipe.servings * servingScale : recipe.servings;
  const addedDate = new Date(recipe.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const activityItems = [
    {
      id: "created",
      label: `${addedByLabel} added this recipe`,
      date: addedDate,
      initials: addedByName.slice(0, 1).toUpperCase(),
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

  function openTransfer(mode: "copy" | "move") {
    setTransferMode(mode);
    setSelectedTargetId(null);
    setTransferError(null);
    setCopiedTo(null);
    setTargets(null);
    setTargetQuery("");
    getRecipeTransferTargets(bookId).then(setTargets);
  }

  function closeTransfer() {
    setTransferMode(null);
    setTransferError(null);
    setCopiedTo(null);
  }

  const filteredTargets = (targets ?? []).filter((t) =>
    t.title.toLowerCase().includes(targetQuery.trim().toLowerCase())
  );

  function targetEligible(role: BookRole) {
    if (transferMode === "copy") return role === "keeper" || role === "contributor";
    // move
    return isCreator ? role === "keeper" || role === "contributor" : role === "keeper";
  }

  async function handleTransfer() {
    if (!transferMode || !selectedTargetId) return;
    setTransferring(true);
    setTransferError(null);

    if (transferMode === "copy") {
      const result = await copyRecipeToBook(bookId, recipe.id, selectedTargetId);
      setTransferring(false);
      if (!result.success) {
        setTransferError(result.error);
        return;
      }
      setCopiedTo({ bookId: result.data.bookId, recipeId: result.data.recipeId });
    } else {
      const result = await moveRecipeToBook(bookId, recipe.id, selectedTargetId);
      if (!result.success) {
        setTransferring(false);
        setTransferError(result.error);
        return;
      }
      // The recipe now lives in the target book; its old URL would 404.
      router.push(`/app/books/${result.data.bookId}/recipes/${recipe.id}`);
    }
  }

  async function handleFavorite() {
    const next = !favorited;
    setFavorited(next);
    const result = await toggleReaction(bookId, recipe.id, "favorite");
    if (!result.success) {
      setFavorited(!next);
    }
  }

  async function handleRatingChange(nextRating: number) {
    const previous = localRatingSummary;
    const nextCount =
      previous.userRating === 0 && nextRating > 0
        ? previous.count + 1
        : previous.userRating > 0 && nextRating === 0
          ? Math.max(0, previous.count - 1)
          : previous.count;
    const previousTotal = previous.average * previous.count;
    const nextTotal = previousTotal - previous.userRating + nextRating;

    setLocalRatingSummary({
      userRating: nextRating,
      count: nextCount,
      average: nextCount ? Math.round((nextTotal / nextCount) * 2) / 2 : 0,
    });

    const result = await setRecipeRating(bookId, recipe.id, nextRating);
    if (result.success) {
      setLocalRatingSummary(result.data);
    } else {
      setLocalRatingSummary(previous);
    }
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
      <header className="relative h-[310px] overflow-hidden bg-green-pale sm:h-[360px] lg:h-[390px] lg:rounded-tr-xl">
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
        <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/45 to-transparent pb-14 pt-4 sm:pt-5">
          <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-5 lg:px-8">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/35 bg-white-soft/88 px-3 text-sm font-extrabold text-green-deep shadow-[0_8px_24px_rgba(0,0,0,0.14)] backdrop-blur-md transition hover:bg-white-soft"
            >
              <ArrowLeft size={17} strokeWidth={2} />
              Back
            </button>

            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={handleFavorite}
                aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white-soft/88 text-green-deep shadow-[0_8px_24px_rgba(0,0,0,0.14)] backdrop-blur-md transition hover:bg-white-soft"
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white-soft/88 text-green-deep shadow-[0_8px_24px_rgba(0,0,0,0.14)] backdrop-blur-md transition hover:bg-white-soft"
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
                    className="absolute right-0 top-12 z-50 w-44 overflow-hidden rounded-md py-1 shadow-md"
                    style={{ background: "var(--color-paper-soft)", border: "1px solid var(--color-line-soft)" }}
                  >
                    <OfflineRecipeButton
                      recipe={recipe}
                      bookId={bookId}
                      userId={userId}
                      variant="menu"
                    />
                    <Link
                      href={`/app/books/${bookId}/recipes/${recipe.id}/print`}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink transition-colors hover:bg-green-pale"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Printer size={15} strokeWidth={1.75} className="text-ink-soft" />
                      Print recipe
                    </Link>
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
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink transition-colors hover:bg-green-pale"
                      onClick={() => { setMenuOpen(false); openTransfer("copy"); }}
                    >
                      <Copy size={15} strokeWidth={1.75} className="text-ink-soft" />
                      Copy to book
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink transition-colors hover:bg-green-pale"
                        onClick={() => { setMenuOpen(false); openTransfer("move"); }}
                      >
                        <FolderInput size={15} strokeWidth={1.75} className="text-ink-soft" />
                        Move to book
                      </button>
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
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent pb-8 pt-24">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-5 lg:px-8">
            <div className="max-w-4xl text-ink-inverse">
              {recipe.category?.name && (
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-white/80">
                  {recipe.category.name}
                </p>
              )}
              <h1
                className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {recipe.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/86">
                <span className="font-semibold text-white">Added by {addedByLabel}</span>
                <span>{addedDate}</span>
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
            <p className={clsx("max-w-3xl text-base leading-relaxed text-ink-muted", story && "mt-5")}>
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
        <div className="min-w-0">
          {recipe.instructions && recipe.instructions.length > 0 && (
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
        </div>

        <aside className="space-y-8 border-line-soft lg:sticky lg:top-8 lg:self-start lg:border-l lg:pl-8">
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <section>
              <div className="mb-4 border-b border-line-soft pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
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
                    className="inline-flex min-h-9 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-green-deep px-3 text-xs font-extrabold text-ink-inverse transition-opacity hover:opacity-90 disabled:opacity-45 sm:w-auto"
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
              <IngredientChecklist
                ingredients={recipe.ingredients}
                className="sm:grid-cols-1"
                scaleFactor={servingScale}
              />
            </section>
          )}

          <section className="border-t border-line-soft pt-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
              Rating
            </p>
            <StarRatingControl
              value={localRatingSummary.userRating}
              average={localRatingSummary.average}
              count={localRatingSummary.count}
              onChange={handleRatingChange}
            />
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
        open={transferMode !== null}
        onClose={closeTransfer}
        title={
          copiedTo
            ? "Recipe copied"
            : transferMode === "move"
              ? "Move to another book"
              : "Copy to another book"
        }
      >
        {copiedTo ? (
          <div className="space-y-6 pt-5" role="status" aria-live="polite">
            <p className="text-sm leading-relaxed text-ink-muted">
              <span className="font-semibold text-ink">{recipe.title}</span> was
              copied — memories, reactions, and ratings included.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={closeTransfer}
              >
                Done
              </Button>
              <Link
                href={`/app/books/${copiedTo.bookId}/recipes/${copiedTo.recipeId}`}
                className="flex flex-1"
              >
                <Button variant="primary" size="sm" className="w-full">
                  Open the copy
                  <ArrowRight size={15} />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5 pt-5">
            <p className="text-sm leading-relaxed text-ink-muted">
              {transferMode === "move" ? (
                <>
                  Move <span className="font-semibold text-ink">{recipe.title}</span>{" "}
                  into another cookbook. It will be removed from this one.
                </>
              ) : (
                <>
                  Copy <span className="font-semibold text-ink">{recipe.title}</span>{" "}
                  — including its memories, reactions, and ratings — into another
                  cookbook.
                </>
              )}
            </p>

            {targets === null ? (
              <div className="flex items-center justify-center gap-3 py-10 text-sm text-ink-muted">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-green-deep" />
                Loading your cookbooks…
              </div>
            ) : targets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line-soft px-4 py-8 text-center">
                <p className="text-sm text-ink-muted">
                  You don&rsquo;t have another cookbook yet.
                </p>
                <Link
                  href="/onboarding/create-book"
                  className="mt-2 inline-block text-sm font-bold text-green-deep hover:underline"
                >
                  Create a cookbook
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-soft">
                  Choose a cookbook
                </p>

                {targets.length > 5 && (
                  <div className="relative">
                    <Search
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
                    />
                    <input
                      type="search"
                      value={targetQuery}
                      onChange={(e) => setTargetQuery(e.target.value)}
                      placeholder="Search cookbooks…"
                      className="input-cookbook h-10 w-full text-sm"
                      style={{ paddingLeft: "2.25rem" }}
                    />
                  </div>
                )}

                <div className="max-h-72 divide-y divide-line-soft overflow-y-auto rounded-xl border border-line-soft">
                  {filteredTargets.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-ink-muted">
                      No cookbooks match &ldquo;{targetQuery.trim()}&rdquo;.
                    </p>
                  ) : (
                    filteredTargets.map((target) => {
                      const eligible = targetEligible(target.role);
                      const selected = selectedTargetId === target.id;
                      return (
                        <button
                          key={target.id}
                          type="button"
                          disabled={!eligible}
                          onClick={() => setSelectedTargetId(target.id)}
                          aria-pressed={selected}
                          className={clsx(
                            "flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors",
                            selected
                              ? "bg-green-soft/50"
                              : "hover:bg-green-pale/60",
                            !eligible && "cursor-not-allowed opacity-55 hover:bg-transparent"
                          )}
                        >
                          <span
                            className={clsx(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                              selected ? "bg-green-deep text-ink-inverse" : "bg-green-soft text-green-deep"
                            )}
                          >
                            <BookOpen size={16} strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">
                              {target.title}
                            </span>
                            <span className="block text-xs capitalize text-ink-muted">
                              {eligible
                                ? target.role
                                : transferMode === "move" && !isCreator
                                  ? "Keeper access needed"
                                  : "View-only access"}
                            </span>
                          </span>
                          {selected && (
                            <Check size={18} className="shrink-0 text-green-deep" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {transferError && (
              <p className="text-sm font-medium text-danger">{transferError}</p>
            )}

            {targets !== null && targets.length > 0 && (
              <div className="flex gap-3 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={closeTransfer}
                  disabled={transferring}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={handleTransfer}
                  loading={transferring}
                  disabled={!selectedTargetId}
                >
                  {transferMode === "move" ? "Move recipe" : "Copy recipe"}
                </Button>
              </div>
            )}
          </div>
        )}
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
