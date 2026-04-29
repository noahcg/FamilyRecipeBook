"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFirstBookId } from "@/lib/actions/books";
import type { ActionResult } from "@/lib/types";

export async function signIn(
  email: string,
  password: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };
  redirect("/app");
}

export async function signUp(
  fullName: string,
  email: string,
  password: string
): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { success: false, error: error.message };
  // When email confirmation is required, session is null
  if (!data.session) {
    return { success: true, data: { needsConfirmation: true } };
  }
  redirect("/onboarding/create-book");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
