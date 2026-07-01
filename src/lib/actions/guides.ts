"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

// Per-user record of which contextual mini-guides (coachmarks) have been
// dismissed. Backed by user_settings.seen_guides (migration 019). RLS already
// scopes user_settings rows to their owner, so these run as the signed-in user.

export async function getSeenGuides(): Promise<string[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("seen_guides")
    .eq("user_id", user.id)
    .maybeSingle();
  // Column absent (migration 019 not applied) or no row → nothing seen yet.
  if (error) return [];
  return data?.seen_guides ?? [];
}

export async function markGuideSeen(guideId: string): Promise<ActionResult<string[]>> {
  const user = await requireUser();
  const supabase = await createClient();

  // Read-modify-write so we can dedupe; the array is tiny (a handful of ids).
  const current = await getSeenGuides();
  if (current.includes(guideId)) {
    return { success: true, data: current };
  }
  const next = [...current, guideId];

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, seen_guides: next }, { onConflict: "user_id" });
  if (error) return { success: false, error: error.message };
  return { success: true, data: next };
}

export async function resetGuides(): Promise<ActionResult<string[]>> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, seen_guides: [] }, { onConflict: "user_id" });
  if (error) return { success: false, error: error.message };
  return { success: true, data: [] };
}
