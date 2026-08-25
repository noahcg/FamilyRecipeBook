/**
 * Shared between the sign-in form and the auth actions.
 *
 * Lives outside `@/lib/actions/auth` because that file is `"use server"` and
 * may only export async functions.
 */

/** Seconds Supabase makes a user wait between OTP requests for one address. */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

/**
 * Code length is a Supabase dashboard setting (Authentication → Email OTP
 * Length), not something the app controls, and it is currently 8 on this
 * project. Accept the whole range Supabase allows rather than hardcoding a
 * length the dashboard can change out from under us — a mismatch here means
 * the field rejects codes that are perfectly valid.
 */
export const OTP_MIN_LENGTH = 6;
export const OTP_MAX_LENGTH = 10;

/**
 * `expired` is surfaced separately because the two failures want different
 * UI: an expired code clears the field and re-enables resend immediately,
 * a wrong one keeps what was typed so it can be corrected.
 */
export type VerifyOtpResult =
  | { success: true; data: void }
  | { success: false; error: string; expired: boolean };

/**
 * `rateLimited` lets the form start its visible countdown when the server
 * turned a resend away, so the button stops inviting taps that cannot work.
 */
export type RequestOtpResult =
  | { success: true; data: void }
  | { success: false; error: string; rateLimited: boolean };
