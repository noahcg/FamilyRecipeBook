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
  importFromMealPlan,
} from "@/lib/actions/grocery";
import type { GroceryItem } from "@/lib/types";

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
      <div className="sticky top-0 z-20 border-b border-line-soft bg-[rgba(251,247,237,0.95)] px-6 py-4 backdrop-blur-sm lg:rounded-tr-xl">
        <div className="flex items-center justify-between">
          <div>
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
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Import from meal plan */}
        <div className="rounded-xl border border-line-soft bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
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
              className="flex shrink-0 items-center gap-2 rounded-lg bg-green-deep px-4 py-2 text-sm font-semibold text-ink-inverse transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <CalendarDays size={15} />
              Import
            </button>
          </div>
        </div>

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
            {Object.entries(grouped).map(([category, catItems]) => (
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
            ))}

            {/* Checked / in cart */}
            {checked.length > 0 && (
              <div>
                <button
                  onClick={() => setShowChecked((v) => !v)}
                  className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted"
                >
                  <ChevronDown
                    size={13}
                    className={clsx("transition-transform", showChecked ? "" : "-rotate-90")}
                  />
                  In cart ({checked.length})
                </button>
                {showChecked && (
                  <div className="space-y-1">
                    {checked.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        onToggle={() => handleToggle(item)}
                        onDelete={() => handleDelete(item.id)}
                        isPending={isPending}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
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
}

function ItemRow({ item, onToggle, onDelete, isPending }: ItemRowProps) {
  return (
    <div
      className={clsx(
        "group flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
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
          {item.quantity && (
            <span className="mr-1.5 text-ink-muted">
              {item.quantity}{item.unit ? ` ${item.unit}` : ""}
            </span>
          )}
          {item.name}
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
        className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted opacity-0 transition-opacity hover:bg-card-muted hover:text-ink group-hover:flex group-hover:opacity-100 disabled:opacity-40"
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
