"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button, Dialog } from "@/components/ui";
import { deleteAccount } from "@/lib/actions/account";

export function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const result = await deleteAccount();

    if (!result.success) {
      setDeleting(false);
      setError(result.error);
      return;
    }

    // Session already cleared server-side — land on the public home.
    router.push("/");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
      <p className="text-sm font-bold text-danger">Delete account</p>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
        Permanently delete your account and all of your data — including every
        cookbook you own and any recipes, memories, and photos you&apos;ve added.
        Cookbooks you own that are shared with family will be removed for everyone.
        This cannot be undone.
      </p>
      <Button
        type="button"
        variant="danger"
        size="sm"
        className="mt-3"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={14} /> Delete account
      </Button>
      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}

      <Dialog open={open} onClose={() => (deleting ? undefined : setOpen(false))} title="Delete account?">
        <p className="mb-5 text-sm text-ink-muted">
          This will permanently delete your account and all of your data. Shared
          cookbooks you own will be removed for everyone. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => setOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="flex-1"
            onClick={handleDelete}
            loading={deleting}
          >
            Delete account
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
