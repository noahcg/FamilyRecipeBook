"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { profileNameSchema } from "@/lib/validators/profile";
import type { ActionResult } from "@/lib/types";

/** Name given to the household auto-created for a profile with no name yet. */
const PLACEHOLDER_HOUSEHOLD_NAME = "My Household";

/**
 * Sets the display name for the signed-in user.
 *
 * Sign-in no longer collects a name, so this is the only place it gets set
 * for anyone who arrives by email code.
 */
export async function setProfileName(fullName: string): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = profileNameSchema.safeParse({ full_name: fullName });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const name = parsed.data.full_name;

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: name })
    .eq("id", user.id);
  if (error) return { success: false, error: error.message };

  // Auth emails greet people by `user_metadata.full_name`, so keep it in step.
  // A `data`-only update sends no confirmation email.
  await supabase.auth.updateUser({ data: { full_name: name } });

  // The household was auto-created before we knew the name. Matching on the
  // placeholder means this can never overwrite one they renamed themselves.
  await supabase
    .from("households")
    .update({ name: `${name}'s Household` })
    .eq("owner_id", user.id)
    .eq("name", PLACEHOLDER_HOUSEHOLD_NAME);

  revalidatePath("/onboarding");
  revalidatePath("/app/settings");

  return { success: true, data: undefined };
}
