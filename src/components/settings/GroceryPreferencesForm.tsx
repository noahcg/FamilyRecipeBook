"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { setGroceryDayLabelPref } from "@/lib/actions/grocery";

interface GroceryPreferencesFormProps {
  dayLabelsEnabled: boolean;
}

export function GroceryPreferencesForm({ dayLabelsEnabled }: GroceryPreferencesFormProps) {
  const [enabled, setEnabled] = useState(dayLabelsEnabled);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    setError(null);
    startTransition(async () => {
      const result = await setGroceryDayLabelPref(next);
      if (!result.success) {
        setEnabled(!next); // revert
        setError(result.error);
      }
    });
  }

  return (
    <div className="recipe-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Label ingredients by day</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            When you add this week&apos;s meals to your grocery list, each ingredient is
            tagged with the day it&apos;s planned for — so{" "}
            <span className="font-medium text-ink">ground beef</span> for Monday and Thursday
            dinners shows up as <span className="font-medium text-ink">Mon, Thu</span>.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Label grocery ingredients by meal-plan day"
          onClick={handleToggle}
          disabled={isPending}
          className={clsx(
            "inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors disabled:opacity-50",
            enabled ? "bg-green-deep" : "bg-line"
          )}
        >
          <span
            className={clsx(
              "h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
              enabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}
