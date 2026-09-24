import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe, getBillingAppUrl } from "@/lib/stripe";

export async function POST() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Sign in to upgrade." }, { status: 401 });
    const price = process.env.STRIPE_PLUS_ANNUAL_PRICE_ID;
    if (!price) return NextResponse.json({ error: "Plus checkout is not configured yet." }, { status: 503 });
    const admin = createServiceClient();
    const { data: billing } = await admin.from("billing_accounts").select("*").eq("user_id", user.id).maybeSingle();
    if (billing?.grandfathered_plus) {
      return NextResponse.json({ error: "Your account already has lifetime Plus access." }, { status: 409 });
    }
    if (billing?.stripe_subscription_id && ["active", "trialing", "past_due", "unpaid"].includes(billing.status)) {
      return NextResponse.json({ error: "You already have a Plus subscription. Use Manage Billing in Settings." }, { status: 409 });
    }
    const stripe = getStripe();
    let customerId = billing?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { home_cooked_user_id: user.id } });
      customerId = customer.id;
      await admin.from("billing_accounts").upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${getBillingAppUrl()}/app/settings?billing=processing`,
      cancel_url: `${getBillingAppUrl()}/pricing?billing=canceled`,
      metadata: { home_cooked_user_id: user.id },
      subscription_data: { metadata: { home_cooked_user_id: user.id } },
    });
    console.info("[billing] checkout_created", { userId: user.id, sessionId: session.id });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[billing] checkout_failed", { message: error instanceof Error ? error.message : "Unknown checkout error" });
    return NextResponse.json({ error: "Checkout could not be started. Check the server and Stripe configuration, then try again." }, { status: 500 });
  }
}
