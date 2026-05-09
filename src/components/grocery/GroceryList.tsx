"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, ShoppingCart, Trash2, X, Check, CalendarDays, ChevronDown } from "lucide-react";
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
  const [showChecked, setShowChecked] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  // Group unchecked by category in store-aisle order
  const grouped = CATEGORY_ORDER.reduce<Record<string, GroceryItem[]>>((acc, cat) => {
    const inCat = unchecked.filter((i) => i.category === cat);
    if (inCat.length) acc[cat] = inCat;
    return acc;
  }, {});
  // Catch any categories not in CATEGORY_ORDER
  for (const item of unchecked) {
    if (!grouped[item.category]) grouped[item.category] = [];
    if (!grouped[item.category].includes(item)) grouped[item.category].push(item);
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
    startTransition(async () => {
      const result = await addGroceryItem(householdId, { name });
      if (result.success) {
        setItems((prev) => [...prev, result.data]);
      }
    });
  }

  function handleToggle(item: GroceryItem) {
    const next = !item.checked;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: next } : i))
    );
    startTransition(async () => {
      const result = await toggleGroceryItem(householdId, item.id, next);
      if (!result.success) {
        // Revert on failure
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, checked: item.checked } : i))
        );
      }
    });
  }

  function handleDelete(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    startTransition(async () => {
      await deleteGroceryItem(householdId, itemId);
    });
  }

  function handleClearChecked() {
    setItems((prev) => prev.filter((i) => !i.checked));
    startTransition(async () => {
      await clearCheckedItems(householdId);
    });
  }

  function handleClearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    setItems([]);
    startTransition(async () => {
      await clearAllItems(householdId);
    });
  }

  function handleImport() {
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="flex flex-wrap items-center gap-1">
            {checked.length > 0 && (
              <button
                onClick={handleClearChecked}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-card/70 hover:text-ink disabled:opacity-40"
              >
                <Trash2 size={13} />
                Clear {checked.length} checked
              </button>
            )}
            {hasItems && (
              <button
                onClick={handleClearAll}
                disabled={isPending}
                className={clsx(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40",
                  confirmClear
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "text-ink-muted hover:bg-card/70 hover:text-ink"
                )}
              >
                <Trash2 size={13} />
                {confirmClear ? "Tap again to confirm" : "Clear list"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* Import from meal plan */}
          <div className="rounded-xl border border-line-soft bg-card p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">From this week&apos;s meal plan</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Pull all ingredients from your planned recipes straight onto the list.
                </p>
                {importMsg && (
                  <p className="mt-2 text-xs font-medium text-green-deep">{importMsg}</p>
                )}
              </div>
              <button
                onClick={handleImport}
                disabled={isPending}
                className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-green-deep px-4 py-2 text-sm font-semibold text-ink-inverse transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto"
              >
                <CalendarDays size={15} />
                Import
              </button>
            </div>
          </div>

          <NearbyGroceryStores />

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
            <>
              {/* Unchecked, grouped by category */}
              {Object.entries(grouped).length > 0 ? (
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
              ) : (
                <div className="rounded-xl border border-line-soft bg-card p-6 text-center">
                  <p className="text-sm font-bold text-green-deep">Everything is in the cart.</p>
                  <p className="mt-1 text-sm text-ink-muted">Uncheck an item in the cart rail if it still needs grabbing.</p>
                </div>
              )}

              {/* Checked / in cart, mobile and tablet */}
              {checked.length > 0 && (
                <div className="lg:hidden">
                  <CheckedItemsSection
                    checked={checked}
                    showChecked={showChecked}
                    setShowChecked={setShowChecked}
                    handleToggle={handleToggle}
                    handleDelete={handleDelete}
                    isPending={isPending}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-6 rounded-xl border border-line-soft bg-card/82 p-4 shadow-sm">
            <CheckedItemsSection
              checked={checked}
              showChecked={showChecked}
              setShowChecked={setShowChecked}
              handleToggle={handleToggle}
              handleDelete={handleDelete}
              isPending={isPending}
              rail
            />
          </div>
        </aside>
      </div>
    </>
  );
}

function CheckedItemsSection({
  checked,
  showChecked,
  setShowChecked,
  handleToggle,
  handleDelete,
  isPending,
  rail = false,
}: {
  checked: GroceryItem[];
  showChecked: boolean;
  setShowChecked: React.Dispatch<React.SetStateAction<boolean>>;
  handleToggle: (item: GroceryItem) => void;
  handleDelete: (itemId: string) => void;
  isPending: boolean;
  rail?: boolean;
}) {
  if (!checked.length) {
    return (
      <div className={clsx(rail ? "py-8 text-center" : "rounded-xl border border-line-soft bg-card p-5 text-center")}>
        <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">In cart</p>
        <p className="mt-2 text-sm text-ink-soft">Checked items will collect here.</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setShowChecked((v) => !v)}
        className="mb-3 flex w-full items-center justify-between gap-2 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted"
      >
        <span className="inline-flex items-center gap-1.5">
          <ChevronDown
            size={13}
            className={clsx("transition-transform", showChecked ? "" : "-rotate-90")}
          />
          In cart
        </span>
        <span className="rounded-full bg-green-soft px-2 py-0.5 text-[10px] text-green-deep">
          {checked.length}
        </span>
      </button>
      {showChecked && (
        <div className={clsx("space-y-1", rail && "max-h-[calc(100dvh-12rem)] overflow-y-auto pr-1")}>
          {checked.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onToggle={() => handleToggle(item)}
              onDelete={() => handleDelete(item.id)}
              isPending={isPending}
              compact={rail}
            />
          ))}
        </div>
      )}
    </div>
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
