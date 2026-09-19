"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui";
import { getAdminPushPublicKey, subscribeAdminToPush, unsubscribeAdminFromPush, testAdminPush } from "@/lib/actions/admin-push";
import { pushKeyMatches, urlBase64ToUint8Array } from "@/lib/push/subscription";

type Status = "checking" | "unsupported" | "unconfigured" | "denied" | "idle" | "repair" | "subscribed" | "error";

async function getRegistration() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await navigator.serviceWorker.register("/sw.js");
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Notifications could not start. Close and reopen the app, then try again.")), 10000); }),
    ]);
  } finally { clearTimeout(timer); }
}

export function PushSubscriptionToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [retry, setRetry] = useState(0);
  const setup = useRef<{ registration: ServiceWorkerRegistration; key: string; subscription: PushSubscription | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function checkState() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      const publicKey = await getAdminPushPublicKey();
      if (!publicKey.success) {
        if (!cancelled) { setStatus("unconfigured"); setMessage(publicKey.error); }
        return;
      }
      const registration = await getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (cancelled) return;
      setup.current = { registration, key: publicKey.data, subscription };
      if (!subscription) { setStatus("idle"); return; }
      if (!pushKeyMatches(subscription.options.applicationServerKey, publicKey.data)) { setStatus("repair"); return; }
      // A browser subscription alone does not prove the server can reach it.
      const result = await subscribeAdminToPush(subscription.toJSON(), navigator.userAgent);
      if (cancelled) return;
      setStatus(result.success ? "subscribed" : "error");
      if (!result.success) setMessage(result.error);
    }
    void checkState().catch(() => {
      if (!cancelled) { setStatus("error"); setMessage("Could not check notifications. Check your connection and try again."); }
    });
    return () => { cancelled = true; };
  }, [retry]);

  function enablePush(repair = false) {
    // Request permission directly from the tap, before any server round trip.
    const permission = Notification.permission === "granted" ? Promise.resolve("granted" as NotificationPermission) : Notification.requestPermission();
    startTransition(async () => {
      setMessage(null);
      try {
        const granted = await permission;
        if (granted !== "granted") { setStatus(granted === "denied" ? "denied" : "idle"); return; }
        const ready = setup.current;
        if (!ready) throw new Error("Reopen the app and try again.");
        let subscription = ready.subscription;
        let oldEndpoint: string | undefined;
        if (subscription && (repair || !pushKeyMatches(subscription.options.applicationServerKey, ready.key))) {
          oldEndpoint = subscription.endpoint;
          // false means it was already inactive, which is also safe to replace.
          await subscription.unsubscribe();
          ready.subscription = null;
          subscription = null;
        }
        subscription ??= await ready.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(ready.key) });
        ready.subscription = subscription;
        const result = await subscribeAdminToPush(subscription.toJSON(), navigator.userAgent);
        if (!result.success) throw new Error(result.error);
        if (oldEndpoint && oldEndpoint !== subscription.endpoint) {
          await unsubscribeAdminFromPush(oldEndpoint).catch(() => undefined);
        }
        setStatus("subscribed");
        setMessage("Notifications connected. Send a test to check delivery.");
      } catch (error) {
        setStatus("repair");
        setMessage(error instanceof Error ? error.message : "Could not enable notifications. Try again.");
      }
    });
  }

  function disablePush() {
    startTransition(async () => {
      setMessage(null);
      try {
        const ready = setup.current;
        const subscription = ready?.subscription;
        if (subscription) {
          await subscription.unsubscribe();
          ready!.subscription = null;
          // An inactive browser endpoint cannot deliver, even if cleanup fails.
          await unsubscribeAdminFromPush(subscription.endpoint).catch(() => undefined);
        }
        setStatus("idle");
        setMessage("Push notifications are disabled on this device.");
      } catch (error) { setMessage(error instanceof Error ? error.message : "Could not disable notifications. Try again."); }
    });
  }

  function sendTest() {
    startTransition(async () => {
      setMessage(null);
      try {
        const endpoint = setup.current?.subscription?.endpoint;
        if (!endpoint) { setStatus("repair"); return; }
        const result = await testAdminPush(endpoint);
        if (!result.success) { setStatus("repair"); setMessage(result.error); return; }
        setMessage("Test sent to this device. If it doesn't appear, check iPhone notification settings and Focus.");
      } catch { setMessage("Could not send a test. Check your connection and try again."); }
    });
  }

  const subscribed = status === "subscribed";
  const disabled = isPending || ["checking", "unsupported", "unconfigured", "denied"].includes(status);
  return (
    <div className="rounded-md border border-line-soft bg-white-soft/70 p-4">
      <div className="space-y-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-soft">Admin alerts</p>
          <p className="mt-1 text-sm font-bold text-ink">{subscribed ? "Push connected on this device" : "Push notifications"}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {status === "checking" && "Checking this device and its connection."}
            {status === "unsupported" && "On iPhone, open Home Cooked from your Home Screen to enable notifications."}
            {status === "unconfigured" && "Notification delivery is not configured on the server."}
            {status === "denied" && "Allow notifications for Home Cooked in your device settings, then reopen the app."}
            {status === "idle" && "Get notified for new signups and server errors."}
            {status === "repair" && "Reconnect this device to restore notification delivery."}
            {status === "subscribed" && "New signups and server errors will notify this device."}
          </p>
          {message && <p role="status" className="mt-2 text-xs font-semibold text-ink">{message}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled={disabled} onClick={() => {
            if (status === "error") { setStatus("checking"); setMessage(null); setRetry((value) => value + 1); }
            else if (subscribed) disablePush();
            else enablePush(status === "repair");
          }}>
            {subscribed ? <BellOff size={16} /> : <Bell size={16} />}
            {isPending ? "Working…" : subscribed ? "Disable" : status === "repair" ? "Reconnect" : status === "error" ? "Try again" : "Enable"}
          </Button>
          {subscribed && <>
            <Button size="sm" disabled={isPending} onClick={sendTest}>Send test</Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => enablePush(true)}>Reconnect</Button>
          </>}
        </div>
      </div>
    </div>
  );
}
