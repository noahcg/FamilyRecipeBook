"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import {
  generateRecipeIdea,
  saveRecipeIdea,
  type AIRecipeIdea,
} from "@/lib/actions/aiRecipes";

interface AIRecipeIdeaPanelProps {
  bookId: string;
}

export function AIRecipeIdeaPanel({ bookId }: AIRecipeIdeaPanelProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [idea, setIdea] = useState<AIRecipeIdea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isSaving, startSaving] = useTransition();

  function handleGenerate() {
    setError(null);
    startGenerating(async () => {
      const result = await generateRecipeIdea(prompt);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setIdea(result.data);
    });
  }

  function handleSave() {
    if (!idea) return;
    setError(null);
    startSaving(async () => {
      const result = await saveRecipeIdea(bookId, idea);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/app/books/${bookId}/recipes/${result.data.id}`);
    });
  }

  return (
    <section className="recipe-card overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="border-b border-line-soft p-5 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-green-soft text-green-deep">
              <Sparkles size={21} strokeWidth={1.8} />
            </span>
            <div>
              <h2
                className="text-xl font-semibold leading-tight text-green-deep"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Ask for a recipe idea
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Tell the cookbook what is in your pantry, then save the idea if it works.
              </p>
            </div>
          </div>

          <textarea
            className="input-cookbook min-h-28 w-full resize-y text-sm"
            placeholder="I have chicken thighs, rice, lemons, spinach, and yogurt. I want something cozy for dinner in under an hour."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />

          {error && (
            <p className="mt-3 rounded-md border border-danger/20 bg-card-muted px-3 py-2 text-sm font-semibold text-danger">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="rounded-md"
              onClick={handleGenerate}
              disabled={isGenerating || prompt.trim().length < 10}
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Generate Idea
            </Button>
            {idea && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="rounded-md"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                Try Another
              </Button>
            )}
          </div>
        </div>

        <div className="bg-white-soft/45 p-5">
          {idea ? (
            <div>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                    Suggested Recipe
                  </p>
                  <h3
                    className="mt-1 text-2xl font-semibold leading-tight text-green-deep"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {idea.title}
                  </h3>
                  <p className="mt-2 text-sm leading-normal text-ink-muted">
                    {idea.description}
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-card-muted text-green-deep">
                  <BookOpen size={21} strokeWidth={1.6} />
                </span>
              </div>

              <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-ink-muted">
                <span className="rounded-sm bg-card px-2 py-1">Serves {idea.servings}</span>
                <span className="rounded-sm bg-card px-2 py-1">
                  {idea.prep_minutes + idea.cook_minutes} min
                </span>
                <span className="rounded-sm bg-card px-2 py-1">{idea.category}</span>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-bold text-green-deep">Ingredients</p>
                  <ul className="space-y-1.5 text-sm text-ink">
                    {idea.ingredients.slice(0, 6).map((ingredient, index) => (
                      <li key={`${ingredient.item}-${index}`} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-sage" />
                        <span>
                          {[ingredient.quantity, ingredient.unit, ingredient.item]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold text-green-deep">First steps</p>
                  <ol className="space-y-1.5 text-sm text-ink">
                    {idea.instructions.slice(0, 3).map((instruction, index) => (
                      <li key={`${instruction.body}-${index}`} className="flex gap-2">
                        <span className="font-bold text-accent-cinnamon">{index + 1}.</span>
                        <span>{instruction.body}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line-soft pt-4">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="rounded-md"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Save to Cookbook
                </Button>
                <p className="text-xs text-ink-soft">
                  You can edit details after saving.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-card/45 p-6 text-center">
              <Sparkles size={28} strokeWidth={1.5} className="text-green-sage" />
              <p
                className="mt-3 text-lg font-semibold text-green-deep"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Your idea will appear here
              </p>
              <p className="mt-1 max-w-sm text-sm text-ink-muted">
                Add pantry ingredients, dietary needs, timing, or the kind of meal you want.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
