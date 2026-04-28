"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Users, Edit2, BookOpen } from "lucide-react";
import { clsx } from "clsx";
import { RecipeStoryNote, Button } from "@/components/ui";
import { ReactionBar } from "@/components/ui/ReactionPill";
import { IngredientChecklist } from "./IngredientChecklist";
import { InstructionList } from "./InstructionList";
import { addRecipeStory } from "@/lib/actions/recipes";
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
  const [storyText, setStoryText] = useState("");
  const [addingStory, setAddingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);

  const canEdit =
    userRole === "keeper" ||
    (userRole === "contributor" && recipe.created_by === userId);

  const totalTime =
    (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);

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

  return (
    <article>
      {/* Hero image */}
      <div className="relative w-full aspect-[4/3] sm:aspect-video overflow-hidden bg-gradient-to-br from-green-soft to-green-pale">
        {recipe.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.photo_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={48} strokeWidth={1} className="text-green-sage opacity-40" />
          </div>
        )}
        {/* Category chip */}
        {recipe.category && (
          <span
            className="absolute top-4 left-4 text-xs font-semibold px-3 py-1 rounded-pill shadow-sm"
            style={{
              background: "var(--color-card)",
              color: "var(--color-cinnamon)",
              border: "1px solid var(--color-border-soft)",
            }}
          >
            {recipe.category}
          </span>
        )}
        {/* Edit button */}
        {canEdit && (
          <Link
            href={`/app/books/${bookId}/recipes/${recipe.id}/edit`}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center shadow-sm"
            style={{ background: "var(--color-card)" }}
            aria-label="Edit recipe"
          >
            <Edit2 size={16} strokeWidth={1.75} className="text-green-deep" />
          </Link>
        )}
      </div>

      <div className="px-5 pt-5 pb-10 space-y-6 max-w-[760px] mx-auto">
        {/* Title + meta */}
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-green-deep leading-tight mb-1"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {recipe.title}
          </h1>
          {recipe.source_name && (
            <p className="text-sm text-ink-muted">
              from{" "}
              <span className="font-semibold text-ink">{recipe.source_name}</span>
            </p>
          )}

          {/* Timing row */}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-ink-muted">
            {recipe.prep_minutes != null && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} strokeWidth={1.75} />
                Prep {recipe.prep_minutes} min
              </span>
            )}
            {recipe.cook_minutes != null && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} strokeWidth={1.75} />
                Cook {recipe.cook_minutes} min
              </span>
            )}
            {totalTime > 0 && recipe.prep_minutes != null && recipe.cook_minutes != null && (
              <span className="flex items-center gap-1.5 font-medium text-ink">
                Total {totalTime} min
              </span>
            )}
            {recipe.servings != null && (
              <span className="flex items-center gap-1.5">
                <Users size={14} strokeWidth={1.75} />
                {recipe.servings} servings
              </span>
            )}
          </div>
        </div>

        {/* Story notes */}
        {(recipe.story || recipe.stories?.length > 0) && (
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

        {/* Reactions */}
        <ReactionBar
          recipeLoves={reactionCounts.love}
          recipeMadeIts={reactionCounts.made_it}
          recipeFavorites={reactionCounts.favorite}
        />

        {/* Ingredients */}
        {recipe.ingredients?.length > 0 && (
          <section>
            <h2
              className="text-lg font-bold text-green-deep mb-3"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Ingredients
            </h2>
            <IngredientChecklist ingredients={recipe.ingredients} />
          </section>
        )}

        {/* Instructions */}
        {recipe.instructions?.length > 0 && (
          <section>
            <h2
              className="text-lg font-bold text-green-deep mb-3"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              How to make it
            </h2>
            <InstructionList instructions={recipe.instructions} />
          </section>
        )}

        {/* Add a memory */}
        <section>
          <h2
            className="text-base font-bold text-green-deep mb-3"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Add a note or memory
          </h2>
          <textarea
            className="input-cookbook resize-none min-h-20"
            placeholder="Share a memory or note about this recipe…"
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            style={{ fontFamily: "var(--font-caveat)", fontSize: "1.1rem" }}
          />
          {storyError && (
            <p className="text-xs text-danger mt-1">{storyError}</p>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={handleAddStory}
            disabled={!storyText.trim()}
            loading={addingStory}
          >
            Add memory
          </Button>
        </section>
      </div>
    </article>
  );
}
