"use client";

import { useId } from "react";
import { ChevronRight } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui";
import type { IdeaTable } from "@/lib/ideaTable";

const diets = ["Gluten free", "Dairy free", "Vegetarian", "Vegan"];

export function TonightsTable({ value, onChange, disabled }: {
  value: IdeaTable;
  onChange: (value: IdeaTable) => void;
  disabled: boolean;
}) {
  const tableId = useId();
  function update(patch: Partial<IdeaTable>) { onChange({ ...value, ...patch }); }
  const dietarySummary = [
    ...value.diets,
    value.allergies.trim() ? `Avoid: ${value.allergies.trim()}` : "",
  ].filter(Boolean).join(" · ");

  return (
    <fieldset disabled={disabled} className="mb-6 min-w-0">
      <legend
        className="mb-4 text-xl font-bold text-green-deep"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        Your table
      </legend>

      <div className="divide-y divide-line-soft">
        <div className="flex min-h-16 items-center justify-between gap-4 py-2">
          <label htmlFor={`${tableId}-servings`} className="text-sm font-semibold text-ink">Number of people</label>
          <div className="w-40 shrink-0">
            <Select id={`${tableId}-servings`} className="min-h-11 text-sm" value={value.servings} onChange={event => update({ servings: event.target.value })}>
              {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(number => (
                <option key={number} value={number}>{number} {number === 1 ? "person" : "people"}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex min-h-16 items-center justify-between gap-4 py-2">
          <label htmlFor={`${tableId}-budget`} className="text-sm font-semibold text-ink">Budget</label>
          <div className="w-40 shrink-0">
            <Select id={`${tableId}-budget`} className="min-h-11 text-sm" value={value.budget} onChange={event => update({ budget: event.target.value })}>
              <option value="flexible">Flexible</option>
              <option value="budget">Budget friendly</option>
            </Select>
          </div>
        </div>
        <div className="flex min-h-16 items-center justify-between gap-4 py-2">
          <label htmlFor={`${tableId}-time`} className="text-sm font-semibold text-ink">Time available</label>
          <div className="w-40 shrink-0">
            <Select id={`${tableId}-time`} className="min-h-11 text-sm" value={value.minutes} onChange={event => update({ minutes: event.target.value })}>
              <option value="any">Any time</option>
              {[15, 30, 45, 60].map(number => <option key={number} value={number}>{number} min max</option>)}
            </Select>
          </div>
        </div>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-start gap-3 py-4 text-sm font-semibold text-green-deep focus-visible:outline-green-deep [&::-webkit-details-marker]:hidden">
            <ChevronRight size={16} aria-hidden="true" className="mt-0.5 shrink-0 transition-transform group-open:rotate-90" />
            <span className="min-w-0">
              Dietary needs &amp; allergies
              {dietarySummary && <span className="mt-1 block break-words text-xs font-normal leading-relaxed text-ink-muted">{dietarySummary}</span>}
            </span>
          </summary>
          <div className="space-y-4 pb-5">
            <fieldset>
              <legend className="sr-only">Dietary preferences</legend>
              <div className="grid grid-cols-2 gap-x-3">
                {diets.map(diet => (
                  <label key={diet} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-green-deep"
                      checked={value.diets.includes(diet)}
                      onChange={event => update({ diets: event.target.checked ? [...value.diets, diet] : value.diets.filter(item => item !== diet) })}
                    />
                    {diet}
                  </label>
                ))}
              </div>
            </fieldset>
            <Input
              label="Ingredients to exclude"
              value={value.allergies}
              maxLength={500}
              onChange={event => update({ allergies: event.target.value })}
              placeholder="e.g. peanuts, sesame"
              hint="Include all allergies and required exclusions."
            />
          </div>
        </details>
      </div>

      <div className="mt-5">
            <Textarea
              label="Use what I have"
              value={value.pantry}
              maxLength={1500}
              onChange={event => update({ pantry: event.target.value })}
              placeholder="Rice, carrots, spinach…"
              hint="We’ll use these where they fit your needs."
            />
      </div>
    </fieldset>
  );
}
