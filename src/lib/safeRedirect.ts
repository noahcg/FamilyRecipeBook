/**
 * Validates a caller-supplied redirect target before we send a user to it.
 *
 * `next` / `redirect_to` reach us from three places — the sign-in form, the
 * emailed link that lands on `/auth/confirm`, and the OAuth round trip through
 * `/auth/callback` — so every one of them funnels through here.
 *
 * Supabase round-trips absolute URLs, which is why `origin` is accepted: a
 * same-origin absolute URL is reduced to its path rather than rejected.
 */
export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback: string,
  origin?: string
): string {
  if (!value) return fallback;

  // A newline lets a crafted value smuggle a second header on some stacks.
  if (/[\n\r]/.test(value)) return fallback;

  if (value.startsWith("/")) {
    // `//evil.com` is protocol-relative, and browsers normalise the backslash
    // form `/\evil.com` into the same thing.
    if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
    return value;
  }

  if (origin) {
    try {
      const url = new URL(value);
      // Deliberately drops the hash — it is never needed and only widens what
      // an attacker can smuggle through.
      if (url.origin === origin) return `${url.pathname}${url.search}`;
    } catch {
      return fallback;
    }
  }

  return fallback;
}
