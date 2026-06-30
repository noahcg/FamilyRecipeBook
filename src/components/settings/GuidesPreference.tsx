"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { resetGuides } from "@/lib/actions/guides";
import { forgetLocalGuides } from "@/lib/guides/useGuides";

/**
 * Lets a user replay the contextual mini-guides. Clears the seen-guides record
 * (and the local cache) so the pulsing beacons reappear on each screen.
 */
export function GuidesPreference() {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleReset() {
    setError(null);
    startTransition(async () => {
      const result = await resetGuides();
      if (!result.success) {
        setError(result.error);
        return;
      }
      forgetLocalGuides();
      setDone(true);
    });
  }

  return (
    <div className="recipe-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Show tips again</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Bring back the little walkthrough hints — like how to invite family or
            add a recipe — that pop up around the app.
          </p>
          {done && (
            <p className="mt-2 text-sm font-semibold text-green-deep">
              Tips are back. Look for the dots on each screen.
            </p>
          )}
          {error && <p className="mt-2 text-sm font-semibold text-danger">{error}</p>}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          disabled={isPending}
          className="shrink-0 rounded-md"
        >
          <Sparkles size={14} /> {isPending ? "Resetting…" : "Show tips"}
        </Button>
      </div>
    </div>
  );
}
