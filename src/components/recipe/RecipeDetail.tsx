"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Camera,
  ChevronDown,
  Edit2,
  Flame,
  Heart,
  Leaf,
  MoreHorizontal,
  Smile,
  Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { Button, Dialog } from "@/components/ui";
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

  const sourceName = recipe.source_name ?? recipe.creator?.full_name ?? "Family";
  const story = recipe.story ?? recipe.stories?.[0]?.body ?? recipe.description;
  const noteCount = (recipe.stories?.length ?? 0) + (recipe.story ? 1 : 0);
  const activityItems = [
    {
      id: "created",
      label: `${sourceName} added this recipe`,
      date: new Date(recipe.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
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
    <article className="mx-auto max-w-[1040px] px-4 py-4 lg:px-8">
      {/* Hero image */}
      <div className="relative h-[250px] overflow-hidden rounded-t-xl sm:h-[320px] lg:h-[360px]">
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />

        {/* Back button */}
        <Link
          href={`/app/books/${bookId}`}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-md bg-card/90 text-green-deep shadow-sm backdrop-blur-sm"
          aria-label="Back to book"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>

        {/* Top-right actions */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleFavorite}
            aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
            className="flex h-10 w-10 items-center justify-center rounded-md bg-card/90 text-green-deep shadow-sm backdrop-blur-sm transition-transform active:scale-95"
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
            className="flex h-10 w-10 items-center justify-center rounded-md bg-card/90 text-green-deep shadow-sm backdrop-blur-sm transition-transform active:scale-95"
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

      </div>

      {/* Content panel — overlaps hero */}
      <div
        className="relative z-10 mx-4 -mt-8 mb-8 rounded-xl border border-line-soft bg-card px-5 pb-6 pt-6 shadow-card sm:px-6 lg:mx-8 lg:px-8"
      >
        {/* Title + meta */}
        <div>
          <h1
            className="text-3xl font-bold leading-tight text-green-deep sm:text-4xl"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {recipe.title}
          </h1>

          {/* "Added by" + serves • category */}
          <div className="mt-4 flex items-center gap-3 text-sm text-ink">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-green-soft font-bold text-green-deep">
              {sourceName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p>Added by {sourceName}</p>
              <p className="text-ink-muted">
                {recipe.servings != null ? `Serves ${recipe.servings}` : "Family recipe"}
                {recipe.category && <span className="px-1.5">·</span>}
                {recipe.category}
              </p>
            </div>
          </div>
        </div>

        {story && (
          <div className="story-note relative mt-5 pr-12">
            <p>“{story}”</p>
            <Leaf className="absolute bottom-4 right-4 text-green-sage" size={36} strokeWidth={1.4} />
          </div>
        )}

        <div className="mt-5 border-b border-line-soft">
          <div className="flex items-end justify-between gap-4">
            <div className="flex gap-7 overflow-x-auto text-sm font-semibold text-ink">
              <span className="border-b-2 border-green-deep pb-3 text-green-deep">Ingredients</span>
              {recipe.instructions && recipe.instructions.length > 0 && (
                <a href="#instructions" className="pb-3 hover:text-green-deep">Instructions</a>
              )}
              <span className="pb-3">Notes ({noteCount})</span>
            </div>
            <button
              type="button"
              className="mb-2 rounded-md border border-line-soft bg-white-soft px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-green-pale"
            >
              1x <ChevronDown size={12} className="inline" />
            </button>
          </div>
        </div>

        {/* Ingredients */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <section className="mt-4">
            <IngredientChecklist ingredients={recipe.ingredients} />
          </section>
        )}

        {/* Instructions */}
        {recipe.instructions && recipe.instructions.length > 0 && (
          <section id="instructions" className="mt-6 border-t border-line-soft pt-5">
            <h2
              className="mb-3 text-lg font-bold text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              How to make it
            </h2>
            <InstructionList instructions={recipe.instructions} />
          </section>
        )}

        <div className="mt-5 flex items-center border-t border-line-soft pt-4 text-sm font-bold text-ink">
          <button type="button" className="flex items-center gap-2 pr-5 text-accent-terracotta">
            <Heart size={17} fill="currentColor" />
            {reactionCounts.love}
          </button>
          <button type="button" className="flex items-center gap-2 border-l border-line-soft px-5 text-accent-terracotta">
            <Flame size={17} fill="currentColor" />
            {reactionCounts.made_it}
          </button>
          <span className="flex items-center gap-2 border-l border-line-soft px-5 text-accent-honey">
            <Smile size={18} />
            {reactionCounts.favorite}
          </span>
          <button type="button" onClick={handleFavorite} aria-label={favorited ? "Remove bookmark" : "Bookmark recipe"} className="ml-auto text-green-deep">
            <Bookmark size={19} className={clsx(favorited && "fill-green-deep")} />
          </button>
        </div>

        {/* Add a memory */}
        <section className="mt-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-soft text-xs font-bold text-green-deep">
            {(recipe.creator?.full_name ?? recipe.source_name ?? "F").slice(0, 1).toUpperCase()}
          </div>
          <input
            className="input-cookbook h-11 min-w-0 flex-1 text-sm"
            placeholder="Add a note or memory..."
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
          />
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-md border border-line-soft bg-white-soft text-green-deep" aria-label="Add photo">
            <Camera size={18} />
          </button>
          <Button variant="secondary" size="sm" onClick={handleAddStory} disabled={!storyText.trim()} loading={addingStory}>
            Add
          </Button>
          {storyError && (
            <p className="text-xs text-danger mt-1">{storyError}</p>
          )}
        </section>

        <section className="mt-6">
          <h2
            className="mb-3 text-lg font-semibold text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Made by our family
          </h2>
          <div className="divide-y divide-line-soft">
            {activityItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2.5 text-sm">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-soft text-xs font-bold text-green-deep">
                  {item.initials}
                </div>
                <span className="text-ink">{item.label}</span>
                <span className="ml-auto text-xs text-ink-muted">{item.date}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-sm font-semibold text-green-deep">View all activity</p>
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
