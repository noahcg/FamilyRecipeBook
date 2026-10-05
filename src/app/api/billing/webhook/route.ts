import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function stripeId(value: string | { id?: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new NextResponse("Webhook not configured", { status: 400 });
  let event: Stripe.Event;
  try { event = getStripe().webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return new NextResponse("Invalid signature", { status: 400 }); }
  try {
    const admin = createServiceClient();
    const existing = await admin.from("billing_webhook_events").select("processing_status").eq("event_id", event.id).maybeSingle();
    if (existing.error) throw new Error("Could not read webhook status");
    if (existing.data?.processing_status === "processed") return NextResponse.json({ received: true, duplicate: true });
    if (event.type === "charge.refunded") {
      const stripe = getStripe();
      const eventCharge = event.data.object as Stripe.Charge;
      // Re-read Stripe: a stale or partial event cannot downgrade an account.
      const charge = await stripe.charges.retrieve(eventCharge.id);
      const customerId = stripeId(charge.customer);
      const paymentIntentId = stripeId(charge.payment_intent);
      if (customerId && paymentIntentId && charge.amount > 0 && charge.amount_refunded === charge.amount) {
        const payments = await stripe.invoicePayments.list({
          payment: { type: "payment_intent", payment_intent: paymentIntentId }, status: "paid", limit: 100,
        });
        if (payments.has_more || payments.data.length !== 1) throw new Error("Refund payment has ambiguous invoice ownership");
        const invoiceId = stripeId(payments.data[0].invoice);
        if (!invoiceId) throw new Error("Refund invoice is missing");
        const invoice = await stripe.invoices.retrieve(invoiceId);
        const subscriptionId = stripeId(invoice.parent?.subscription_details?.subscription);
        if (subscriptionId && stripeId(invoice.customer) === customerId && invoice.amount_paid === charge.amount) {
          const { data: account, error: accountError } = await admin.from("billing_accounts")
            .select("user_id,stripe_subscription_id,grandfathered_plus").eq("stripe_customer_id", customerId).maybeSingle();
          if (accountError) throw new Error("Could not read refund customer mapping");
          if (account?.stripe_subscription_id === subscriptionId) {
            if (account.grandfathered_plus) throw new Error("Remove lifetime Plus grant before reconciling refund");
            const refunds = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 });
            if (refunds.has_more) throw new Error("Refund history is ambiguous");
            const accepted = refunds.data.filter((refund) => refund.status === "succeeded" || refund.status === "pending");
            if (!accepted.length || accepted.reduce((sum, refund) => sum + refund.amount, 0) !== charge.amount) {
              throw new Error("Full refund could not be verified");
            }
            let cancelFailed = false;
            try {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              if (stripeId(subscription.customer) !== customerId) throw new Error("Subscription ownership changed");
              if (subscription.status !== "canceled") {
                await stripe.subscriptions.cancel(subscriptionId, { invoice_now: false, prorate: false },
                  { idempotencyKey: `home-cooked-refund-cancel-${subscriptionId}` });
              }
            } catch { cancelFailed = true; }
            const { error: refundError } = await admin.rpc("complete_billing_refund", {
              target_user_id: account.user_id,
              target_subscription_id: subscriptionId,
              target_customer_id: customerId,
              target_invoice_id: invoiceId,
              target_payment_intent_id: paymentIntentId,
              target_refund_id: accepted[0].id,
              target_amount: charge.amount,
              target_currency: charge.currency,
              target_actor_id: null,
              target_reason: "Verified Stripe full refund event",
            });
            if (refundError || cancelFailed) throw new Error("Refund downgrade or cancellation needs retry");
          }
        }
      }
    }
    let subscriptionId: string | null = null;
    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      subscriptionId = (event.data.object as Stripe.Subscription).id;
    } else if (event.type === "checkout.session.completed") {
      subscriptionId = stripeId((event.data.object as Stripe.Checkout.Session).subscription);
    }
    // Events within one second have no total ordering. Reconcile the current Stripe
    // subscription instead of replaying an old event payload for those deliveries.
    const observedAt = new Date().toISOString();
    const subscription = subscriptionId ? await getStripe().subscriptions.retrieve(subscriptionId) : null;
    const item = subscription?.items.data[0];
    const { data, error } = await admin.rpc("apply_billing_webhook", {
      target_event_id: event.id,
      target_event_type: event.type,
      target_livemode: event.livemode,
      target_event_created: new Date(event.created * 1000).toISOString(),
      subscription_data: subscription ? {
        observed_at: observedAt,
        plan: subscription.status === "active" || subscription.status === "trialing" ? "plus" : "free",
        status: subscription.status,
        stripe_customer_id: stripeId(subscription.customer),
        stripe_subscription_id: subscription.id,
        stripe_price_id: item?.price.id ?? null,
        current_period_start: item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
        current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      } : null,
      payment_customer_id: event.type === "invoice.paid" ? stripeId((event.data.object as Stripe.Invoice).customer) : null,
    });
    if (error) throw new Error("Billing transaction failed");
    return NextResponse.json({ received: true, duplicate: data === false });
  } catch {
    // Return a retryable response; the transaction leaves no partial entitlement
    // or processed-event writes. Avoid logging provider payloads or private data.
    console.error("[billing] webhook_failed", { eventId: event.id, type: event.type });
    return new NextResponse("Webhook processing failed", { status: 500 });
  }
}
