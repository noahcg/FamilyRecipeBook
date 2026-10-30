export const CONSENT_KEY = "hc:analytics-consent";
export const NOTICE_VERSION = 2;
export const CONSENT_LIFETIME = 180 * 24 * 60 * 60 * 1000;
export type Choice = "accepted" | "rejected";

export function parseChoice(raw: string | null, now = Date.now()): Choice | null {
  try {
    const value = JSON.parse(raw || "null");
    if (!value || (value.version !== NOTICE_VERSION && !(value.version === 1 && value.choice === "rejected")) || !["accepted", "rejected"].includes(value.choice) ||
        typeof value.at !== "number" || value.at > now || now - value.at >= CONSENT_LIFETIME) return null;
    return value.choice as Choice;
  } catch { return null; }
}

let allowed = false;
let sessionOnly = false;
export function setAnalyticsPermission(choice: Choice | null, onlyThisDocument = false) {
  allowed = choice === "accepted";
  sessionOnly = onlyThisDocument;
}

export function analyticsAllowed(): boolean {
  if (!allowed || typeof window === "undefined") return false;
  if (sessionOnly) return true;
  try { return parseChoice(window.localStorage.getItem(CONSENT_KEY)) === "accepted"; }
  catch { return false; }
}

// No locations have been approved for a regional exception. Every visitor,
// including unknown locations, must explicitly opt in; no geo data is read.
export function validMeasurementId(value: string | undefined): value is string {
  return !!value && /^G-[A-Z0-9]+$/.test(value);
}

const PUBLIC_PATHS = new Set(["/", "/pricing", "/privacy", "/terms", "/our-story", "/guides", "/sign-in"]);
export function safePage(path: string): string | null {
  const normalized = path.replace(/\/$/, "") || "/";
  if (PUBLIC_PATHS.has(normalized)) return normalized;
  // All guide pages share a fixed template; arbitrary slugs never leave the browser.
  if (/^\/guides\/[a-z0-9-]+$/.test(normalized)) return "/guides/article";
  return null;
}
