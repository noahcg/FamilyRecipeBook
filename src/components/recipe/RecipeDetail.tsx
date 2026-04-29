"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Users, MoreVertical, BookOpen, Heart, Edit2, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { RecipeStoryNote, Button, Dialog } from "@/components/ui";
import { ReactionBar } from "@/components/ui/ReactionPill";
import { IngredientChecklist } from "./IngredientChecklist";
import { InstructionList } from "./InstructionList";
import { addRecipeStory, deleteRecipe } from "@/lib/actions/recipes";
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

  const canEdit =
    userRole === "keeper" ||
    (userRole === "contributor" && recipe.created_by === userId);

  const canDelete =
    userRole === "keeper" ||
    (userRole === "contributor" && recipe.created_by === userId);

  const totalTime = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);

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

  return (
    <article className="mx-auto max-w-[1120px] lg:px-8 lg:py-4">
      {/* Hero image */}
      <div className="relative h-72 w-full overflow-hidden sm:h-80 lg:h-[340px] lg:rounded-t-xl">
        {recipe.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.photo_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "var(--color-sage-soft)" }}
          >
            <BookOpen size={56} strokeWidth={1} className="text-green-sage opacity-30" />
          </div>
        )}

        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />

        {/* Back button */}
        <Link
          href={`/app/books/${bookId}`}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center shadow-sm backdrop-blur-sm"
          style={{ background: "rgba(247,243,233,0.92)" }}
          aria-label="Back to book"
        >
          <ArrowLeft size={16} strokeWidth={2} className="text-green-deep" />
        </Link>

        {/* Top-right actions */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleFavorite}
            aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
            className="flex h-10 w-10 items-center justify-center rounded-md shadow-sm backdrop-blur-sm transition-transform active:scale-95"
            style={{ background: "rgba(247,243,233,0.92)" }}
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
            className="flex h-10 w-10 items-center justify-center rounded-md shadow-sm backdrop-blur-sm transition-transform active:scale-95"
            style={{ background: "rgba(247,243,233,0.92)" }}
          >
            <MoreVertical size={17} strokeWidth={2} className="text-green-deep" />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div
                className="absolute right-0 top-11 z-50 w-44 rounded-xl overflow-hidden py-1 shadow-md"
                style={{ background: "var(--color-paper-soft)", border: "1px solid var(--color-line-soft)" }}
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-sage-pale transition-colors"
                  onClick={() => { handleFavorite(); setMenuOpen(false); }}
                >
                  <Heart size={15} strokeWidth={1.75} className={clsx(favorited ? "fill-accent-terracotta text-accent-terracotta" : "text-ink-soft")} />
                  {favorited ? "Unfavorite" : "Add to favorites"}
                </button>
                {canEdit && (
                  <Link
                    href={`/app/books/${bookId}/recipes/${recipe.id}/edit`}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-sage-pale transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Edit2 size={15} strokeWidth={1.75} className="text-ink-soft" />
                    Edit recipe
                  </Link>
                )}
                {canDelete && (
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-sage-pale transition-colors"
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

        {/* Category chip */}
        {recipe.category && (
          <span
            className="absolute bottom-8 left-5 text-xs font-semibold px-3 py-1 rounded-pill"
            style={{
              background: "rgba(247,243,233,0.92)",
              color: "var(--color-cinnamon)",
            }}
          >
            {recipe.category}
          </span>
        )}
      </div>

      {/* Content panel — overlaps hero */}
      <div
        className="cookbook-detail-panel relative z-10 mx-4 -mt-8 max-w-[960px] space-y-6 rounded-xl px-5 pb-10 pt-6 lg:mx-auto lg:-mt-10 lg:px-8"
      >
        {/* Title + meta */}
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-green-deep leading-tight mb-1"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {recipe.title}
          </h1>

          {/* "Added by" + serves • category */}
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-ink-muted">
            {(recipe.source_name ?? recipe.creator?.full_name) && (
              <span>
                Added by{" "}
                <span className="font-semibold text-ink">
                  {recipe.source_name ?? recipe.creator?.full_name}
                </span>
              </span>
            )}
            {recipe.servings != null && (
              <>
                {(recipe.source_name ?? recipe.creator?.full_name) && <span className="opacity-40">·</span>}
                <span className="flex items-center gap-1">
                  <Users size={12} strokeWidth={1.75} />
                  Serves {recipe.servings}
                </span>
              </>
            )}
            {recipe.category && (
              <>
                <span className="opacity-40">·</span>
                <span>{recipe.category}</span>
              </>
            )}
          </div>

          {/* Timing row */}
          {(recipe.prep_minutes != null || recipe.cook_minutes != null) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-ink-muted">
              {recipe.prep_minutes != null && (
                <span className="flex items-center gap-1.5">
                  <Clock size={13} strokeWidth={1.75} />
                  Prep {recipe.prep_minutes} min
                </span>
              )}
              {recipe.cook_minutes != null && (
                <span className="flex items-center gap-1.5">
                  <Clock size={13} strokeWidth={1.75} />
                  Cook {recipe.cook_minutes} min
                </span>
              )}
              {totalTime > 0 && recipe.prep_minutes != null && recipe.cook_minutes != null && (
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  Total {totalTime} min
                </span>
              )}
            </div>
          )}
        </div>

        {/* Story notes — appear before ingredients */}
        {(recipe.story || (recipe.stories && recipe.stories.length > 0)) && (
          <div className="space-y-3">
            {recipe.story && (
              <RecipeStoryNote
                story={recipe.story}
                author={recipe.source_name ?? recipe.creator?.full_name ?? undefined}
              />
            )}
            {recipe.stories?.map((s) => (
              <RecipeStoryNote
                key={s.id}
                story={s.body}
                author={s.author?.full_name ?? undefined}
              />
            ))}
          </div>
        )}

        <div className="border-b border-line-soft">
          <div className="flex items-end justify-between gap-4">
            <div className="flex gap-6 overflow-x-auto text-sm font-semibold text-ink">
              <span className="border-b-2 border-green-deep pb-3 text-green-deep">Ingredients</span>
              {recipe.instructions && recipe.instructions.length > 0 && (
                <a href="#instructions" className="pb-3 hover:text-green-deep">Instructions</a>
              )}
              <span className="pb-3 text-ink-muted">Notes ({recipe.stories?.length ?? 0})</span>
            </div>
            <button
              type="button"
              className="mb-2 rounded-md border border-line-soft bg-card px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-green-pale"
            >
              Scale 1x
            </button>
          </div>
        </div>

        {/* Ingredients */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <section>
            <IngredientChecklist ingredients={recipe.ingredients} />
          </section>
        )}

        {/* Instructions */}
        {recipe.instructions && recipe.instructions.length > 0 && (
          <section id="instructions">
            <h2
              className="mb-3 text-lg font-bold text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              How to make it
            </h2>
            <InstructionList instructions={recipe.instructions} />
          </section>
        )}

        <div className="border-t border-line-soft pt-4">
          <ReactionBar
            bookId={bookId}
            recipeId={recipe.id}
            counts={reactionCounts}
            userReactions={userReactions}
          />
        </div>

        {/* Add a memory */}
        <section className="flex gap-3">
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-soft text-xs font-bold text-green-deep">
            {(recipe.creator?.full_name ?? recipe.source_name ?? "F").slice(0, 1)}
          </div>
          <textarea
            className="input-cookbook min-h-10 w-full resize-none"
            placeholder="Share a memory or note about this recipe…"
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            style={{ fontFamily: "var(--font-caveat)", fontSize: "1.1rem" }}
          />
          {storyError && (
            <p className="text-xs text-danger mt-1">{storyError}</p>
          )}
          <Button variant="secondary" size="sm" onClick={handleAddStory} disabled={!storyText.trim()} loading={addingStory}>
            Add
          </Button>
        </section>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete recipe?"
      >
        <p className="text-sm text-ink-muted mb-5">
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
    </article>
  );
}
