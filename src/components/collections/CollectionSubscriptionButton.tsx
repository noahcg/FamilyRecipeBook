"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookMinus } from "lucide-react";
import { Button, Dialog } from "@/components/ui";
import { addOfficialCollection, removeOfficialCollection } from "@/lib/actions/officialCollections";

export function CollectionSubscriptionButton({ collectionId, remove = false, removeHref = "/app/bookshelf?collectionRemoved=1" }: { collectionId: string; remove?: boolean; removeHref?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  function updateShelf() {
    setError("");
    startTransition(async () => {
      try {
        const result = await (remove ? removeOfficialCollection(collectionId) : addOfficialCollection(collectionId));
        if (!result.success) { setError(result.error); return; }
        router.replace(remove ? removeHref : `/app/collections/${collectionId}?added=1`);
        router.refresh();
      } catch {
        setError("Could not update your bookshelf. Please try again.");
      }
    });
  }
  if (remove) return <>
    <Button type="button" variant="secondary" size="md" className="w-full rounded-md text-sm hover:border-green-deep hover:!bg-green-deep hover:!text-ink-inverse xl:w-auto" onClick={() => setConfirming(true)}><BookMinus size={17} aria-hidden="true" /> Remove from bookshelf</Button>
    <Dialog open={confirming} onClose={() => { if (!pending) { setConfirming(false); setError(""); } }} title="Remove from your bookshelf?">
      <p className="mb-5 text-sm leading-relaxed text-ink-muted">You can add this collection again later.</p>
      {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
      <div className="flex gap-3"><Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirming(false)} disabled={pending}>Cancel</Button><Button variant="danger" size="sm" className="flex-1" onClick={updateShelf} loading={pending}>Remove</Button></div>
    </Dialog>
  </>;
  return <div><Button type="button" variant="primary" loading={pending} onClick={updateShelf}>Add to my bookshelf</Button>{error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}</div>;
}
