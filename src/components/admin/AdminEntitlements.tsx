"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Crown, ShieldOff, Sparkles } from "lucide-react";
import { Button, Dialog } from "@/components/ui";
import { setUserGrandfatheredPlus } from "@/lib/actions/admin";
import type { BillingTier } from "@/lib/entitlements";

export interface AdminEntitlementRow {
  id: string;
  name: string;
  email: string | null;
  tier: BillingTier;
}

export function AdminEntitlements({ rows }: { rows: AdminEntitlementRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<AdminEntitlementRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function changeAccess(row: AdminEntitlementRow) {
    const enabled = row.tier !== "grandfathered";
    if (enabled) {
      applyChange(row, true);
      return;
    }
    setConfirming(row);
  }

  function applyChange(row: AdminEntitlementRow, enabled: boolean) {
    startTransition(async () => {
      setWorkingId(row.id);
      setMessage(null);
      setConfirming(null);
      const result = await setUserGrandfatheredPlus(row.id, enabled);
      if (!result.success) setMessage(result.error);
      else router.refresh();
      setWorkingId(null);
    });
  }

  return (
    <section className="mt-8 recipe-card overflow-hidden">
      <div className="border-b border-line-soft px-5 py-4">
        <div className="flex items-center gap-2">
          <Crown size={17} className="text-accent-cinnamon" />
          <h2 className="text-base font-black text-ink">Account tiers</h2>
        </div>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-muted">
          Grant lifetime Plus access to specific users without Stripe billing. Existing users were grandfathered automatically when this tier was enabled.
        </p>
        {message && <p role="alert" className="mt-2 text-xs font-semibold text-danger">{message}</p>}
      </div>
      <div className="divide-y divide-line-soft">
        {rows.map((row) => {
          const granted = row.tier === "grandfathered";
          const paid = row.tier === "plus";
          return (
            <div key={row.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-ink">{row.name}</p>
                <p className="truncate text-xs text-ink-muted">{row.email ?? "No email on file"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${granted ? "bg-accent-honey/25 text-accent-cinnamon" : paid ? "bg-green-pale text-green-deep" : "bg-card-muted text-ink-muted"}`}>
                  {granted ? <Sparkles size={12} /> : null}
                  {granted ? "Grandfathered" : paid ? "Plus" : "Free"}
                </span>
                <Button
                  size="sm"
                  variant={granted ? "danger" : "secondary"}
                  disabled={isPending || workingId === row.id}
                  loading={workingId === row.id}
                  onClick={() => changeAccess(row)}
                >
                  {granted ? <ShieldOff size={14} /> : <Crown size={14} />}
                  {granted ? "Revoke" : "Grant lifetime Plus"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <Dialog
        open={confirming !== null}
        onClose={() => (isPending ? undefined : setConfirming(null))}
        title="Revoke lifetime Plus access?"
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          {confirming?.name} will return to the Free tier and lose access to Plus-only features. Their recipes and cookbooks will remain intact.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={() => setConfirming(null)}
          >
            Keep access
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={isPending}
            disabled={isPending || !confirming}
            onClick={() => confirming && applyChange(confirming, false)}
          >
            Revoke access
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
