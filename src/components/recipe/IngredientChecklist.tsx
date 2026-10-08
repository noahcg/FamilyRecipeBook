"use client";

import { clsx } from "clsx";
import { scaleIngredientQuantity } from "@/lib/ingredientScaling";
import { displayIngredientAmount } from "@/lib/metricUnits";
import { useAccount } from "@/lib/context/AccountContext";
import type { RecipeIngredient } from "@/lib/types";

interface IngredientChecklistProps {
  ingredients: RecipeIngredient[];
  className?: string;
  scaleFactor?: number;
}

export function IngredientChecklist({ ingredients, className, scaleFactor = 1 }: IngredientChecklistProps) {
  const { metricUnits } = useAccount();

  function renderItem(ing: RecipeIngredient) {
    const quantity = scaleIngredientQuantity(ing.quantity, scaleFactor);
    const display = displayIngredientAmount(quantity, ing.unit, metricUnits);
    const label = [display.quantity, display.unit, ing.item].filter(Boolean).join(" ");

    return (
      <li key={ing.id} className="flex min-w-0 items-start gap-3">
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-sage" />
          <span className="min-w-0 break-words text-sm leading-normal text-ink">
            {label}
            {ing.note && (
              <span className="text-ink-soft ml-1">({ing.note})</span>
            )}
          </span>
      </li>
    );
  }

  // Collapse ingredients into contiguous group runs. Ungrouped recipes yield a
  // single run with a null label and render exactly as before (no heading).
  const groups: { label: string | null; items: RecipeIngredient[] }[] = [];
  for (const ing of ingredients) {
    const label = ing.group_label?.trim() ? ing.group_label.trim() : null;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(ing);
    else groups.push({ label, items: [ing] });
  }

  if (!groups.some((group) => group.label)) {
    return (
      <ul className={clsx("grid gap-x-12 gap-y-2 sm:grid-cols-2", className)}>
        {ingredients.map(renderItem)}
      </ul>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group, index) => (
        <div key={`${group.label ?? "ungrouped"}-${index}`}>
          {group.label && (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
              {group.label}
            </p>
          )}
          <ul className={clsx("grid gap-x-12 gap-y-2 sm:grid-cols-2", className)}>
            {group.items.map(renderItem)}
          </ul>
        </div>
      ))}
    </div>
  );
}
