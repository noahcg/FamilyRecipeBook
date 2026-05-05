"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { AIProvider } from "@/lib/types/database";
import type { ActionResult } from "@/lib/types";

export async function getAISettings(): Promise<{ ai_provider: AIProvider | null; ai_api_key: string | null }> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("ai_provider, ai_api_key")
    .eq("user_id", user.id)
    .single();
  return {
    ai_provider: (data?.ai_provider as AIProvider) ?? null,
    ai_api_key: data?.ai_api_key ?? null,
  };
}

export async function saveAISettings(
  provider: AIProvider | null,
  apiKey: string
): Promise<ActionResult> {
  const user = await requireUser();
  const key = apiKey.trim();

  if (provider && !key) {
    return { success: false, error: "Paste your API key to save this provider." };
  }

  if (key) {
    if (provider === "openai" && !key.startsWith("sk-")) {
      return { success: false, error: "OpenAI keys start with sk-" };
    }
    if (provider === "anthropic" && !key.startsWith("sk-ant-")) {
      return { success: false, error: "Anthropic keys start with sk-ant-" };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      ai_provider: key ? provider : null,
      ai_api_key: key || null,
    },
    { onConflict: "user_id" }
  );

  if (error) return { success: false, error: error.message };

  revalidatePath("/app/settings");
  return { success: true, data: undefined };
}
