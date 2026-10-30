"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { analyticsAllowed, CONSENT_KEY, NOTICE_VERSION, parseChoice, safePage, setAnalyticsPermission, validMeasurementId, type Choice } from "@/lib/analytics/consent";
import { PublicAnalytics } from "@/components/analytics/PublicAnalytics";

const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const enabled = validMeasurementId(id) && process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
const OPEN = "hc:open-cookie-settings";
type GaWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; [key: `ga-disable-${string}`]: unknown };

export function CookieSettingsLink() {
  return <button type="button" className="min-h-11 underline underline-offset-2 hover:text-green-deep focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => window.dispatchEvent(new Event(OPEN))}>Cookie settings</button>;
}

function clearCookies() {
  const host = location.hostname.split(".");
  const domains = ["", ...host.map((_, i) => host.slice(i).join("."))];
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.trim().split("=")[0];
    if (!/^_ga(?:_|$)/.test(name)) continue;
    for (const domain of domains) document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}; SameSite=Lax`;
  }
}

export function ConsentAnalytics() {
  const path = usePathname();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const lastPage = useRef<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { const saved = parseChoice(localStorage.getItem(CONSENT_KEY)); setAnalyticsPermission(saved); setChoice(saved); } catch { setAnalyticsPermission(null); }
      setReady(true);
    }, 0);
    const show = () => setOpen(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== CONSENT_KEY && event.key !== null) return;
      const next = parseChoice(event.newValue);
      setAnalyticsPermission(next);
      if (next !== "accepted") {
        if (id) (window as unknown as GaWindow)[`ga-disable-${id}`] = true;
        clearCookies();
        // A loaded tag cannot be reliably unloaded; start a clean document.
        if (document.getElementById("hc-ga") || document.querySelector('script[src*="/_vercel/insights/"]')) location.reload();
      }
      setChoice(next);
    };
    window.addEventListener(OPEN, show);
    window.addEventListener("storage", sync);
    return () => { window.clearTimeout(timer); window.removeEventListener(OPEN, show); window.removeEventListener("storage", sync); };
  }, []);

  useEffect(() => {
    if (!ready || choice !== "accepted" || !enabled || !id || !analyticsAllowed()) return;
    const page = safePage(path);
    const w = window as unknown as GaWindow;
    if (!page) {
      if (document.getElementById("hc-ga")) { w[`ga-disable-${id}`] = true; location.reload(); }
      lastPage.current = null;
      return;
    }
    if (!document.getElementById("hc-ga")) {
      w.dataLayer = w.dataLayer || [];
      // Google tag consumes the arguments object used by its documented queue.
      // eslint-disable-next-line prefer-rest-params
      w.gtag = function () { w.dataLayer!.push(arguments); };
      w.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      w.gtag("consent", "update", { analytics_storage: "granted" });
      w.gtag("js", new Date());
      w.gtag("config", id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: `${location.origin}/`, page_referrer: "", page_title: "Home Cooked" });
      const script = document.createElement("script");
      script.id = "hc-ga";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(script);
    }
    if (lastPage.current !== path) {
      lastPage.current = path;
      w.gtag?.("event", "page_view", { page_location: `${location.origin}${page}`, page_referrer: "", page_title: "Home Cooked" });
    }
  }, [choice, path, ready]);

  function choose(next: Choice) {
    // Block callbacks synchronously before state updates or a clean reload.
    setAnalyticsPermission(null);
    if (next === "rejected") {
      if (id) (window as unknown as GaWindow)[`ga-disable-${id}`] = true;
      clearCookies();
    }
    let persisted = false;
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice: next, version: NOTICE_VERSION, at: Date.now() })); persisted = true; } catch {
      // Avoid restoring a stale acceptance on a later visit when removal works
      // even though writing the new preference failed (for example, quota).
      if (next === "rejected") { try { localStorage.removeItem(CONSENT_KEY); } catch { /* storage is unavailable */ } }
    }
    setAnalyticsPermission(next, !persisted);
    if (next === "accepted" && id) (window as unknown as GaWindow)[`ga-disable-${id}`] = false;
    setChoice(next);
    setOpen(false);
    if (next === "rejected" && persisted && (document.getElementById("hc-ga") || document.querySelector('script[src*="/_vercel/insights/"]'))) location.reload();
  }
  return <>
    <PublicAnalytics allowed={ready && choice === "accepted"} />
    {ready && (open || (process.env.NODE_ENV === "production" && choice === null)) && <section aria-label="Analytics cookie preferences" className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-md border border-line bg-card p-4 text-ink shadow-lg sm:left-auto sm:right-6">
      <p className="font-bold">Analytics preferences</p>
      <p className="mt-1 text-sm">Optional Google Analytics and Vercel Web Analytics help us understand visits to public pages. Google and Vercel receive analytics data if you accept. Your choice is saved for 180 days. You can change it in Cookie settings. See our <a href="/privacy" className="underline">privacy policy</a>.</p>
      <p className="mt-2 text-sm" aria-live="polite">Current choice: {choice === "accepted" ? "accepted" : choice === "rejected" ? "rejected" : "not set"}.</p>
      <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => choose("accepted")}>Accept analytics</Button><Button variant="secondary" onClick={() => choose("rejected")}>Reject analytics</Button>{open && <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>}</div>
    </section>}
  </>;
}
