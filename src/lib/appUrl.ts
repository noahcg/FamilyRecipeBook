/**
 * Base URL helpers.
 *
 * Kept apart from `@/lib/email/sendEmail` so that server actions can build
 * links without pulling the Resend client into their bundle.
 */
export function getAppBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL is required for production email links.");
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getDefaultLogoUrl() {
  return `${getAppBaseUrl()}/images/homecooked.png`;
}
