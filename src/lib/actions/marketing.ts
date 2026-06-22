"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";

/**
 * Turn off marketing/announcement email for the profile owning this token.
 *
 * Public + unauthenticated (called from the unsubscribe link and the one-click
 * header endpoint), so it uses the service-role client and only ever flips a
 * boolean by token. Idempotent: an unknown token simply matches no rows.
 */
export async function unsubscribeByToken(token: string): Promise<void> {
  if (!token) return;
  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ marketing_opt_in: false })
    .eq("unsubscribe_token", token);
  if (error) {
    // Don't surface details to the caller — unsubscribe pages stay graceful.
    console.error("Failed to process unsubscribe:", error.message);
  }
}

/**
 * User-facing toggle for product announcements, bound to the signed-in user's
 * own profile (the "profiles: update own" RLS policy permits this).
 */
export async function setMarketingOptIn(optIn: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ marketing_opt_in: optIn })
    .eq("id", user.id);
  if (error) {
    return { success: false, error: error.message };
  }
  revalidatePath("/app/settings");
  return { success: true, data: undefined };
}
