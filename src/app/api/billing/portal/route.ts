import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe, getBillingAppUrl } from "@/lib/stripe";

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });
  const { data } = await createServiceClient().from("billing_accounts").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (!data?.stripe_customer_id) return NextResponse.json({ error: "No billing account is connected yet." }, { status: 400 });
  const session = await getStripe().billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${getBillingAppUrl()}/app/settings` });
  console.info("[billing] portal_created", { userId: user.id });
  return NextResponse.json({ url: session.url });
}
