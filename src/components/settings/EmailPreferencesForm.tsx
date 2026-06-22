"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { setMarketingOptIn } from "@/lib/actions/marketing";

interface EmailPreferencesFormProps {
  optedIn: boolean;
}

export function EmailPreferencesForm({ optedIn }: EmailPreferencesFormProps) {
  const [enabled, setEnabled] = useState(optedIn);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    setError(null);
    startTransition(async () => {
      const result = await setMarketingOptIn(next);
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
          <p className="text-sm font-semibold text-ink">Product announcements</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Occasional emails about new features, updates, and pricing. Account emails like
            invitations and password resets are always sent regardless of this setting.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Receive product announcement emails"
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
