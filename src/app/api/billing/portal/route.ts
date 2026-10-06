import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe, getBillingAppUrl } from "@/lib/stripe";

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });
  try {
    const admin = createServiceClient();
    const { data, error: accountError } = await admin.from("billing_accounts")
      .select("stripe_customer_id,stripe_subscription_id")
      .eq("user_id", user.id).maybeSingle();
    if (accountError) throw accountError;
    if (!data?.stripe_customer_id) return NextResponse.json({ error: "No billing account is connected yet." }, { status: 400 });

    const stripe = getStripe();
    let customerId = data.stripe_customer_id;
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) return missingBillingAccount();
    } catch (error) {
      if (!(error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing")) throw error;
      if (!data.stripe_subscription_id) return missingBillingAccount();

      let subscription: Stripe.Subscription;
      try {
        subscription = await stripe.subscriptions.retrieve(data.stripe_subscription_id);
      } catch (subscriptionError) {
        if (subscriptionError instanceof Stripe.errors.StripeInvalidRequestError && subscriptionError.code === "resource_missing") return missingBillingAccount();
        throw subscriptionError;
      }
      if (subscription.metadata.home_cooked_user_id && subscription.metadata.home_cooked_user_id !== user.id) {
        throw new Error("Billing subscription ownership mismatch");
      }
      if (typeof subscription.customer !== "string") return missingBillingAccount();
      customerId = subscription.customer;
      const { error: updateError } = await admin.from("billing_accounts")
        .update({ stripe_customer_id: customerId }).eq("user_id", user.id);
      if (updateError) throw updateError;
      console.info("[billing] portal_customer_recovered", { userId: user.id });
    }

    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${getBillingAppUrl()}/app/settings` });
    console.info("[billing] portal_created", { userId: user.id });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[billing] portal_failed", { message: error instanceof Error ? error.message : "Unknown portal error" });
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing") return missingBillingAccount();
    return NextResponse.json({ error: "Billing is temporarily unavailable. Please try again or contact support." }, { status: 500 });
  }
}

function missingBillingAccount() {
  return NextResponse.json({ error: "Your billing account needs to be reconnected. Please contact support; your current Plus access is unchanged." }, { status: 409 });
}
