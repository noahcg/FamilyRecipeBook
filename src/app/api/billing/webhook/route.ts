import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function stripeId(value: string | { id: string } | null) {
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
