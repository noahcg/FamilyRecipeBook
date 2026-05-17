"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserMinus } from "lucide-react";
import { Button } from "@/components/ui";
import { removeMember } from "@/lib/actions/members";

interface RemoveMemberButtonProps {
  bookId: string;
  userId: string;
}

export function RemoveMemberButton({ bookId, userId }: RemoveMemberButtonProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setSaving(true);
    setError(null);
    const result = await removeMember(bookId, userId);
    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push(`/app/books/${bookId}/members`);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-line-soft bg-card/70 p-4">
      <p className="text-sm font-bold text-green-deep">Remove from this cookbook</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        This only removes access to this cookbook. Other cookbooks are unchanged.
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3"
        loading={saving}
        disabled={saving}
        onClick={handleRemove}
      >
        <UserMinus size={14} /> Remove member
      </Button>
      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
