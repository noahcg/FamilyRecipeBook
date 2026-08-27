"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2 } from "lucide-react";
import { Button, Dialog } from "@/components/ui";
import { deleteBook, leaveBook } from "@/lib/actions/books";

interface BookDangerZoneProps {
  bookId: string;
  bookTitle: string;
  isKeeper: boolean;
}

export function BookDangerZone({ bookId, bookTitle, isKeeper }: BookDangerZoneProps) {
  const router = useRouter();
  const [open, setOpen] = useState<"leave" | "delete" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLeave() {
    setSaving(true);
    setError(null);
    const result = await leaveBook(bookId);

    if (!result.success) {
      setSaving(false);
      setError(result.error);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    const result = await deleteBook(bookId);

    if (!result.success) {
      setSaving(false);
      setError(result.error);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  if (isKeeper) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
        <p className="text-sm font-bold text-danger">Delete cookbook</p>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Permanently delete {bookTitle} for everyone. Recipes, memories,
          invitations, members, and cookbook settings will be removed. This cannot be undone.
        </p>
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="mt-3"
          onClick={() => setOpen("delete")}
        >
          <Trash2 size={14} /> Delete cookbook
        </Button>
        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}

        <Dialog open={open === "delete"} onClose={() => (saving ? undefined : setOpen(null))} title="Delete cookbook?">
          <p className="mb-5 text-sm text-ink-muted">
            This will permanently delete {bookTitle} and remove it from every member&apos;s bookshelf.
            This cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => setOpen(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              onClick={handleDelete}
              loading={saving}
            >
              Delete cookbook
            </Button>
          </div>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
      <p className="text-sm font-bold text-danger">Remove from bookshelf</p>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
        Leave {bookTitle} and remove it from your bookshelf. The cookbook and its recipes
        will stay available to the keeper and other members.
      </p>
      <Button
        type="button"
        variant="danger"
        size="sm"
        className="mt-3"
        onClick={() => setOpen("leave")}
      >
        <LogOut size={14} /> Remove from my shelf
      </Button>
      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}

      <Dialog open={open === "leave"} onClose={() => (saving ? undefined : setOpen(null))} title="Remove cookbook?">
        <p className="mb-5 text-sm text-ink-muted">
          This removes {bookTitle} from your bookshelf and takes away your access.
          Other members will keep access.
        </p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => setOpen(null)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="flex-1"
            onClick={handleLeave}
            loading={saving}
          >
            Remove
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
