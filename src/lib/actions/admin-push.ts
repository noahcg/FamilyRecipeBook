"use server";

import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { configureWebPush, getVapidPublicKey, hasVapidConfig } from "@/lib/push/vapid";
import webPush from "web-push";
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
  if (!publicKey || !hasVapidConfig()) {
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
  const user = await requireAdmin();
  if (!endpoint) return { success: false, error: "Missing push subscription endpoint." };

  const admin = createServiceClient();
  const { error } = await admin
    .from("admin_push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

// Only test a saved subscription owned by the signed-in admin. Never broadcast.
export async function testAdminPush(endpoint: string): Promise<ActionResult> {
  const user = await requireAdmin();
  if (typeof endpoint !== "string" || !endpoint || endpoint.length > 4096) {
    return { success: false, error: "Reconnect this device before sending a test." };
  }
  const admin = createServiceClient();
  const { data, error } = await admin.from("admin_push_subscriptions")
    .select("id,endpoint,p256dh,auth").eq("user_id", user.id).eq("endpoint", endpoint).maybeSingle();
  if (error) return { success: false, error: "Could not check this device. Try again." };
  if (!data) return { success: false, error: "This device is not registered. Tap Reconnect to restore alerts." };
  try {
    if (!configureWebPush()) return { success: false, error: "Notification delivery is not configured on the server." };
    await webPush.sendNotification({ endpoint: data.endpoint, keys: { p256dh: data.p256dh, auth: data.auth } }, JSON.stringify({
      title: "Home Cooked test notification", body: "Notifications are working on this device.", url: "/app/admin",
    }), { TTL: 60, urgency: "high", timeout: 10000 });
    return { success: true, data: undefined };
  } catch (cause) {
    const code = typeof cause === "object" && cause && "statusCode" in cause ? Number(cause.statusCode) : null;
    if (code === 404 || code === 410) {
      await admin.from("admin_push_subscriptions").delete().eq("id", data.id).eq("user_id", user.id);
      return { success: false, error: "This notification subscription expired. Tap Reconnect to restore alerts." };
    }
    if (code === 401 || code === 403) return { success: false, error: "The push service rejected the notification key. Try Reconnect; if it persists, check the server's VAPID configuration." };
    return { success: false, error: "The push service could not accept the test. Please try again." };
  }
}
