"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { analyticsAllowed } from "@/lib/analytics/consent";

const PUBLIC_PATHS = new Set(["/", "/sign-in", "/pricing", "/privacy", "/terms", "/our-story", "/guides"]);

function publicPageOnly(event: BeforeSendEvent): BeforeSendEvent | null {
  if (!analyticsAllowed()) return null;
  const url = new URL(event.url);
  const path = url.pathname.replace(/\/$/, "") || "/";
  if (!PUBLIC_PATHS.has(path) && !/^\/guides\/[a-z0-9-]+$/.test(path)) return null;

  // Strip email, redirect destinations, invite tokens, and campaign parameters.
  return { ...event, url: `${url.origin}${path}` };
}

export function PublicAnalytics({ allowed }: { allowed: boolean }) {
  if (process.env.NODE_ENV !== "production" || !allowed) return null;
  return <Analytics beforeSend={publicPageOnly} />;
}
