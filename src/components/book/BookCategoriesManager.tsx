"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button, Dialog, Input } from "@/components/ui";
import {
  createCategory,
  deleteCategory,
  moveRecipesAndDeleteCategory,
  renameCategory,
  reorderCategories,
  type BookCategory,
} from "@/lib/actions/categories";

interface BookCategoriesManagerProps {
  bookId: string;
  initialCategories: BookCategory[];
}

interface ReassignTarget {
  category: BookCategory;
  recipeCount: number;
}

export function BookCategoriesManager({ bookId, initialCategories }: BookCategoriesManagerProps) {
  const [categories, setCategories] = useState<BookCategory[]>(
    [...initialCategories].sort((a, b) => a.position - b.position)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reassign, setReassign] = useState<ReassignTarget | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const otherCategoryId = useMemo(
    () => categories.find((c) => c.name.toLowerCase() === "other")?.id ?? null,
    [categories]
  );

  function refreshSorted(next: BookCategory[]) {
    setCategories([...next].sort((a, b) => a.position - b.position));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await createCategory(bookId, trimmed);
      if (!result.success) {
        setError(result.error);
        return;
      }
      refreshSorted([...categories, result.data]);
      setNewName("");
    });
  }

  function startEdit(category: BookCategory) {
    setEditingId(category.id);
    setEditingValue(category.name);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingValue("");
  }

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    const original = categories.find((c) => c.id === editingId);
    if (original && original.name === trimmed) {
      cancelEdit();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await renameCategory(editingId, trimmed);
      if (!result.success) {
        setError(result.error);
        return;
      }
      refreshSorted(categories.map((c) => (c.id === editingId ? result.data : c)));
      cancelEdit();
    });
  }

  function handleMove(category: BookCategory, direction: -1 | 1) {
    const index = categories.findIndex((c) => c.id === category.id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= categories.length) return;

    const next = [...categories];
    next[index] = categories[swapIndex];
    next[swapIndex] = category;
    const reordered = next.map((c, i) => ({ ...c, position: i }));
    setCategories(reordered);

    setError(null);
    startTransition(async () => {
      const result = await reorderCategories(bookId, reordered.map((c) => c.id));
      if (!result.success) {
        setError(result.error);
        // Roll back on failure.
        refreshSorted(categories);
      }
    });
  }

  function handleDelete(category: BookCategory) {
    setError(null);
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (result.success) {
        refreshSorted(categories.filter((c) => c.id !== category.id));
        return;
      }
      if (result.error.kind === "has_recipes") {
        setReassign({ category, recipeCount: result.error.recipeCount });
        setReassignTargetId(
          otherCategoryId && otherCategoryId !== category.id ? otherCategoryId : ""
        );
        return;
      }
      setError(result.error.message);
    });
  }

  function closeReassign() {
    setReassign(null);
    setReassignTargetId("");
  }

  function handleReassignConfirm() {
    if (!reassign || !reassignTargetId) return;
    setError(null);
    startTransition(async () => {
      const result = await moveRecipesAndDeleteCategory(reassign.category.id, reassignTargetId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      refreshSorted(categories.filter((c) => c.id !== reassign.category.id));
      closeReassign();
    });
  }

  const reassignChoices = reassign
    ? categories.filter((c) => c.id !== reassign.category.id)
    : [];

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="flex flex-col divide-y divide-line-soft rounded-md border border-line-soft bg-card/80">
        {categories.map((category, index) => {
          const isEditing = editingId === category.id;
          const isFirst = index === 0;
          const isLast = index === categories.length - 1;
          return (
            <li
              key={category.id}
              className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:flex-nowrap"
            >
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMove(category, -1)}
                  disabled={isFirst || pending}
                  className="flex h-8 w-8 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-green-pale disabled:opacity-30"
                  aria-label={`Move ${category.name} up`}
                >
                  <ArrowUp size={16} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(category, 1)}
                  disabled={isLast || pending}
                  className="flex h-8 w-8 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-green-pale disabled:opacity-30"
                  aria-label={`Move ${category.name} down`}
                >
                  <ArrowDown size={16} strokeWidth={1.75} />
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleRename} className="flex min-w-0 flex-1 items-center gap-2">
                  <Input
                    autoFocus
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelEdit();
                      }
                    }}
                    maxLength={60}
                    className="w-full"
                  />
                  <Button type="submit" variant="primary" size="sm" disabled={pending}>
                    <Check size={16} strokeWidth={2} />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={pending}>
                    <X size={16} strokeWidth={2} />
                  </Button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                    {category.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(category)}
                      disabled={pending}
                      className="flex h-8 w-8 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-green-pale disabled:opacity-40"
                      aria-label={`Rename ${category.name}`}
                    >
                      <Pencil size={15} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(category)}
                      disabled={pending}
                      className="flex h-8 w-8 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                      aria-label={`Delete ${category.name}`}
                    >
                      <Trash2 size={15} strokeWidth={1.75} />
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add a chapter (e.g. Poultry)"
            maxLength={60}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!newName.trim() || pending}
          loading={pending && !!newName.trim()}
        >
          <span className="inline-flex items-center gap-1.5">
            <Plus size={16} strokeWidth={2} />
            Add chapter
          </span>
        </Button>
      </form>

      <Dialog open={!!reassign} onClose={closeReassign} title="Move recipes first">
        {reassign && (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-ink-muted">
              <span className="font-semibold text-ink">{reassign.category.name}</span> has{" "}
              {reassign.recipeCount} recipe{reassign.recipeCount === 1 ? "" : "s"}. Pick a
              chapter to move {reassign.recipeCount === 1 ? "it" : "them"} into, then we&apos;ll
              delete this chapter.
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                Move recipes into
              </span>
              <select
                value={reassignTargetId}
                onChange={(e) => setReassignTargetId(e.target.value)}
                className="min-h-11 rounded-sm border border-line bg-card px-3 text-sm text-ink focus:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
              >
                <option value="" disabled>
                  Choose a chapter…
                </option>
                {reassignChoices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                type="button"
                variant="primary"
                onClick={handleReassignConfirm}
                disabled={!reassignTargetId || pending}
                loading={pending}
              >
                Move and delete
              </Button>
              <Button type="button" variant="ghost" onClick={closeReassign} disabled={pending}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
