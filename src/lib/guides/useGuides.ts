"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { getSeenGuides, markGuideSeen } from "@/lib/actions/guides";

const STORAGE_PREFIX = "homecooked.seen_guides.";

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function readLocal(userId: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function writeLocal(userId: string, ids: string[]) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(ids));
  } catch {
    // Best-effort cache; the database is the source of truth.
  }
}

/**
 * Wipe the local seen-guides cache (every signed-in user on this device) so the
 * "Show tips again" control surfaces beacons immediately without a reload.
 */
export function forgetLocalGuides() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // No cache to clear — the database reset still takes effect on next load.
  }
}

/**
 * Tracks which contextual guides the current user has dismissed.
 *
 * Hydrates instantly from localStorage to avoid a beacon flash, then reconciles
 * with the database (the source of truth across devices). `markSeen` updates
 * optimistically and persists in the background.
 */
export function useGuides() {
  const { userId } = useUser();
  const [seen, setSeen] = useState<string[]>([]);
  // Gate rendering until we know what's been seen, so beacons don't flash for
  // guides the user already dismissed.
  const [loaded, setLoaded] = useState(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    userIdRef.current = userId;
    let active = true;

    // Hydrate instantly from cache (deferred to a microtask so we never call
    // setState synchronously in the effect body), then reconcile with the DB.
    queueMicrotask(() => {
      if (!active) return;
      const cached = readLocal(userId);
      if (cached) {
        setSeen(cached);
        setLoaded(true);
      }
    });

    getSeenGuides()
      .then((ids) => {
        if (!active) return;
        setSeen(ids);
        writeLocal(userId, ids);
        setLoaded(true);
      })
      .catch(() => {
        // Network/DB hiccup — fall back to the cache (or empty) and let beacons
        // show; marking-seen will reconcile later.
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const isSeen = useCallback((id: string) => seen.includes(id), [seen]);

  const markSeen = useCallback((id: string) => {
    setSeen((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      const uid = userIdRef.current;
      if (uid) writeLocal(uid, next);
      return next;
    });
    // Persist in the background; failure just means the beacon may reappear on
    // another device until the next successful write.
    void markGuideSeen(id).catch(() => {});
  }, []);

  return { loaded, isSeen, markSeen };
}
