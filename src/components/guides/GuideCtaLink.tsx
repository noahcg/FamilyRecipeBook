"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { useSyncExternalStore } from "react";
import { analyticsAllowed } from "@/lib/analytics/consent";

const campaignKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

export function GuideCtaLink({ href, slug, placement, className, children }: {
  href: "/sign-in" | "/pricing"; slug: string; placement: "midpoint" | "final"; className: string; children: React.ReactNode;
}) {
  const query = useSyncExternalStore(
    (notify) => { window.addEventListener("popstate", notify); return () => window.removeEventListener("popstate", notify); },
    () => {
      const current = new URLSearchParams(window.location.search);
      const campaign = new URLSearchParams();
      for (const key of campaignKeys) for (const value of current.getAll(key)) campaign.append(key, value);
      return campaign.toString();
    },
    () => "",
  );
  const destination = query ? `${href}?${query}` : href;
  return <Link href={destination} className={className} onClick={() => {
    if (process.env.NODE_ENV === "production" && analyticsAllowed()) track("guide_cta_click", { guide: slug, placement, destination: href });
  }}>{children}</Link>;
}
