"use client";

import type { GroceryItem } from "@/lib/types";

// Offline support for the grocery list. The list is cached in localStorage per
// household, and edits made while offline are recorded as an ordered queue of
// operations that get flushed to the server once the connection returns.

const CACHE_PREFIX = "home-cooked-grocery-cache:";
const QUEUE_PREFIX = "home-cooked-grocery-queue:";

export type GroceryOp =
  | { type: "add"; tempId: string; name: string }
  | { type: "toggle"; itemId: string; checked: boolean }
  | { type: "delete"; itemId: string }
  | { type: "clearChecked" }
  | { type: "clearAll" };

export function isTempId(id: string): boolean {
  return id.startsWith("tmp:");
}

export function newTempId(): string {
  return `tmp:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ── Cached list ──────────────────────────────────────────────

export function loadCachedItems(householdId: string): GroceryItem[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CACHE_PREFIX + householdId);
  return raw ? safeParse<GroceryItem[]>(raw, []) : null;
}

export function cacheItems(householdId: string, items: GroceryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + householdId, JSON.stringify(items));
  } catch {
    // Storage full or unavailable — offline view simply won't persist.
  }
}

// ── Pending operation queue ──────────────────────────────────

export function loadQueue(householdId: string): GroceryOp[] {
  if (typeof window === "undefined") return [];
  return safeParse<GroceryOp[]>(window.localStorage.getItem(QUEUE_PREFIX + householdId), []);
}

function saveQueue(householdId: string, ops: GroceryOp[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_PREFIX + householdId, JSON.stringify(ops));
  } catch {
    // ignore
  }
}

export function enqueueOp(householdId: string, op: GroceryOp): void {
  saveQueue(householdId, [...loadQueue(householdId), op]);
}

export function clearQueue(householdId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(QUEUE_PREFIX + householdId);
}

// Build a placeholder item for something added while offline, so it shows in
// the list immediately. The server fills in the real category/id on sync.
export function makeTempItem(householdId: string, name: string): GroceryItem {
  return {
    id: newTempId(),
    household_id: householdId,
    name,
    quantity: null,
    unit: null,
    category: "Other",
    aisle: null,
    sort_order: null,
    notes: null,
    recipe_id: null,
    checked: false,
    checked_by: null,
    checked_at: null,
    created_by: "",
    created_at: new Date().toISOString(),
  };
}
