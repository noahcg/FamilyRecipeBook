import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/safeRedirect";

function signInErrorUrl(request: NextRequest, error: "oauth" | "oauth_cancelled") {
  const requestUrl = new URL(request.url);
  const nextPath = getSafeRedirectPath(
    requestUrl.searchParams.get("next"),
    "/app",
    requestUrl.origin
  );
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("error", error);
  if (nextPath !== "/app") url.searchParams.set("next", nextPath);
  return url;
}

/**
 * OAuth landing point. `@supabase/ssr` pins both clients to PKCE, so the
 * provider hands back a `code` that has to be swapped for a session here —
 * the verifier lives in a cookie the browser wrote before redirecting out.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const nextPath = getSafeRedirectPath(
    requestUrl.searchParams.get("next"),
    "/app",
    requestUrl.origin
  );

  // Covers the user pressing Cancel on Google's consent screen.
  if (requestUrl.searchParams.get("error")) {
    return NextResponse.redirect(signInErrorUrl(request, "oauth_cancelled"));
  }

  const code = requestUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(signInErrorUrl(request, "oauth"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(signInErrorUrl(request, "oauth"));
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
