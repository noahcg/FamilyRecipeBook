import type { SupabaseClient } from "@supabase/supabase-js";

/** Best effort: analytics must never prevent a successful sign-in. */
export async function recordFirstSignIn(supabase: SupabaseClient) {
  if (process.env.NODE_ENV !== "production") return;
  try {
    await supabase.rpc("record_first_sign_in");
  } catch {
    // Authentication has already succeeded. A missing analytics service must not block it.
  }
}
