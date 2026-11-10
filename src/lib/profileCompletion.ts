import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function needsProfileName(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("full_name, requires_profile_name").eq("id", userId).maybeSingle();
  if (error || !data) throw new Error("Unable to load your profile. Please try again.");
  return data.requires_profile_name && !data.full_name?.trim();
}

export async function requireProfileName(userId: string, nextPath: string): Promise<void> {
  if (await needsProfileName(userId)) {
    redirect(`/complete-profile?next=${encodeURIComponent(nextPath)}`);
  }
}
