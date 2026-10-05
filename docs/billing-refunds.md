# Plus billing, cancellation, and refunds

## Source of truth

Stripe owns charges, invoices, refunds, and subscription lifecycle. The signed webhook mirrors the current subscription into `billing_accounts`. Server-side entitlement checks read that row; database write policies/functions use its `plan`. `grandfathered_plus` is a separate administrator grant. After a refund, `refunded_subscription_id` prevents a delayed webhook for that same subscription from restoring Plus. A new paid subscription ID can grant Plus again.

## Normal cancellation

The live Stripe customer portal's default configuration is set to cancel at the end of the period with no proration. The subscription stays active and Plus continues until the paid-through date. The portal or the admin user page can reactivate a scheduled cancellation before it ends. The admin page also has a separate Cancel renewal control; neither action issues a refund. Stripe's `customer.subscription.updated` and `customer.subscription.deleted` webhooks then update the local billing row. No refund is issued by cancellation. Settings shows the paid-through date. Existing recipes, books, plans, and lists are retained when a plan changes; Free limits apply to future use.

## Full refund with immediate downgrade

In Admin → User → Plus billing review, inspect the Stripe subscription, first Plus purchase, target payment, amount, tax, and refund history. Type `REFUND` to issue the full refund and immediately cancel the subscription. The administrator action obtains customer and subscription IDs from the local billing row, then finds the paid subscription invoice and its sole payment in Stripe. It checks ownership and amount against the PaymentIntent. The refund is issued against that PaymentIntent without calculating tax separately. Stable Stripe idempotency keys and the `billing_refunds` uniqueness constraints make retries safe. Checkout checks the linked subscription in Stripe before opening a new session, so an unfinished cancellation cannot create a second active subscription. The final database transaction writes the refund record and admin audit entry and removes Plus access. It never deletes an account or its content.

A full refund within 30 elapsed days (inclusive) of the customer's **first paid Plus subscription invoice** qualifies under the policy. A renewed or later subscription does not get a new automatic window. An administrator may approve an exception with a written reason; in that case the action targets the latest paid subscription invoice (including a renewal) and still verifies the actual payment to be refunded. Unusual invoice payments, partial refunds, or mismatched customer records stop for manual investigation. There is no automatic refund from normal cancellation.

If a request fails after Stripe creates the refund, retry the same admin action. It detects the existing full refund, cancels the subscription if needed, and completes the local downgrade. If Stripe cancellation fails after the refund, the local downgrade still commits immediately; retry until Stripe confirms cancellation so renewal cannot occur. Do not issue a second refund directly in the Stripe Dashboard. If the customer already has lifetime Plus access, remove that separate grant first. Stripe can send refund emails when that setting is enabled; Home Cooked has no dedicated refund email template.

## Reconciliation and recovery

The admin user page shows Stripe's current subscription and payment details. `Refresh from Stripe` rereads the linked subscription and applies it through the same atomic webhook transaction. It cannot restore a refunded subscription because the refund guard remains in the database. Compare this with the local billing status shown on the page and the account Settings card. If the local customer or subscription mapping is wrong, investigate the Stripe customer and subscription before changing anything; the refresh action fails on mismatched ownership.

A full refund issued outside Home Cooked's admin action is reconciled by the signed `charge.refunded` webhook after that event is enabled. It validates the current Stripe charge, invoice, payment, customer, and linked subscription before canceling and downgrading. Partial refunds do not downgrade. The admin action can also detect an existing full refund of its target payment and finish cancellation without refunding twice. Partial or ambiguous payment histories require separate investigation. Do not manually edit `billing_accounts` or `billing_refunds` to bypass those checks.

## Webhooks and deployment

The app verifies Stripe's signature against the raw request body. It handles `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and verified full `charge.refunded`. `invoice.payment_failed` is acknowledged; subscription status changes are reflected by subscription events. Events are recorded by ID and processed atomically. Subscription events retrieve current Stripe state, and the refunded-subscription guard rejects stale Plus updates.

Apply migration `036_refund_lifecycle.sql` to staging, then production before deploying code that selects the new columns. No new environment variables are needed. The live Stripe endpoint was checked on October 5, 2026; it was enabled for the checkout, subscription, and invoice events listed above, plus `invoice.payment_failed`, but **not yet `charge.refunded`**. Add `charge.refunded` to the existing live and test webhook endpoints when deploying this change. The live portal default configuration was checked to use period-end cancellation. Verify those settings again during release if Stripe configuration has changed.

Test in Stripe test mode with a separate test-mode key, webhook secret, and customer portal. Cover purchase, scheduled cancellation, reactivation, full refund, retry, and a late webhook. Automated tests use fakes and PGlite and never call live Stripe.
