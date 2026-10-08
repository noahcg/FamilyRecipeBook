"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { useAccount } from "@/lib/context/AccountContext";
import { setMetricUnits } from "@/lib/actions/unitSettings";

export function UnitPreferencesForm() {
  const { metricUnits, setMetricUnits: setLocalUnits } = useAccount();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !metricUnits;
    setLocalUnits(next);
    setError(null);
    startTransition(async () => {
      const result = await setMetricUnits(next);
      if (!result.success) {
        setLocalUnits(!next);
        setError(result.error);
      }
    });
  }

  return <div className="recipe-card p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">Recipe measurements</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">Recipes and import previews show supported measurements in your preferred units. Saved source measurements stay as written unless you edit them.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-ink-muted sm:pt-0.5">
        <span className={clsx(!metricUnits && "text-green-deep")}>Imperial</span>
        <button type="button" role="switch" aria-label="Metric measurements" aria-checked={metricUnits} onClick={toggle} disabled={pending}
          className={clsx("inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors disabled:opacity-50", metricUnits ? "bg-green-deep" : "bg-line")}>
          <span className={clsx("h-5 w-5 rounded-full bg-white shadow-sm transition-transform", metricUnits ? "translate-x-5" : "translate-x-0")} />
        </button>
        <span className={clsx(metricUnits && "text-green-deep")}>Metric</span>
      </div>
    </div>
    {error && <p role="alert" className="mt-3 text-sm font-semibold text-danger">{error}</p>}
  </div>;
}
