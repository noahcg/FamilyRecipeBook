"use server";

import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getAppBaseUrl } from "@/lib/appUrl";
import { getSafeRedirectPath } from "@/lib/safeRedirect";
import {
  OTP_RESEND_COOLDOWN_SECONDS,
  type RequestOtpResult,
  type VerifyOtpResult,
} from "@/lib/otp";
import { emailEntrySchema, otpCodeSchema } from "@/lib/validators/auth";

/**
 * Never return `error.message` verbatim from the send step. GoTrue's wording
 * differs between "user exists" and "user created", which would turn this
 * form into an account-enumeration oracle.
 */
function describeSendError(error: AuthError): { error: string; rateLimited: boolean } {
  // Saying the existing code still works matters: otherwise someone who
  // double-taps resend reads this as "nothing was sent" and gives up.
  const rateLimitedCopy = {
    error: `You already have a code — check your email. You can request a new one in ${OTP_RESEND_COOLDOWN_SECONDS} seconds.`,
    rateLimited: true,
  };

  switch (error.code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return rateLimitedCopy;
    case "email_address_invalid":
      return {
        error: "That email address doesn't look right. Check it and try again.",
        rateLimited: false,
      };
    case "signup_disabled":
      return { error: "New accounts are paused right now. Try again later.", rateLimited: false };
    case "user_banned":
      return {
        error: "This account isn't available. Get in touch if you think that's a mistake.",
        rateLimited: false,
      };
    default:
      if (error.status === 429) return rateLimitedCopy;
      return {
        error: "We couldn't send your code just now. Try again in a moment.",
        rateLimited: false,
      };
  }
}

function describeVerifyError(error: AuthError): { error: string; expired: boolean } {
  switch (error.code) {
    case "otp_expired":
      return { error: "That code has expired. Send a new one.", expired: true };
    case "over_request_rate_limit":
      return { error: "Too many attempts. Wait a minute, then try again.", expired: false };
    default:
      return {
        error: "That code isn't right. Double-check it against your email and try again.",
        expired: false,
      };
  }
}

/**
 * Emails a sign-in code, creating the account if the address is new.
 *
 * Deliberately does not redirect and does not reveal whether the account
 * already existed — the caller advances to the code step either way.
 *
 * `shouldCreateUser` must stay `true`: flipping it to `false` makes GoTrue
 * answer `otp_disabled` for unknown addresses, which is a clean enumeration
 * oracle.
 */
export async function requestEmailOtp(
  email: string,
  redirectTo?: string | null
): Promise<RequestOtpResult> {
  const supabase = await createClient();
  const parsed = emailEntrySchema.safeParse({ email });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      rateLimited: false,
    };
  }

  const normalizedEmail = parsed.data.email;
  const nextPath = getSafeRedirectPath(redirectTo, "/app");

  // The same email also carries a magic link as a fallback; point it at the
  // confirm route so it honours `next` too.
  const emailRedirectTo = `${getAppBaseUrl()}/auth/confirm?redirect_to=${encodeURIComponent(nextPath)}`;

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: true, emailRedirectTo },
  });

  if (error) return { success: false, ...describeSendError(error) };
  return { success: true, data: undefined };
}

/**
 * Redeems a sign-in code and starts the session.
 *
 * `type: "email"` covers codes issued for both sign-up and sign-in — the
 * `signup` and `magiclink` verify types are deprecated. Do not retry with a
 * different type on failure: the token is single-use, so the first attempt
 * consumes it and the retry fails for the wrong reason.
 */
export async function verifyEmailOtp(
  email: string,
  token: string,
  redirectTo?: string | null
): Promise<VerifyOtpResult> {
  const supabase = await createClient();
  const parsedEmail = emailEntrySchema.safeParse({ email });
  if (!parsedEmail.success) {
    return {
      success: false,
      error: parsedEmail.error.issues[0].message,
      expired: false,
    };
  }

  const parsedToken = otpCodeSchema.safeParse({ code: token });
  if (!parsedToken.success) {
    return {
      success: false,
      error: parsedToken.error.issues[0].message,
      expired: false,
    };
  }

  const { error } = await supabase.auth.verifyOtp({
    email: parsedEmail.data.email,
    token: parsedToken.data.code,
    type: "email",
  });
  if (error) return { success: false, ...describeVerifyError(error) };
  redirect(getSafeRedirectPath(redirectTo, "/app"));
}

export async function signOut(formData?: FormData): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const value = formData?.get("redirect_to");
  redirect(getSafeRedirectPath(typeof value === "string" ? value : null, "/"));
}
