"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cancelShareableInvitation, type PendingShareableInvitation } from "@/lib/actions/shareableInvitations";

export function PendingShareableInvitations({ bookId, invitations, inviterNames }: { bookId: string; invitations: PendingShareableInvitation[]; inviterNames: Record<string, string> }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!invitations.length) return null;

  async function cancel(id: string) {
    setPendingId(id);
    setError("");
    try {
      const result = await cancelShareableInvitation(bookId, id);
      if (!result.success) setError(result.error);
      else router.refresh();
    } catch {
      setError("Could not cancel the link. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">Invitation links</p>
      <p className="mb-3 text-sm text-ink-muted">Cancel a link to stop anyone else from joining with it. Lost a link? Cancel it and create another.</p>
      <div className="space-y-3">
        {invitations.map((invite) => (
          <div key={invite.id} className="recipe-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-green-pale text-green-deep"><Link2 size={17} /></span>
              <div>
                <p className="text-sm font-bold text-green-deep">Invitation link</p>
                <p className="mt-0.5 text-xs text-ink-muted">Created by {inviterNames[invite.invited_by] || "a former member"} · {invite.role === "family" ? "Family" : "Contributor"} · {invite.link_type === "single" ? "Single use" : "Group link"} · expires {new Date(invite.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
            </div>
            <Button type="button" variant="secondary" size="sm" disabled={pendingId !== null} loading={pendingId === invite.id} onClick={() => cancel(invite.id)}><X size={14} /> Cancel</Button>
          </div>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p>}
    </section>
  );
}
