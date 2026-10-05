import "server-only";

import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

const REFUND_WINDOW_SECONDS = 30 * 24 * 60 * 60;

function id(value: string | { id: string } | null | undefined): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

export function withinInitialRefundWindow(paidAt: number, now = Math.floor(Date.now() / 1000)) {
  return now >= paidAt && now - paidAt <= REFUND_WINDOW_SECONDS;
}

export type RefundPreview = {
  subscriptionId: string;
  customerId: string;
  invoiceId: string;
  paymentIntentId: string;
  purchaseDate: string;
  paymentDate: string;
  livemode: boolean;
  amount: number;
  currency: string;
  tax: number | null;
  eligible: boolean;
  alreadyRefunded: boolean;
  existingRefundId: string | null;
  subscriptionStatus: string;
  cancelAtPeriodEnd: boolean;
  periodStart: string | null;
  periodEnd: string | null;
};

/** Resolve purchase eligibility and the payment to refund from Stripe, never browser IDs. */
export async function getRefundPreview(customerId: string, subscriptionId: string): Promise<RefundPreview> {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (id(subscription.customer) !== customerId) throw new Error("Subscription does not belong to this billing account.");
  const invoices = await stripe.invoices.list({ customer: customerId, limit: 100 }).autoPagingToArray({ limit: 1000 });
  const paidSubscriptionInvoices = invoices
    .filter((invoice) => invoice.status === "paid" && invoice.status_transitions.paid_at &&
      (invoice.billing_reason === "subscription_create" || invoice.billing_reason === "subscription_cycle"));
  const first = paidSubscriptionInvoices
    .filter((invoice) => invoice.billing_reason === "subscription_create")
    .sort((a, b) => a.status_transitions.paid_at! - b.status_transitions.paid_at!)[0];
  const target = paidSubscriptionInvoices
    .filter((invoice) => id(invoice.parent?.subscription_details?.subscription) === subscriptionId)
    .sort((a, b) => b.status_transitions.paid_at! - a.status_transitions.paid_at!)[0];
  if (!first?.id || !target?.id) throw new Error("No paid purchase invoice was found for this subscription. Review Stripe manually.");
  const payments = await stripe.invoicePayments.list({ invoice: target.id, status: "paid", limit: 100 });
  if (payments.has_more || payments.data.length !== 1) throw new Error("This invoice has an unusual payment history. Review Stripe manually.");
  const payment = payments.data[0];
  const paymentIntentId = id(payment.payment.payment_intent);
  if (!paymentIntentId || payment.amount_paid !== target.amount_paid || target.amount_paid <= 0) {
    throw new Error("The invoice payment could not be safely identified.");
  }
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (intent.status !== "succeeded" || intent.amount_received !== target.amount_paid || id(intent.customer) !== customerId) {
    throw new Error("The payment does not match this customer and invoice.");
  }
  const existing = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 });
  if (existing.has_more) throw new Error("Refund history is too large to verify safely.");
  const successfulRefunds = existing.data.filter((refund) => refund.status !== "failed");
  if (successfulRefunds.length > 1 || successfulRefunds.some((refund) => refund.amount !== target.amount_paid)) {
    throw new Error("The payment has a partial or unusual refund history. Review Stripe manually.");
  }
  const alreadyRefunded = successfulRefunds.length === 1;
  const item = subscription.items.data[0];
  return {
    subscriptionId, customerId, invoiceId: target.id, paymentIntentId,
    purchaseDate: new Date(first.status_transitions.paid_at! * 1000).toISOString(),
    paymentDate: new Date(target.status_transitions.paid_at! * 1000).toISOString(),
    livemode: subscription.livemode,
    amount: target.amount_paid, currency: target.currency,
    tax: target.total_taxes?.reduce((sum, value) => sum + value.amount, 0) ?? null,
    eligible: first.id === target.id && withinInitialRefundWindow(first.status_transitions.paid_at!),
    alreadyRefunded, existingRefundId: successfulRefunds[0]?.id ?? null, subscriptionStatus: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    periodStart: item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
    periodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
  };
}

export async function refundAndCancel(preview: RefundPreview): Promise<{ refund: Stripe.Refund; cancellationError: string | null }> {
  const stripe = getStripe();
  // Stable keys allow safe retry after Stripe succeeds but this request times out.
  const refund = preview.existingRefundId
    ? await stripe.refunds.retrieve(preview.existingRefundId)
    : await stripe.refunds.create(
        { payment_intent: preview.paymentIntentId, reason: "requested_by_customer" },
        { idempotencyKey: `home-cooked-full-refund-${preview.subscriptionId}` }
      );
  if (refund.amount !== preview.amount || (refund.status !== "succeeded" && refund.status !== "pending")) {
    throw new Error("Stripe did not confirm the full refund. Check the payment before retrying.");
  }
  try {
    const subscription = await stripe.subscriptions.retrieve(preview.subscriptionId);
    if (subscription.status !== "canceled") {
      await stripe.subscriptions.cancel(preview.subscriptionId, { invoice_now: false, prorate: false },
        { idempotencyKey: `home-cooked-refund-cancel-${preview.subscriptionId}` });
    }
    return { refund, cancellationError: null };
  } catch {
    // The caller must still record the refund and remove local Plus access.
    return { refund, cancellationError: "Stripe could not confirm subscription cancellation. Retry this action to prevent renewal." };
  }
}
