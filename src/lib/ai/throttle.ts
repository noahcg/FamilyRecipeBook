import "server-only";

import type { AiTask } from "@/lib/ai/modelRegistry";

type ThrottlePolicy = {
  limit: number;
  windowMs: number;
};

const POLICIES: Record<AiTask, ThrottlePolicy> = {
  recipeGeneration: { limit: 6, windowMs: 60_000 },
  recipeDescription: { limit: 20, windowMs: 60_000 },
  recipeImageSearchQuery: { limit: 20, windowMs: 60_000 },
  recipeImageRanking: { limit: 20, windowMs: 60_000 },
  recipePhotoImport: { limit: 4, windowMs: 60_000 },
};

const attempts = new Map<string, number[]>();
let lastSweep = 0;

function sweepExpired(now: number) {
  if (now - lastSweep < 60_000 && attempts.size < 5_000) return;
  const longestWindow = Math.max(...Object.values(POLICIES).map((policy) => policy.windowMs));
  for (const [key, timestamps] of attempts) {
    if (!timestamps.some((timestamp) => timestamp > now - longestWindow)) {
      attempts.delete(key);
    }
  }
  lastSweep = now;
}

/**
 * Best-effort burst protection for one server instance. This prevents accidental
 * repeat submissions, but is deliberately not used as billing or daily-quota
 * truth because Vercel may serve requests from multiple instances.
 */
export function consumeAiTaskThrottle(
  userId: string,
  task: AiTask,
  now = Date.now()
): boolean {
  sweepExpired(now);
  const policy = POLICIES[task];
  const key = `${task}:${userId}`;
  const cutoff = now - policy.windowMs;
  const recent = (attempts.get(key) ?? []).filter((timestamp) => timestamp > cutoff);

  if (recent.length >= policy.limit) {
    attempts.set(key, recent);
    return false;
  }

  recent.push(now);
  attempts.set(key, recent);
  return true;
}

export const AI_THROTTLE_POLICIES = POLICIES;
