"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ChefHat, Check, Clock, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui";
import { IngredientChecklist } from "./IngredientChecklist";
import { InstructionList } from "./InstructionList";
import { ServingScaler } from "./ServingScaler";
import type { AIRecipeIdea } from "@/lib/actions/aiRecipes";
import type { RecipeIngredient, RecipeInstruction } from "@/lib/types";
import { formatDuration } from "@/lib/formatDuration";

interface IdeaCookViewProps {
  idea: AIRecipeIdea;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  error?: string | null;
}

// A cook-from-the-counter view of an unsaved AI recipe idea. It mirrors the
// saved recipe page (RecipeDetail) layout — hero, meta grid, method + checkable
// ingredients — so a user can make the idea right away without committing it to
// a cookbook, then save it from here if they want to keep it.
export function IdeaCookView({ idea, onClose, onSave, isSaving, error }: IdeaCookViewProps) {
  const [servingScale, setServingScale] = useState(1);

  // The idea's ingredients/instructions are plain AI output; adapt them into the
  // shapes the shared cook components expect by synthesizing stable keys.
  const ingredients = useMemo<RecipeIngredient[]>(
    () =>
      idea.ingredients.map((ingredient, index) => ({
        id: `idea-ingredient-${index}`,
        recipe_id: "idea",
        position: index + 1,
        quantity: ingredient.quantity || null,
        unit: ingredient.unit || null,
        item: ingredient.item,
        note: ingredient.note || null,
        group_label: null,
        created_at: "",
      })),
    [idea.ingredients]
  );

  const instructions = useMemo<RecipeInstruction[]>(
    () =>
      idea.instructions.map((instruction, index) => ({
        id: `idea-instruction-${index}`,
        recipe_id: "idea",
        position: index + 1,
        body: instruction.body,
        created_at: "",
      })),
    [idea.instructions]
  );

  const displayedServings = idea.servings * servingScale;
  const totalMinutes = idea.prep_minutes + idea.cook_minutes;

  return (
    <article>
      <header
        className="relative h-[280px] overflow-hidden bg-green-forest-dark sm:h-[320px] lg:h-[350px] lg:rounded-tr-xl"
        style={{
          backgroundImage:
            "radial-gradient(120% 120% at 85% 0%, rgba(255,255,255,0.10) 0%, transparent 45%), linear-gradient(135deg, var(--color-green-forest-dark) 0%, var(--color-deep-green) 60%, var(--color-green-forest-dark) 100%)",
        }}
      >
        {/* Oversized chef-hat motif keeps the band intentional, not a missing photo. */}
        <ChefHat
          size={300}
          strokeWidth={1}
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -right-10 text-white/[0.06]"
        />
        <div className="absolute inset-x-0 top-0 z-20 pb-14 pt-4 sm:pt-5">
          <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-5 lg:px-8">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/35 bg-white-soft/88 px-3 text-sm font-extrabold text-green-deep shadow-[0_8px_24px_rgba(0,0,0,0.14)] backdrop-blur-md transition hover:bg-white-soft"
            >
              <ArrowLeft size={17} strokeWidth={2} />
              Back to idea
            </button>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="rounded-full"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Save to Cookbook
            </Button>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 pb-8 pt-24">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-5 lg:px-8">
            <div className="max-w-4xl text-ink-inverse">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-white/80">
                Cooking now{idea.category ? ` · ${idea.category}` : ""}
              </p>
              <h1
                className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {idea.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/86">
                <span className="inline-flex items-center gap-1.5">
                  <Users size={15} />
                  Serves {displayedServings}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={15} />
                  {formatDuration(totalMinutes)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1320px] px-4 sm:px-5 lg:px-8">
        <section className="grid gap-8 border-b border-line-soft py-7 lg:grid-cols-[minmax(0,1fr)_330px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="max-w-[820px]">
            {idea.description && (
              <p className="max-w-3xl text-base leading-relaxed text-ink-muted">
                {idea.description}
              </p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-line-soft text-sm lg:border-l lg:pl-8">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Servings</dt>
              <dd className="mt-1 font-bold text-green-deep">{displayedServings}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Cook</dt>
              <dd className="mt-1 font-bold text-green-deep">
                {idea.cook_minutes ? formatDuration(idea.cook_minutes) : "Anytime"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Prep</dt>
              <dd className="mt-1 font-bold text-green-deep">
                {idea.prep_minutes ? formatDuration(idea.prep_minutes) : "Anytime"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Scale</dt>
              <dd>
                <ServingScaler
                  baseServings={idea.servings}
                  scale={servingScale}
                  onChange={setServingScale}
                />
              </dd>
            </div>
          </dl>
        </section>

        {error && (
          <p className="mt-6 rounded-md border border-danger/20 bg-card-muted px-3 py-2 text-sm font-semibold text-danger">
            {error}
          </p>
        )}

        <div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_330px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <section className="max-w-[820px]">
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
                  {instructions.length} {instructions.length === 1 ? "step" : "steps"}
                </span>
              </div>
              <InstructionList instructions={instructions} />
            </section>
          </div>

          <aside className="border-line-soft lg:sticky lg:top-8 lg:self-start lg:border-l lg:pl-8">
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
                ingredients={ingredients}
                className="sm:grid-cols-1"
                scaleFactor={servingScale}
              />
            </section>
          </aside>
        </div>

        <section className="flex flex-wrap items-center gap-3 border-t border-line-soft py-7">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="rounded-md"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save to Cookbook
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="rounded-md"
            onClick={onClose}
            disabled={isSaving}
          >
            Back to idea
          </Button>
          <p className="text-xs text-ink-soft">
            Saving keeps this recipe in your cookbook with a photo you can edit.
          </p>
        </section>
      </div>
    </article>
  );
}
