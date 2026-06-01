"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const LAST_PATH_KEY = "hc:lastPath";
const HAS_HISTORY_KEY = "hc:hasInAppHistory";

/**
 * Records in-app navigation for the session. Lets back buttons (e.g. the recipe
 * page) decide between returning to wherever the user actually came from
 * (router.back) and a safe fallback for deep links — a shared recipe opened
 * directly in a fresh tab has no in-app history to return to.
 *
 * Rendered once in the persistent /app layout so its effect fires on every
 * client navigation without remounting.
 */
export function RouteHistoryTracker() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const last = window.sessionStorage.getItem(LAST_PATH_KEY);
      if (last !== null && last !== pathname) {
        window.sessionStorage.setItem(HAS_HISTORY_KEY, "1");
      }
      window.sessionStorage.setItem(LAST_PATH_KEY, pathname);
    } catch {
      // sessionStorage is unavailable in some private modes; back buttons fall
      // back to their default destination.
    }
  }, [pathname]);

  return null;
}

/** True when the user has navigated within the app this session. */
export function hasInAppHistory() {
  try {
    return window.sessionStorage.getItem(HAS_HISTORY_KEY) === "1";
  } catch {
    return false;
  }
}
