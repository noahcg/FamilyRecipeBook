import "server-only";
import webPush, { type PushSubscription } from "web-push";
import { createServiceClient } from "@/lib/supabase/service";
import { configureWebPush } from "./vapid";

interface AdminPushPayload {
  title: string;
  body: string;
  url?: string;
}

interface AdminPushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function toPushSubscription(row: AdminPushSubscriptionRow): PushSubscription {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}

export async function sendAdminPush(payload: AdminPushPayload) {
  if (!configureWebPush()) return;

  const admin = createServiceClient();
  const { data, error } = await admin
    .from("admin_push_subscriptions")
    .select("id,endpoint,p256dh,auth");

  if (error) {
    console.error("[admin-push] Could not read subscriptions:", error.message);
    return;
  }

  const subscriptions = (data ?? []) as AdminPushSubscriptionRow[];
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          toPushSubscription(subscription),
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url ?? "/app/admin",
          })
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await admin.from("admin_push_subscriptions").delete().eq("id", subscription.id);
          return;
        }

        console.error("[admin-push] Could not send notification:", error);
      }
    })
  );
}

export async function notifyAdminOfNewSignup({
  email,
  fullName,
}: {
  email: string;
  fullName?: string | null;
}) {
  await sendAdminPush({
    title: "New Home Cooked signup",
    body: fullName ? `${fullName} signed up with ${email}.` : `${email} signed up.`,
    url: "/app/admin",
  });
}
