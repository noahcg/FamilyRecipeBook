"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";

export function BillingButton({ mode = "checkout", autoStart = false, children }: { mode?: "checkout" | "portal"; autoStart?: boolean; children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openBilling = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/billing/${mode}`, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
      const responseText = await response.text();
      let data: { error?: string; url?: string } = {};
      if (responseText.trim()) {
        try { data = JSON.parse(responseText) as typeof data; }
        catch { throw new Error(`Billing request returned an invalid response (${response.status}).`); }
      }
      if (response.status === 401) {
        const nextPath = mode === "checkout" ? "/pricing?upgrade=1" : window.location.pathname;
        window.location.assign(`/sign-in?next=${encodeURIComponent(nextPath)}`);
        return;
      }
      if (!response.ok || !data.url) throw new Error(data.error ?? `Could not open billing (HTTP ${response.status}).`);
      window.location.assign(data.url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not open billing."); setLoading(false); }
  }, [mode]);
  useEffect(() => {
    if (!autoStart) return;
    const timer = window.setTimeout(() => { void openBilling(); }, 0);
    return () => window.clearTimeout(timer);
  }, [autoStart, openBilling]);
  return <div><Button type="button" onClick={openBilling} loading={loading}>{children}</Button>{error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}</div>;
}
