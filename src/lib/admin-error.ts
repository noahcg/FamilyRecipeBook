import "server-only";
import { createHash } from "crypto";
import { sendAdminPush } from "@/lib/push/sendAdminPush";

const THROTTLE_MS = 10 * 60 * 1000;
const recentErrors = new Map<string, number>();

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getSignature(stage: string, error: unknown) {
  const stack = error instanceof Error ? error.stack ?? "" : "";
  return createHash("sha256")
    .update(`${stage}:${getMessage(error)}:${stack}`)
    .digest("hex");
}

export function notifyAdminOfError(
  stage: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  console.error(`[admin-error] ${stage}:`, error, context ?? {});

  const signature = getSignature(stage, error);
  const now = Date.now();
  const previous = recentErrors.get(signature);
  if (previous && now - previous < THROTTLE_MS) return;

  recentErrors.set(signature, now);
  for (const [key, timestamp] of recentErrors) {
    if (now - timestamp > THROTTLE_MS) recentErrors.delete(key);
  }

  void sendAdminPush({
    title: "Home Cooked server error",
    body: `${stage}: ${getMessage(error).slice(0, 160)}`,
    url: "/app/admin",
  }).catch((pushError) => {
    console.error("[admin-error] push failed:", pushError);
  });
}
