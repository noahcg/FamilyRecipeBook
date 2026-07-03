"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { resetGuides } from "@/lib/actions/guides";
import { forgetLocalGuides } from "@/lib/guides/useGuides";

/**
 * Lets a user retake the onboarding welcome tour. Clears the seen-guides record
 * (and the local cache) so the welcome card reappears on the home screen.
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
          <p className="text-sm font-semibold text-ink">Replay the welcome tour</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Take the quick walkthrough again — cookbooks, inviting family, meal
            planning, and your grocery list.
          </p>
          {done && (
            <p className="mt-2 text-sm font-semibold text-green-deep">
              The tour is back — open Home to take it again.
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
          <Sparkles size={14} /> {isPending ? "Resetting…" : "Replay tour"}
        </Button>
      </div>
    </div>
  );
}
