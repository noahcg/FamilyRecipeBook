"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog } from "@/components/ui";
import { refundPlusSubscription, reconcilePlusBilling, setPlusRenewal } from "@/lib/actions/billingRefund";
import type { RefundPreview } from "@/lib/billingRefund";

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "Unknown";
}

export function BillingRefundControls({ userId, preview, status, plan, error, completedRefund }: {
  userId: string;
  preview: RefundPreview | null;
  status: string;
  plan: string;
  error: string | null;
  completedRefund: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [exception, setException] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const needsException = Boolean(preview && !preview.eligible && !preview.alreadyRefunded);
  const needsCancellationRecovery = Boolean(completedRefund && preview && preview.subscriptionStatus !== "canceled");
  return <section className="recipe-card mt-6 p-5">
    <h2 className="text-base font-black text-ink">Plus billing review</h2>
    <p className="mt-2 text-sm text-ink-muted">Local plan: {plan} · Stripe status: {status}. Cancel renewal and Refund and downgrade are separate actions. Cancel renewal does not issue a refund.</p>
    {preview ? <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
      <div><dt className="font-bold">Subscription</dt><dd className="break-all">{preview.subscriptionId}</dd></div>
      <div><dt className="font-bold">Paid through</dt><dd>{completedRefund ? "Ended by refund" : date(preview.periodEnd)}</dd></div>
      <div><dt className="font-bold">Renewal</dt><dd>{preview.subscriptionStatus === "canceled" ? "Ended" : preview.cancelAtPeriodEnd ? "Cancellation scheduled" : "Scheduled to renew"}</dd></div>
      <div><dt className="font-bold">Initial purchase</dt><dd>{date(preview.purchaseDate)}</dd></div>
      <div><dt className="font-bold">Payment being refunded</dt><dd>{date(preview.paymentDate)}</dd></div>
      <div><dt className="font-bold">Stripe mode</dt><dd>{preview.livemode ? "Live" : "Test"}</dd></div>
      <div><dt className="font-bold">Paid</dt><dd>{new Intl.NumberFormat("en", { style: "currency", currency: preview.currency }).format(preview.amount / 100)}</dd></div>
      <div><dt className="font-bold">Tax included</dt><dd>{preview.tax === null ? "Unavailable" : new Intl.NumberFormat("en", { style: "currency", currency: preview.currency }).format(preview.tax / 100)}</dd></div>
      <div><dt className="font-bold">30-day policy</dt><dd>{preview.eligible ? "Eligible" : "Outside window"}</dd></div>
      <div><dt className="font-bold">Stripe refund</dt><dd>{preview.alreadyRefunded ? "Already refunded; reconcile downgrade" : "No refund found"}</dd></div>
    </dl> : <p className="mt-3 text-sm text-ink-muted">{error ?? "No Stripe subscription is connected."}</p>}
    <div className="mt-5 flex flex-wrap gap-3">
      {preview && (!completedRefund || needsCancellationRecovery) ? <Button variant={needsCancellationRecovery ? "secondary" : "danger"} onClick={() => setOpen(true)}>{needsCancellationRecovery ? "Finish subscription cancellation" : "Refund and downgrade now"}</Button> : null}
      {completedRefund ? <p className="text-sm font-bold text-green-deep">Refund and downgrade recorded.{needsCancellationRecovery ? " Stripe cancellation still needs confirmation." : ""}</p> : null}
      {preview && !completedRefund && ["active", "trialing"].includes(preview.subscriptionStatus) ? <Button variant="secondary" disabled={pending} onClick={() => setRenewalOpen(true)}>{preview.cancelAtPeriodEnd ? "Reactivate renewal" : "Cancel renewal"}</Button> : null}
      <Button variant="secondary" disabled={pending} onClick={() => startTransition(async () => {
        const result = await reconcilePlusBilling(userId);
        if (!result.success) setResultError(result.error);
        else { setResultError(null); router.refresh(); }
      })}>Refresh from Stripe</Button>
    </div>
    {resultError ? <p role="alert" className="mt-3 text-sm text-danger">{resultError}</p> : null}
    <Dialog open={renewalOpen} onClose={() => !pending && setRenewalOpen(false)} title={preview?.cancelAtPeriodEnd ? "Reactivate renewal" : "Cancel renewal"}>
      <p className="text-sm text-ink-muted">{preview?.cancelAtPeriodEnd
        ? "This resumes annual renewal without creating a second subscription. Plus access stays continuous."
        : `This stops future renewal charges. Plus access continues through ${date(preview?.periodEnd ?? null)}. No refund is issued.`}</p>
      <div className="mt-5 flex gap-3"><Button variant="secondary" disabled={pending} onClick={() => setRenewalOpen(false)}>Keep current setting</Button>
        <Button disabled={pending} loading={pending} onClick={() => {
          setResultError(null);
          startTransition(async () => {
            const result = await setPlusRenewal({ userId, cancel: !preview?.cancelAtPeriodEnd });
            if (!result.success) setResultError(result.error);
            else { setRenewalOpen(false); router.refresh(); }
          });
        }}>{preview?.cancelAtPeriodEnd ? "Reactivate" : "Cancel renewal"}</Button></div>
    </Dialog>
    <Dialog open={open} onClose={() => !pending && setOpen(false)} title="Refund and end Plus now">
      <p className="text-sm text-ink-muted">{needsCancellationRecovery
        ? "The payment was already refunded and Plus access ended. Retry the Stripe cancellation so renewal cannot occur."
        : "This refunds the selected subscription payment in full, cancels the subscription immediately, and ends Plus access. The account and saved content remain."}</p>
      {needsException ? <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={exception} onChange={(e) => setException(e.target.checked)} /> Approve an exception outside 30 days</label> : null}
      <label className="mt-4 block text-sm font-bold">Reason or support case
        <textarea className="mt-1 w-full rounded-md border border-line p-2" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
      </label>
      <label className="mt-4 block text-sm font-bold">Type REFUND to confirm
        <input className="mt-1 w-full rounded-md border border-line p-2" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
      </label>
      <div className="mt-5 flex gap-3"><Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
        <Button variant="danger" disabled={pending || confirmation !== "REFUND" || (needsException && (!exception || !reason.trim()))} loading={pending} onClick={() => {
          setResultError(null);
          startTransition(async () => {
            const result = await refundPlusSubscription({ userId, confirmation: "REFUND", reason, exception });
            if (!result.success) setResultError(result.error);
            else { setOpen(false); router.refresh(); }
          });
        }}>{needsCancellationRecovery ? "Finish cancellation" : "Issue full refund"}</Button>
      </div>
    </Dialog>
  </section>;
}
