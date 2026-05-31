"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import {
  getAdminPushPublicKey,
  subscribeAdminToPush,
  unsubscribeAdminFromPush,
} from "@/lib/actions/admin-push";

type Status = "checking" | "unsupported" | "unconfigured" | "denied" | "idle" | "subscribed";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function getRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.ready;
}

export function PushSubscriptionToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function checkState() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }

      const publicKey = await getAdminPushPublicKey();
      if (!publicKey.success) {
        if (!cancelled) setStatus("unconfigured");
        return;
      }

      const registration = await getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (!cancelled) setStatus(subscription ? "subscribed" : "idle");
    }

    void checkState().catch((error) => {
      console.error("[push-toggle] state check failed:", error);
      if (!cancelled) {
        setMessage("Could not check this device's notification status.");
        setStatus("idle");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function enablePush() {
    startTransition(async () => {
      setMessage(null);

      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission === "denied") {
          setStatus("denied");
          return;
        }
        if (permission !== "granted") return;
      }

      const publicKey = await getAdminPushPublicKey();
      if (!publicKey.success) {
        setStatus("unconfigured");
        setMessage(publicKey.error);
        return;
      }

      const registration = await getRegistration();
      if (!registration) {
        setStatus("unsupported");
        return;
      }

      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey.data),
        }));

      const result = await subscribeAdminToPush(
        subscription.toJSON(),
        navigator.userAgent
      );

      if (!result.success) {
        setMessage(result.error);
        return;
      }

      setStatus("subscribed");
      setMessage("Push notifications are enabled on this device.");
    });
  }

  function disablePush() {
    startTransition(async () => {
      setMessage(null);
      const registration = await getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) {
        setStatus("idle");
        return;
      }

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      const result = await unsubscribeAdminFromPush(endpoint);
      if (!result.success) {
        setMessage(result.error);
        return;
      }

      setStatus("idle");
      setMessage("Push notifications are disabled on this device.");
    });
  }

  const disabled = isPending || status === "checking" || status === "unsupported" || status === "unconfigured" || status === "denied";
  const subscribed = status === "subscribed";

  return (
    <div className="rounded-md border border-line-soft bg-white-soft/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-soft">
            Admin alerts
          </p>
          <p className="mt-1 text-sm font-bold text-ink">
            {subscribed ? "Push enabled on this device" : "Push notifications"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {status === "checking" && "Checking this browser."}
            {status === "unsupported" && "This browser does not support Web Push."}
            {status === "unconfigured" && "Add VAPID keys before enabling alerts."}
            {status === "denied" && "Notifications are blocked in this browser."}
            {status === "idle" && "Get notified for new signups and server errors."}
            {status === "subscribed" && "New signups and server errors will notify this browser."}
          </p>
          {message ? <p className="mt-2 text-xs font-bold text-green-deep">{message}</p> : null}
        </div>

        <button
          type="button"
          onClick={subscribed ? disablePush : enablePush}
          disabled={disabled}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-green-deep/30 bg-green-pale px-4 text-sm font-extrabold text-green-deep transition-colors hover:bg-green-deep hover:text-white disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-green-pale disabled:hover:text-green-deep"
        >
          {subscribed ? <BellOff size={16} /> : <Bell size={16} />}
          {isPending ? "Saving..." : subscribed ? "Disable" : "Enable"}
        </button>
      </div>
    </div>
  );
}
