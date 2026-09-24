# Home Cooked billing runbook

Home Cooked uses Stripe-hosted Checkout and the Billing Portal. The durable source of truth is the signed webhook at `/api/billing/webhook`; a successful Checkout redirect alone never grants Plus.

## Policy

Free includes one owned cookbook, 50 recipes created/saved by the user, individual recipe sharing, Favorites, and 5 AI recipe ideas per UTC calendar month. Plus is `$14.99/year`, includes the Plus-only features shown on `/pricing`, and has a 50 AI-idea monthly allowance. `active` and `trialing` grant Plus. `past_due`, `unpaid`, `canceled`, `incomplete`, and `incomplete_expired` fall back to Free. Cancellation retains data and leaves existing over-limit records readable/editable; only new restricted mutations are blocked.

Recipe counts use `recipes.created_by = user_id`; cookbook limits use owned `recipe_books.owner_id`. Shared cookbooks do not consume the owner limit for a member.

## Setup

Create a Stripe Product and annual recurring Price for 1499 USD cents. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PLUS_ANNUAL_PRICE_ID`, and `APP_URL` in each environment. Register `POST /api/billing/webhook` and enable checkout, subscription, and invoice events used by the route.

Apply migrations in order, including `026_billing_entitlements.sql`. Existing profiles are backfilled to Free and no recipe/cookbook rows are deleted.

For local testing, use Stripe test mode and `stripe listen --forward-to localhost:3000/api/billing/webhook`. Inspect `billing_accounts` and `billing_webhook_events` when debugging. A failed event remains marked `failed` and Stripe can retry it; replaying the same event is safe because event IDs are unique.

Never log card data, webhook signatures, or secret keys. Rotate Stripe secrets in the environment and webhook endpoint together when required.
