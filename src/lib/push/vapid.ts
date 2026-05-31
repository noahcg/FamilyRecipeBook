import "server-only";
import webPush from "web-push";

let configured = false;

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
}

export function hasVapidConfig() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      process.env.VAPID_SUBJECT?.trim()
  );
}

export function configureWebPush() {
  if (configured || !hasVapidConfig()) return hasVapidConfig();

  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT!.trim(),
    process.env.VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim()
  );
  configured = true;
  return true;
}
