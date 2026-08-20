import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dev-only: reveals the plaintext sign-in code for an address.
 *
 * The Send Email hook is an outbound webhook from Supabase's servers, so it
 * can never reach localhost — which means local sign-in can't be tested by
 * reading your inbox. Reading the code from logs or the database doesn't work
 * either (logs don't record it, and `auth.users.confirmation_token` is a
 * hash). `generateLink` is the one path that hands back the raw OTP, and it
 * sends no email of its own.
 *
 *   GET /dev/otp?email=you@example.com
 *   GET /dev/otp?email=you@example.com&create=1   (create the user first)
 *
 * Note this mints a NEW code that supersedes any earlier one, so always use
 * the code from the most recent call.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const email = params.get("email");
  if (!email) {
    return NextResponse.json(
      { error: "Pass ?email=you@example.com" },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  if (params.get("create") === "1") {
    // Skips the real signInWithOtp creation path, so prefer clicking
    // "Email me a code" in the form and leaving this off.
    await service.auth.admin.createUser({ email, email_confirm: true });
  }

  const { data, error } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint: "If this says the user does not exist, submit the address on /sign-in first (that creates it the way a real user would), then call this again. Or add &create=1.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    email,
    code: data.properties.email_otp,
    magicLink: data.properties.action_link,
    project: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
}
