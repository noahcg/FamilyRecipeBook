"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui";
import {
  generateRecipeIdea,
  saveRecipeIdea,
  type AIRecipeIdea,
} from "@/lib/actions/aiRecipes";

interface AIRecipeIdeaPanelProps {
  bookId: string;
  initialPrompt?: string;
}

export function AIRecipeIdeaPanel({ bookId, initialPrompt }: AIRecipeIdeaPanelProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [idea, setIdea] = useState<AIRecipeIdea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isSaving, startSaving] = useTransition();

  function handleGenerate(nextPrompt = prompt) {
    const trimmed = nextPrompt.trim();
    setPrompt(nextPrompt);
    setError(null);
    startGenerating(async () => {
      const result = await generateRecipeIdea(trimmed);
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
    <div className="min-h-dvh px-4 py-8 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-[1240px]">
        <header className="mb-8 border-b border-line-soft pb-7">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
            <Sparkles size={15} />
            Recipe ideas
          </p>
          <h1
            className="max-w-4xl text-4xl font-bold leading-tight text-green-deep lg:text-5xl"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            What should we make?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Tell the cookbook what is in your kitchen, what kind of meal you want, and how much time you have.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] xl:gap-12">
          <section className="min-w-0">
            <div className="mb-5 flex items-baseline gap-4">
              <h2
                className="text-2xl font-bold leading-tight text-green-deep"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Describe the idea
              </h2>
              <span className="h-px flex-1 bg-line-soft" />
            </div>

            <textarea
              className="input-cookbook min-h-[300px] w-full resize-y bg-white-soft/80 text-base leading-relaxed"
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
                onClick={() => handleGenerate()}
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
                  onClick={() => handleGenerate()}
                  disabled={isGenerating}
                >
                  Try Another
                </Button>
              )}
            </div>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-muted">
              Include ingredients, mood, timing, dietary needs, or who you are cooking for. The result can be edited after saving.
            </p>
          </section>

          <section className="min-w-0 border-line-soft lg:border-l lg:pl-6 xl:pl-8">
            <div className="mb-5 flex max-w-2xl items-baseline gap-4">
              <h2
                className="text-2xl font-bold leading-tight text-green-deep"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Recipe draft
              </h2>
              <span className="h-px flex-1 bg-line-soft" />
            </div>

            {idea ? (
              <div>
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                    Suggested Recipe
                  </p>
                  <h3
                    className="mt-2 text-3xl font-bold leading-tight text-green-deep lg:text-4xl"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {idea.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
                    {idea.description}
                  </p>
                </div>

                <div className="mb-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-ink-muted">
                  <span>Serves {idea.servings}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={15} />
                    {idea.prep_minutes + idea.cook_minutes} min
                  </span>
                  <span>{idea.category}</span>
                </div>

                <div className="grid gap-8 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                      Ingredients
                    </p>
                    <ul className="space-y-2 text-sm leading-relaxed text-ink">
                      {idea.ingredients.map((ingredient, index) => (
                        <li key={`${ingredient.item}-${index}`} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-sage" />
                          <span>
                            {[ingredient.quantity, ingredient.unit, ingredient.item]
                              .filter(Boolean)
                              .join(" ")}
                            {ingredient.note && (
                              <span className="text-ink-soft"> ({ingredient.note})</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                      Method
                    </p>
                    <ol className="space-y-3 text-sm leading-relaxed text-ink">
                      {idea.instructions.map((instruction, index) => (
                        <li key={`${instruction.body}-${index}`} className="flex gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-deep text-xs font-bold text-ink-inverse">
                            {index + 1}
                          </span>
                          <span>{instruction.body}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
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
                    You can edit details and the image after saving.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[430px] flex-col justify-center lg:min-h-[calc(100%-3.25rem)]">
                <h3
                  className="max-w-md text-2xl font-bold leading-tight text-green-deep"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Your recipe draft will appear here.
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
                  The saved recipe will include ingredients, instructions, timing, category, and an automatically selected food photo.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
