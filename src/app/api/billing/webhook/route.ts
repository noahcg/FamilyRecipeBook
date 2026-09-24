import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function plusStatus(status: Stripe.Subscription.Status) { return status === "active" || status === "trialing" ? "plus" : "free"; }

async function syncSubscription(subscription: Stripe.Subscription, eventId: string, eventCreated: number) {
  const admin = createServiceClient();
  const metadataUserId = subscription.metadata?.home_cooked_user_id;
  let userId = metadataUserId;
  if (!userId) {
    const { data } = await admin.from("billing_accounts").select("user_id").eq("stripe_customer_id", String(subscription.customer)).maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) throw new Error("Subscription has no trusted local user mapping");
  const item = subscription.items.data[0];
  const isOlder = await admin.from("billing_accounts").select("source_event_created_at").eq("user_id", userId).maybeSingle();
  if (isOlder.data?.source_event_created_at && new Date(isOlder.data.source_event_created_at).getTime() > eventCreated * 1000) return;
  await admin.from("billing_accounts").upsert({
    user_id: userId, plan: plusStatus(subscription.status), status: subscription.status,
    stripe_customer_id: String(subscription.customer), stripe_subscription_id: subscription.id,
    stripe_price_id: item?.price?.id ?? null,
    current_period_start: new Date(subscription.items.data[0]?.current_period_start ? subscription.items.data[0].current_period_start * 1000 : Date.now()).toISOString(),
    current_period_end: new Date(subscription.items.data[0]?.current_period_end ? subscription.items.data[0].current_period_end * 1000 : Date.now()).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end, canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    source_event_id: eventId, source_event_created_at: new Date(eventCreated * 1000).toISOString(),
  }, { onConflict: "user_id" });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new NextResponse("Webhook not configured", { status: 400 });
  let event: Stripe.Event;
  try { event = getStripe().webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return new NextResponse("Invalid signature", { status: 400 }); }
  const admin = createServiceClient();
  const inserted = await admin.from("billing_webhook_events").insert({ event_id: event.id, event_type: event.type, livemode: event.livemode });
  if (inserted.error?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
  if (inserted.error) return new NextResponse("Could not record event", { status: 500 });
  try {
    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) await syncSubscription(event.data.object as Stripe.Subscription, event.id, event.created);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const subscription = await getStripe().subscriptions.retrieve(String(session.subscription));
        await syncSubscription(subscription, event.id, event.created);
      }
    }
    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = String(invoice.customer ?? "");
      await admin.from("billing_accounts").update({ last_payment_at: event.type === "invoice.paid" ? new Date(event.created * 1000).toISOString() : null }).eq("stripe_customer_id", customerId);
    }
    await admin.from("billing_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString() }).eq("event_id", event.id);
    console.info("[billing] webhook_processed", { eventId: event.id, type: event.type });
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    await admin.from("billing_webhook_events").update({ processing_status: "failed", error_message: message }).eq("event_id", event.id);
    console.error("[billing] webhook_failed", { eventId: event.id, type: event.type, message });
    return new NextResponse("Webhook processing failed", { status: 500 });
  }
}
