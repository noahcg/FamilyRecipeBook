"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { getRefundPreview, refundAndCancel } from "@/lib/billingRefund";
import type { ActionResult } from "@/lib/types";

const refundInput = z.object({
  userId: z.string().uuid(),
  confirmation: z.literal("REFUND"),
  reason: z.string().trim().max(500).optional(),
  exception: z.boolean().default(false),
});

export async function refundPlusSubscription(input: z.input<typeof refundInput>): Promise<ActionResult> {
  const actor = await requireAdmin();
  const parsed = refundInput.safeParse(input);
  if (!parsed.success) return { success: false, error: "Type REFUND to confirm this action." };
  if (parsed.data.exception && !parsed.data.reason) return { success: false, error: "Explain the exception before refunding." };
  const service = createServiceClient();
  const { data: account, error: accountError } = await service.from("billing_accounts")
    .select("stripe_customer_id,stripe_subscription_id,grandfathered_plus")
    .eq("user_id", parsed.data.userId).maybeSingle();
  if (accountError || !account?.stripe_customer_id || !account.stripe_subscription_id) {
    return { success: false, error: "No connected Plus subscription was found." };
  }
  if (account.grandfathered_plus) return { success: false, error: "Remove lifetime Plus access before refunding." };
  try {
    const preview = await getRefundPreview(account.stripe_customer_id, account.stripe_subscription_id);
    if (!preview.eligible && !parsed.data.exception && !preview.alreadyRefunded) {
      return { success: false, error: "The initial purchase is outside the 30-day window. Record an exception reason to continue." };
    }
    const { refund, cancellationError } = await refundAndCancel(preview);
    const { error } = await service.rpc("complete_billing_refund", {
      target_user_id: parsed.data.userId,
      target_subscription_id: preview.subscriptionId,
      target_customer_id: preview.customerId,
      target_invoice_id: preview.invoiceId,
      target_payment_intent_id: preview.paymentIntentId,
      target_refund_id: refund.id,
      target_amount: preview.amount,
      target_currency: preview.currency,
      target_actor_id: actor.id,
      target_reason: parsed.data.reason ?? null,
    });
    if (error) throw new Error("Stripe refunded and canceled the subscription, but Home Cooked could not finish the downgrade. Retry this action immediately.");
    revalidatePath(`/app/admin/users/${parsed.data.userId}`);
    revalidatePath("/app/settings");
    if (cancellationError) return { success: false, error: `Refund recorded and Plus access ended. ${cancellationError}` };
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Refund failed. Check Stripe before retrying." };
  }
}

export async function reconcilePlusBilling(userId: string): Promise<ActionResult> {
  const actor = await requireAdmin();
  const parsed = z.string().uuid().safeParse(userId);
  if (!parsed.success) return { success: false, error: "User not found." };
  const service = createServiceClient();
  const { data: account, error: readError } = await service.from("billing_accounts")
    .select("stripe_customer_id,stripe_subscription_id").eq("user_id", parsed.data).maybeSingle();
  if (readError || !account?.stripe_customer_id || !account.stripe_subscription_id) {
    return { success: false, error: "No linked Stripe subscription was found." };
  }
  try {
    const { getStripe } = await import("@/lib/stripe");
    const { randomUUID } = await import("node:crypto");
    const subscription = await getStripe().subscriptions.retrieve(account.stripe_subscription_id);
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    if (customerId !== account.stripe_customer_id) throw new Error("Stripe customer mapping does not match.");
    const item = subscription.items.data[0];
    const { error } = await service.rpc("apply_billing_webhook", {
      target_event_id: `admin_reconcile_${randomUUID()}`,
      target_event_type: "admin.reconcile",
      target_livemode: subscription.livemode,
      target_event_created: new Date().toISOString(),
      subscription_data: {
        observed_at: new Date().toISOString(),
        plan: subscription.status === "active" || subscription.status === "trialing" ? "plus" : "free",
        status: subscription.status,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: item?.price.id ?? null,
        current_period_start: item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
        current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      },
      payment_customer_id: null,
    });
    if (error) throw new Error("Could not reconcile billing state.");
    await service.from("admin_actions").insert({
      actor_id: actor.id, action: "reconcile_plus_billing", target_type: "user", target_id: parsed.data,
      summary: "Reconciled Plus billing from Stripe", metadata: { customerId, subscriptionId: subscription.id, status: subscription.status },
    });
    revalidatePath(`/app/admin/users/${parsed.data}`);
    revalidatePath("/app/settings");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not reconcile billing state." };
  }
}

const renewalInput = z.object({ userId: z.string().uuid(), cancel: z.boolean() });

export async function setPlusRenewal(input: z.input<typeof renewalInput>): Promise<ActionResult> {
  const actor = await requireAdmin();
  const parsed = renewalInput.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid billing request." };
  const service = createServiceClient();
  const { data: account, error: readError } = await service.from("billing_accounts")
    .select("stripe_customer_id,stripe_subscription_id,refunded_subscription_id")
    .eq("user_id", parsed.data.userId).maybeSingle();
  if (readError || !account?.stripe_customer_id || !account.stripe_subscription_id) {
    return { success: false, error: "No linked Stripe subscription was found." };
  }
  if (account.refunded_subscription_id === account.stripe_subscription_id) {
    return { success: false, error: "This subscription was refunded and cannot renew." };
  }
  try {
    const { getStripe } = await import("@/lib/stripe");
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(account.stripe_subscription_id);
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    if (customerId !== account.stripe_customer_id || !["active", "trialing"].includes(subscription.status)) {
      throw new Error("Subscription is not active for this customer.");
    }
    if (subscription.cancel_at_period_end !== parsed.data.cancel) {
      await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: parsed.data.cancel });
    }
    const reconciled = await reconcilePlusBilling(parsed.data.userId);
    if (!reconciled.success) return reconciled;
    const { error: auditError } = await service.from("admin_actions").insert({
      actor_id: actor.id,
      action: parsed.data.cancel ? "cancel_plus_renewal" : "reactivate_plus_renewal",
      target_type: "user", target_id: parsed.data.userId,
      summary: parsed.data.cancel ? "Scheduled Plus cancellation at period end" : "Reactivated Plus renewal",
      metadata: { customerId, subscriptionId: subscription.id, cancelAtPeriodEnd: parsed.data.cancel },
    });
    if (auditError) throw new Error("Renewal changed, but the admin audit log failed. Review the billing account.");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not change renewal." };
  }
}
