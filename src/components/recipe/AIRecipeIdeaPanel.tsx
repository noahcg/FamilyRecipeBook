"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChefHat,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button, Select } from "@/components/ui";
import {
  generateRecipeIdea,
  saveRecipeIdea,
  type AIRecipeIdea,
} from "@/lib/actions/aiRecipes";
import { formatDuration } from "@/lib/formatDuration";
import { useAccount } from "@/lib/context/AccountContext";
import { displayIngredientAmount, displayRecipeTemperatures } from "@/lib/metricUnits";
import { CookbookBackLink } from "@/components/book/CookbookBackLink";
import { IdeaCookView } from "@/components/recipe/IdeaCookView";

import { TonightsTable } from "@/components/recipe/TonightsTable";
import { buildIdeaTablePrompt, defaultIdeaTable, describeIdeaTable } from "@/lib/ideaTable";

interface AIRecipeIdeaPanelProps {
  bookId: string;
  bookOptions?: { id: string; title: string }[];
  initialPrompt?: string;
  autoGenerate?: boolean;
  showCookbookBackLink?: boolean;
}

// Open-ended prompts for the "Get Inspired" / surprise entry point. One is
// picked at random each time the panel auto-generates, so every click differs.
const SURPRISE_PROMPTS = [
  "A quick, satisfying breakfast to start the day.",
  "A generous weekend brunch worth sharing.",
  "A bright, fresh lunch full of vegetables that still feels satisfying.",
  "A make-ahead lunch that packs well for a busy day.",
  "A cozy, comforting dinner that feels like a treat on an ordinary night.",
  "A quick weeknight dinner I can pull together in under 30 minutes.",
  "A simple homemade dessert or sweet bake that doesn't take over the day.",
  "A fruit-filled dessert worth saving in our cookbook.",
  "A satisfying homemade snack for the afternoon.",
  "A crowd-pleasing appetizer to share around the table.",
  "A flavorful side dish built mostly from pantry staples.",
  "A refreshing homemade drink for a relaxed afternoon.",
];

export function AIRecipeIdeaPanel({
  bookId,
  bookOptions,
  initialPrompt,
  autoGenerate,
  showCookbookBackLink = false,
}: AIRecipeIdeaPanelProps) {
  const router = useRouter();
  const { metricUnits } = useAccount();
  const assignmentOptions = bookOptions?.length
    ? bookOptions
    : [{ id: bookId, title: "This cookbook" }];
  const initialBookId = assignmentOptions.some((book) => book.id === bookId)
    ? bookId
    : assignmentOptions[0]?.id ?? bookId;
  const [selectedBookId, setSelectedBookId] = useState(initialBookId);
  const resolvedBookId = assignmentOptions.some((book) => book.id === selectedBookId)
    ? selectedBookId
    : initialBookId;
  const selectedBook = assignmentOptions.find((book) => book.id === resolvedBookId) ?? assignmentOptions[0];
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [table, setTable] = useState(defaultIdeaTable);
  const [generatedFor, setGeneratedFor] = useState("");
  const [idea, setIdea] = useState<AIRecipeIdea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [cookOpen, setCookOpen] = useState(false);
  const didAutoGenerate = useRef(false);

  function handleGenerate(nextPrompt = prompt) {
    const trimmed = buildIdeaTablePrompt(nextPrompt, table);
    const summary = describeIdeaTable(table);
    setPrompt(nextPrompt);
    setError(null);
    // A fresh idea replaces whatever was open in the cook view.
    setCookOpen(false);
    startGenerating(async () => {
      try {
        const result = await generateRecipeIdea(trimmed, resolvedBookId);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setIdea(result.data);
        setGeneratedFor(summary);
      } catch {
        setError("We couldn’t generate an idea. Please try again.");
      }
    });
  }

  function handleSave() {
    if (!idea) return;
    setError(null);
    startSaving(async () => {
      try {
        const result = await saveRecipeIdea(resolvedBookId, idea);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/app/books/${resolvedBookId}/recipes/${result.data.id}`);
      } catch {
        setError("We couldn’t save this idea. Your draft is still here; please try again.");
      }
    });
  }

  // Linked prompts and "Get Inspired" both generate straight away so the user
  // lands on a finished draft. Pick a random prompt only when none was passed.
  useEffect(() => {
    if (autoGenerate && !didAutoGenerate.current) {
      didAutoGenerate.current = true;
      const seeded = initialPrompt?.trim();
      const chosen =
        seeded && seeded.length >= 10
          ? seeded
          : SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
      handleGenerate(chosen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, initialPrompt]);

  // "Make it now" swaps the whole panel for a recipe-page-style cook view, in
  // normal page flow (not an overlay) so it sits in the shell like a real recipe.
  if (idea && cookOpen) {
    return (
      <IdeaCookView
        idea={idea}
        onClose={() => setCookOpen(false)}
        onSave={handleSave}
        isSaving={isSaving}
        error={error}
        cookbookTitle={selectedBook?.title ?? "your cookbook"}
      />
    );
  }

  return (
    <div className="min-h-dvh px-4 py-8 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-[1240px]">
        <header className="mb-8 border-b border-line-soft pb-7">
          {showCookbookBackLink ? (
            <CookbookBackLink bookId={bookId} className="mb-4" />
          ) : null}
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
            <Sparkles size={15} />
            Recipe ideas
          </p>
          <h1
            className="max-w-4xl text-4xl font-bold leading-tight text-green-deep lg:text-5xl"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Need an Idea?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
            A little inspiration for your people, your budget, and any meal of the day.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] xl:gap-12">
          <section className="min-w-0">
            <TonightsTable value={table} onChange={setTable} disabled={isGenerating || isSaving} />

            {assignmentOptions.length > 1 && (
              <div className="mt-4">
                <Select
                  id="idea-book"
                  label="Save to cookbook"
                  value={resolvedBookId}
                  disabled={isGenerating || isSaving}
                  onChange={(event) => setSelectedBookId(event.target.value)}
                  className="h-12 text-sm"
                >
                  {assignmentOptions.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {assignmentOptions.length === 1 && selectedBook && (
              <div className="mt-4 rounded-md border border-line-soft bg-paper-warm px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Saving to</p>
                <p className="mt-1 text-sm font-extrabold text-green-deep">{selectedBook.title}</p>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-3 rounded-md border border-danger/20 bg-card-muted px-3 py-2 text-sm font-semibold text-danger">
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
                disabled={isGenerating || isSaving}
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isGenerating ? "Finding inspiration…" : "Find an idea"}
              </Button>
              {idea && (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="rounded-md"
                  onClick={() => handleGenerate()}
                  disabled={isGenerating || isSaving}
                >
                  Try Another
                </Button>
              )}
            </div>

            <p className="mt-4 max-w-md text-xs leading-relaxed text-ink-muted">
              AI ideas aren’t verified allergy safe. Check ingredients, product labels, and preparation before cooking.
            </p>
          </section>

          <section className="min-w-0 border-line-soft lg:border-l lg:pl-6 xl:pl-8">
            <div className="mb-5 flex max-w-2xl items-baseline gap-4">
              <h2
                className="text-2xl font-bold leading-tight text-green-deep"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                On the menu
              </h2>
              <span className="h-px flex-1 bg-line-soft" />
            </div>

            {isGenerating ? (
              <div role="status" className="flex min-h-[430px] flex-col items-center justify-center gap-4 rounded-xl border border-line-soft bg-paper-warm p-6 text-center">
                <Loader2 size={28} className="animate-spin text-green-deep" />
                <p className="font-semibold text-green-deep">Finding inspiration for your table…</p>
                <p className="text-sm text-ink-muted">Bringing your ingredients and preferences together.</p>
              </div>
            ) : idea ? (
              <div>
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
                    AI recipe idea
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

                <p className="mb-5 rounded-md bg-paper-warm p-3 text-sm leading-relaxed text-ink-muted"><span className="font-bold text-green-deep">Requested for this draft: </span>{generatedFor}</p>
                <div className="mb-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-ink-muted">
                  <span>Serves {idea.servings}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={15} />
                    {formatDuration(idea.prep_minutes + idea.cook_minutes)}
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
                            {[...Object.values(displayIngredientAmount(ingredient.quantity, ingredient.unit, metricUnits)), ingredient.item]
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
                          <span>{displayRecipeTemperatures(instruction.body, metricUnits)}</span>
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
                    onClick={() => setCookOpen(true)}
                    disabled={isSaving}
                  >
                    <ChefHat size={16} />
                    Make it now
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="rounded-md"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Save to {selectedBook?.title ?? "Cookbook"}
                  </Button>
                  <p className="text-xs text-ink-soft">
                    Cook it right away, or save it to edit details and the image.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[430px] flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-card/40 px-6 py-12 text-center lg:min-h-[calc(100%-3.25rem)]">
                <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-soft text-green-deep/80">
                  <Sparkles size={26} strokeWidth={1.6} />
                </span>
                <p className="text-base font-semibold text-ink">
                  A recipe idea, made around your table
                </p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
                  Choose a meal type, budget, dietary needs, and time, then find an idea.
                  You’ll get a full recipe to cook now or keep in your cookbook.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
