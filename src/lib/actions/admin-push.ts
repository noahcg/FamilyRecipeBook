"use server";

import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { getVapidPublicKey } from "@/lib/push/vapid";
import type { ActionResult } from "@/lib/types";

interface PushSubscriptionInput {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
}

function parseSubscription(subscription: PushSubscriptionInput) {
  const endpoint = typeof subscription.endpoint === "string" ? subscription.endpoint : "";
  const p256dh = typeof subscription.keys?.p256dh === "string" ? subscription.keys.p256dh : "";
  const auth = typeof subscription.keys?.auth === "string" ? subscription.keys.auth : "";

  if (!endpoint || !p256dh || !auth) return null;
  return { endpoint, p256dh, auth };
}

export async function getAdminPushPublicKey(): Promise<ActionResult<string>> {
  await requireAdmin();
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return { success: false, error: "Push notifications are not configured yet." };
  }
  return { success: true, data: publicKey };
}

export async function subscribeAdminToPush(
  subscription: PushSubscriptionInput,
  userAgent?: string
): Promise<ActionResult> {
  const user = await requireAdmin();
  const parsed = parseSubscription(subscription);
  if (!parsed) {
    return { success: false, error: "Browser push subscription was incomplete." };
  }

  const admin = createServiceClient();
  const { error } = await admin.from("admin_push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.endpoint,
      p256dh: parsed.p256dh,
      auth: parsed.auth,
      user_agent: userAgent?.slice(0, 500) ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function unsubscribeAdminFromPush(endpoint: string): Promise<ActionResult> {
  await requireAdmin();
  if (!endpoint) return { success: false, error: "Missing push subscription endpoint." };

  const admin = createServiceClient();
  const { error } = await admin
    .from("admin_push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}
