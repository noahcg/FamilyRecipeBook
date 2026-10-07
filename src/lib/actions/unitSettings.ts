"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function setMetricUnits(enabled: boolean): Promise<ActionResult> {
  if (typeof enabled !== "boolean") return { success: false, error: "Choose a valid unit preference." };
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, metric_units: enabled },
    { onConflict: "user_id" }
  );
  if (error) return { success: false, error: "Could not save your unit preference. Try again." };
  revalidatePath("/app", "layout");
  return { success: true, data: undefined };
}
