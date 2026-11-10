import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/safeRedirect";
import { recordFirstSignIn } from "@/lib/analytics/recordFirstSignIn";
import { requireProfileName } from "@/lib/profileCompletion";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = getSafeRedirectPath(
    requestUrl.searchParams.get("redirect_to") ?? requestUrl.searchParams.get("next"),
    "/app",
    requestUrl.origin
  );

  if (tokenHash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      await recordFirstSignIn(supabase);
      if (data.user) await requireProfileName(data.user.id, nextPath);
      return NextResponse.redirect(new URL(nextPath, request.url));
    }
  }

  return NextResponse.redirect(new URL("/sign-in", request.url));
}
