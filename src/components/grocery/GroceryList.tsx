"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Plus, ShoppingCart, Trash2, X, Check, CalendarDays, WifiOff } from "lucide-react";
import { clsx } from "clsx";
import {
  getGroceryItems,
  addGroceryItem,
  toggleGroceryItem,
  deleteGroceryItem,
  clearCheckedItems,
  clearAllItems,
  importFromMealPlan,
} from "@/lib/actions/grocery";
import { formatStoreQuantity } from "@/lib/grocery/packaging";
import type { GroceryItem } from "@/lib/types";
import { NearbyGroceryStores } from "@/components/grocery/NearbyGroceryStores";
import {
  cacheItems,
  clearQueue,
  enqueueOp,
  isTempId,
  loadCachedItems,
  loadQueue,
  makeTempItem,
} from "@/lib/offlineGroceries";

// Ordered to match typical store layout — future sort_order will refine within these
const CATEGORY_ORDER = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery & Bread",
  "Pantry",
  "Frozen",
  "Beverages",
  "Snacks",
  "Other",
];

interface Props {
  householdId: string;
  initialItems: GroceryItem[];
  currentWeekStart: string;
}

export function GroceryList({ householdId, initialItems, currentWeekStart }: Props) {
  const [items, setItems] = useState<GroceryItem[]>(initialItems);
  const [isPending, startTransition] = useTransition();
  const [addInput, setAddInput] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const flushingRef = useRef(false);
  const firstItemsRender = useRef(true);

  function bumpPending() {
    setPendingCount(loadQueue(householdId).length);
  }

  // Push any edits made offline up to the server, oldest first, then reconcile
  // with the canonical server list.
  async function flushQueue() {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (flushingRef.current) return;
    const queue = loadQueue(householdId);
    if (!queue.length) return;

    flushingRef.current = true;
    setSyncing(true);
    const idMap: Record<string, string> = {};
    try {
      for (const op of queue) {
        if (op.type === "add") {
          const result = await addGroceryItem(householdId, { name: op.name });
          if (result.success) idMap[op.tempId] = result.data.id;
        } else if (op.type === "toggle") {
          const id = idMap[op.itemId] ?? op.itemId;
          if (!isTempId(id)) await toggleGroceryItem(householdId, id, op.checked);
        } else if (op.type === "delete") {
          const id = idMap[op.itemId] ?? op.itemId;
          if (!isTempId(id)) await deleteGroceryItem(householdId, id);
        } else if (op.type === "clearChecked") {
          await clearCheckedItems(householdId);
        } else if (op.type === "clearAll") {
          await clearAllItems(householdId);
        }
      }
      clearQueue(householdId);
      const fresh = await getGroceryItems(householdId);
      setItems(fresh);
      cacheItems(householdId, fresh);
    } catch {
      // Leave the queue in place and retry on the next reconnect.
    } finally {
      flushingRef.current = false;
      setSyncing(false);
      bumpPending();
    }
  }

  // Track connectivity. These sync browser state after hydration, so a stable
  // initial value (true) is intentional — lazy init would mismatch SSR.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Decide the initial source of truth and surface any pending queue.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    bumpPending();
    if (navigator.onLine) {
      if (loadQueue(householdId).length === 0) cacheItems(householdId, initialItems);
    } else {
      const cached = loadCachedItems(householdId);
      if (cached) setItems(cached);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the offline cache in step with the list (after the first render).
  useEffect(() => {
    if (firstItemsRender.current) {
      firstItemsRender.current = false;
      return;
    }
    cacheItems(householdId, items);
  }, [items, householdId]);

  // Flush queued edits whenever we're (back) online. flushQueue manages its
  // own sync state; this is an intentional external-state sync.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (online) flushQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  // Group all items by category in store-aisle order. Items keep a stable spot
  // within their category, so checking one off doesn't move it.
  const grouped = CATEGORY_ORDER.reduce<Record<string, GroceryItem[]>>((acc, cat) => {
    const inCat = items.filter((i) => i.category === cat);
    if (inCat.length) acc[cat] = inCat;
    return acc;
  }, {});
  // Catch any categories not in CATEGORY_ORDER
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    if (!grouped[item.category].includes(item)) grouped[item.category].push(item);
  }
  // Stable order by when each item was added, regardless of checked state.
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async function refresh() {
    const fresh = await getGroceryItems(householdId);
    setItems(fresh);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = addInput.trim();
    if (!name) return;
    setAddInput("");
    if (online) {
      startTransition(async () => {
        const result = await addGroceryItem(householdId, { name });
        if (result.success) {
          setItems((prev) => [...prev, result.data]);
        }
      });
    } else {
      const temp = makeTempItem(householdId, name);
      setItems((prev) => [...prev, temp]);
      enqueueOp(householdId, { type: "add", tempId: temp.id, name });
      bumpPending();
    }
  }

  function handleToggle(item: GroceryItem) {
    const next = !item.checked;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: next } : i))
    );
    if (online) {
      startTransition(async () => {
        const result = await toggleGroceryItem(householdId, item.id, next);
        if (!result.success) {
          // Revert on failure
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, checked: item.checked } : i))
          );
        }
      });
    } else {
      enqueueOp(householdId, { type: "toggle", itemId: item.id, checked: next });
      bumpPending();
    }
  }

  function handleDelete(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    if (online) {
      startTransition(async () => {
        await deleteGroceryItem(householdId, itemId);
      });
    } else {
      enqueueOp(householdId, { type: "delete", itemId });
      bumpPending();
    }
  }

  function handleClearChecked() {
    setItems((prev) => prev.filter((i) => !i.checked));
    if (online) {
      startTransition(async () => {
        await clearCheckedItems(householdId);
      });
    } else {
      enqueueOp(householdId, { type: "clearChecked" });
      bumpPending();
    }
  }

  function handleClearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    setItems([]);
    if (online) {
      startTransition(async () => {
        await clearAllItems(householdId);
      });
    } else {
      enqueueOp(householdId, { type: "clearAll" });
      bumpPending();
    }
  }

  function handleImport() {
    if (!online) return;
    setImportMsg(null);
    startTransition(async () => {
      const result = await importFromMealPlan(householdId, currentWeekStart);
      if (!result.success) {
        setImportMsg(result.error);
        return;
      }
      const { added, skipped } = result.data;
      if (added === 0) {
        setImportMsg("All ingredients are already on your list.");
      } else {
        setImportMsg(
          skipped > 0
            ? `Added ${added} item${added !== 1 ? "s" : ""}. ${skipped} already on list.`
            : `Added ${added} item${added !== 1 ? "s" : ""} from this week's meals.`
        );
      }
      await refresh();
    });
  }

  const hasItems = items.length > 0;

  return (
    <>
      {/* Sticky header */}
      <div className="border-b border-line-soft bg-[rgba(251,247,237,0.95)] px-4 py-4 sm:px-6 lg:rounded-tr-xl">
        <div className="min-w-0">
          <h1
            className="text-2xl font-bold text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Grocery List
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {unchecked.length} item{unchecked.length !== 1 ? "s" : ""} to grab
          </p>
        </div>
      </div>

      <div className="grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[3fr_1fr]">
        <div className="space-y-5">
        {!online && (
          <div className="flex items-center gap-2 rounded-lg border border-accent-honey/40 bg-accent-honey/10 px-3 py-2 text-xs font-semibold text-accent-cinnamon">
            <WifiOff size={14} className="shrink-0" />
            <span>
              You&rsquo;re offline. Changes save on this device and sync when you
              reconnect{pendingCount > 0 ? ` (${pendingCount} pending)` : ""}.
            </span>
          </div>
        )}
        {online && syncing && (
          <div className="flex items-center gap-2 rounded-lg border border-line-soft bg-card px-3 py-2 text-xs font-semibold text-ink-muted">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-green-deep" />
            Syncing your offline changes…
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleImport}
            disabled={isPending || !online}
            title={!online ? "Importing needs a connection" : undefined}
            className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-green-deep px-4 py-2 text-sm font-semibold text-ink-inverse transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <CalendarDays size={15} />
            Import from meal plan
          </button>

          {online && <NearbyGroceryStores />}

          {hasItems && (
            <div className="ml-auto shrink-0">
              {checked.length > 0 ? (
                <button
                  onClick={handleClearChecked}
                  disabled={isPending}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-card/70 hover:text-ink disabled:opacity-40"
                >
                  <Trash2 size={13} />
                  Delete selected ({checked.length})
                </button>
              ) : (
                <button
                  onClick={handleClearAll}
                  disabled={isPending}
                  className={clsx(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40",
                    confirmClear
                      ? "bg-red-50 text-red-600 hover:bg-red-100"
                      : "text-ink-muted hover:bg-card/70 hover:text-ink"
                  )}
                >
                  <Trash2 size={13} />
                  {confirmClear ? "Tap again to confirm" : "Delete all"}
                </button>
              )}
            </div>
          )}
        </div>

        {importMsg && (
          <p className="text-xs font-medium text-green-deep">{importMsg}</p>
        )}

        {/* Quick add */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              placeholder="Add an item…"
              className="input-cookbook h-11 w-full text-sm"
              style={{ paddingLeft: "1rem" }}
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !addInput.trim()}
            aria-label="Add item"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-deep text-ink-inverse transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Plus size={18} />
          </button>
        </form>

        {/* List */}
        {!hasItems ? (
          <EmptyState onImport={handleImport} isPending={isPending} />
        ) : (
          Object.entries(grouped).map(([category, catItems]) => (
            <div key={category}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                {category}
              </p>
              <div className="space-y-1">
                {catItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => handleToggle(item)}
                    onDelete={() => handleDelete(item.id)}
                    isPending={isPending}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        </div>

        {/* Right column — reserved for future content */}
        <aside className="hidden lg:block" />
      </div>
    </>
  );
}

// ─── Item row ─────────────────────────────────────────────────

interface ItemRowProps {
  item: GroceryItem;
  onToggle: () => void;
  onDelete: () => void;
  isPending: boolean;
  compact?: boolean;
}

function ItemRow({ item, onToggle, onDelete, isPending, compact = false }: ItemRowProps) {
  const displayItem = formatStoreQuantity(item);

  return (
    <div
      className={clsx(
        "group flex items-center gap-3 rounded-xl border transition-colors",
        compact ? "px-3 py-2.5" : "px-3 py-3 sm:px-4",
        item.checked
          ? "border-line-soft bg-card/40"
          : "border-line-soft bg-card"
      )}
    >
      <button
        onClick={onToggle}
        disabled={isPending}
        aria-label={item.checked ? "Uncheck item" : "Check item"}
        className={clsx(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-60",
          item.checked
            ? "border-green-deep bg-green-deep text-white"
            : "border-line-soft bg-card hover:border-green-deep"
        )}
      >
        {item.checked && <Check size={11} strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <span
          className={clsx(
            "text-sm font-medium",
            item.checked ? "text-ink-muted line-through" : "text-ink"
          )}
        >
          {displayItem.quantity && (
            <span className="mr-1.5 text-ink-muted">
              {displayItem.quantity}{displayItem.unit ? ` ${displayItem.unit}` : ""}
            </span>
          )}
          {displayItem.name}
        </span>
        {item.notes && (
          <p className="text-xs text-ink-muted">{item.notes}</p>
        )}
        {/* Future: aisle badge will go here when store integration is added */}
      </div>

      {item.meal_days && item.meal_days.length > 0 && (
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-green-soft px-2 py-0.5 text-[10px] font-semibold text-green-deep">
          <CalendarDays size={10} />
          {item.meal_days.map((d) => d.slice(0, 3)).join(", ")}
        </span>
      )}

      <button
        onClick={onDelete}
        disabled={isPending}
        aria-label="Remove item"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted opacity-0 transition-[opacity,background-color,color] hover:bg-card-muted hover:text-ink group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────

function EmptyState({ onImport, isPending }: { onImport: () => void; isPending: boolean }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-soft text-green-deep">
        <ShoppingCart size={24} strokeWidth={1.5} />
      </div>
      <p className="text-base font-semibold text-ink">Your list is empty</p>
      <p className="mt-1 max-w-xs text-sm text-ink-muted">
        Add items above, or import ingredients straight from this week&apos;s meal plan.
      </p>
      <button
        onClick={onImport}
        disabled={isPending}
        className="mt-5 flex items-center gap-2 rounded-lg bg-green-deep px-5 py-2.5 text-sm font-semibold text-ink-inverse transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <CalendarDays size={15} />
        Import from meal plan
      </button>
    </div>
  );
}
