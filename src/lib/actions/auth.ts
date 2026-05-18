"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

function getSafeRedirectPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}

export async function signIn(
  email: string,
  password: string,
  redirectTo?: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };
  redirect(getSafeRedirectPath(redirectTo));
}

export async function signUp(
  fullName: string,
  email: string,
  password: string,
  redirectTo?: string | null
): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const supabase = await createClient();
  const nextPath = getSafeRedirectPath(redirectTo);
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}${nextPath}`,
    },
  });
  if (error) return { success: false, error: error.message };
  // When email confirmation is required, session is null
  if (!data.session) {
    return { success: true, data: { needsConfirmation: true } };
  }
  redirect(nextPath);
}

export async function requestPasswordReset(
  email: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
  // Don't leak whether the email exists — return success either way unless
  // it's a clear server-side failure.
  if (error && error.status && error.status >= 500) {
    return { success: false, error: error.message };
  }
  return { success: true, data: undefined };
}

export async function updatePassword(
  password: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      error: "Your reset link is no longer valid. Request a new one and try again.",
    };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function signOut(formData?: FormData): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const value = formData?.get("redirect_to");
  const path =
    typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
      ? value
      : "/";
  redirect(path);
}
