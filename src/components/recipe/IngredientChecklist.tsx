"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { RecipeIngredient } from "@/lib/types";

interface IngredientChecklistProps {
  ingredients: RecipeIngredient[];
  className?: string;
}

export function IngredientChecklist({ ingredients, className }: IngredientChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ul className={clsx("grid gap-x-8 gap-y-2 sm:grid-cols-2", className)}>
      {ingredients.map((ing) => {
        const isChecked = checked.has(ing.id);
        const label = [ing.quantity, ing.unit, ing.item].filter(Boolean).join(" ");

        return (
          <li key={ing.id}>
            <button
              type="button"
              onClick={() => toggle(ing.id)}
              className="group flex w-full items-start gap-3 text-left"
              aria-pressed={isChecked}
            >
              <span
                className={clsx(
                  "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-xs border transition-colors",
                  isChecked
                    ? "bg-green-deep border-green-deep"
                    : "border-line group-hover:border-green-sage"
                )}
              >
                {isChecked && (
                  <svg className="w-3 h-3 text-ink-inverse" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={clsx("text-sm leading-normal text-ink transition-opacity", isChecked && "line-through opacity-40")}>
                {label}
                {ing.note && (
                  <span className="text-ink-soft ml-1">({ing.note})</span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
