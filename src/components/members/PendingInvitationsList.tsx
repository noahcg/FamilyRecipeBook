"use client";

import { useState } from "react";
import { Mail, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cancelInvitation, type PendingBookInvitation } from "@/lib/actions/members";

interface PendingInvitationsListProps {
  bookId: string;
  invitations: PendingBookInvitation[];
}

const ROLE_LABEL: Record<string, string> = {
  contributor: "Contributor",
  family: "Family",
};

export function PendingInvitationsList({
  bookId,
  invitations,
}: PendingInvitationsListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const visibleInvitations = invitations.filter((invite) => !hiddenIds.has(invite.id));

  if (visibleInvitations.length === 0) return null;

  async function handleCancel(invitationId: string) {
    setPendingId(invitationId);
    setError(null);
    const result = await cancelInvitation(bookId, invitationId);
    setPendingId(null);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setHiddenIds((current) => new Set(current).add(invitationId));
  }

  return (
    <section>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">
        Pending invitations
      </p>
      <div className="space-y-3">
        {visibleInvitations.map((invite) => (
          <div
            key={invite.id}
            className="recipe-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-green-pale text-green-deep">
                <Mail size={17} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-green-deep">{invite.email}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {ROLE_LABEL[invite.role] ?? invite.role} · expires{" "}
                  {new Date(invite.expires_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pendingId === invite.id}
              loading={pendingId === invite.id}
              onClick={() => handleCancel(invite.id)}
            >
              <X size={14} /> Cancel
            </Button>
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
    </section>
  );
}
