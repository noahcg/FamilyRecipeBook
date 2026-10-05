import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import ts from "typescript";

const user = "00000000-0000-0000-0000-000000000001";
const actor = "00000000-0000-0000-0000-000000000002";
const migration32 = await readFile(new URL("../supabase/migrations/032_atomic_billing_webhooks.sql", import.meta.url), "utf8");
const migration33 = await readFile(new URL("../supabase/migrations/036_refund_lifecycle.sql", import.meta.url), "utf8");

test("refund downgrade, audit, duplicate completion, stale webhook, and new purchase", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table profiles(id uuid primary key); insert into profiles values('${user}'),('${actor}');
      create table admin_actions(actor_id uuid, action text, target_type text, target_id text, summary text, metadata jsonb);
      create table billing_accounts(user_id uuid primary key, plan text, status text,
        stripe_customer_id text unique, stripe_subscription_id text, stripe_price_id text,
        current_period_start timestamptz, current_period_end timestamptz, cancel_at_period_end boolean,
        canceled_at timestamptz, source_event_id text, source_event_created_at timestamptz,
        last_payment_at timestamptz, updated_at timestamptz);
      create table billing_webhook_events(event_id text primary key, event_type text, livemode boolean,
        processing_status text default 'received', processed_at timestamptz, error_message text);
      create table recipes(id text primary key, created_by uuid); insert into recipes values('saved-recipe','${user}');
      insert into billing_accounts(user_id,plan,status,stripe_customer_id,stripe_subscription_id)
      values('${user}','plus','active','cus_test','sub_test');`);
    await db.exec(migration32);
    await db.exec(migration33);
    const params = [user, "sub_test", "cus_test", "in_initial", "pi_initial", "re_full", 2499, "usd", actor, "Customer request"];
    const complete = () => db.query("select complete_billing_refund($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as applied", params);
    assert.equal((await complete()).rows[0].applied, true);
    assert.equal((await complete()).rows[0].applied, false);
    let account = (await db.query("select plan,status,refunded_subscription_id from billing_accounts")).rows[0];
    assert.deepEqual(account, { plan: "free", status: "canceled", refunded_subscription_id: "sub_test" });
    assert.equal((await db.query("select count(*)::int as count from admin_actions")).rows[0].count, 1);
    assert.equal((await db.query("select count(*)::int as count from recipes")).rows[0].count, 1);
    const snapshot = (sub, status, observed) => ({ plan: status === "active" ? "plus" : "free", status,
      stripe_customer_id: "cus_test", stripe_subscription_id: sub, observed_at: observed, cancel_at_period_end: false });
    const apply = (event, payload) => db.query("select apply_billing_webhook($1,'customer.subscription.updated',true,now(),$2::jsonb,null)", [event, JSON.stringify(payload)]);
    await apply("evt_late", snapshot("sub_test", "active", "2099-01-01T00:00:00Z"));
    account = (await db.query("select plan,status from billing_accounts")).rows[0];
    assert.deepEqual(account, { plan: "free", status: "canceled" });
    await apply("evt_new", snapshot("sub_new", "active", "2099-01-02T00:00:00Z"));
    account = (await db.query("select plan,stripe_subscription_id from billing_accounts")).rows[0];
    assert.deepEqual(account, { plan: "plus", stripe_subscription_id: "sub_new" });
  } finally { await db.close(); }
});

function loadRefundModule(stripe) {
  return readFile(new URL("../src/lib/billingRefund.ts", import.meta.url), "utf8").then((source) => {
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const exports = {};
    Function("exports", "require", compiled)(exports, (name) => {
      if (name === "@/lib/stripe") return { getStripe: () => stripe };
      if (name === "server-only") return {};
      throw new Error(name);
    });
    return exports;
  });
}

test("initial purchase window includes day 30 and excludes day 31", async () => {
  const { withinInitialRefundWindow } = await loadRefundModule({});
  const purchase = 1_000_000;
  assert.equal(withinInitialRefundWindow(purchase, purchase + 86_400), true);
  assert.equal(withinInitialRefundWindow(purchase, purchase + 30 * 86_400), true);
  assert.equal(withinInitialRefundWindow(purchase, purchase + 31 * 86_400), false);
});

test("refund retry reuses an existing Stripe refund and completes cancellation", async () => {
  let createCount = 0;
  let cancelCount = 0;
  let refunded = false;
  let canceled = false;
  const paidAt = Math.floor(Date.now() / 1000) - 14 * 86_400;
  const stripe = {
    subscriptions: {
      retrieve: async () => ({ id: "sub_test", customer: "cus_test", status: canceled ? "canceled" : "active", items: { data: [] } }),
      cancel: async () => { cancelCount += 1; if (cancelCount === 1) throw new Error("Network interrupted"); canceled = true; },
    },
    invoices: { list: () => ({ autoPagingToArray: async () => [{ id: "in_initial", customer: "cus_test", status: "paid", billing_reason: "subscription_create", created: paidAt, status_transitions: { paid_at: paidAt }, parent: { subscription_details: { subscription: "sub_test" } }, amount_paid: 2499, currency: "usd", total_taxes: [{ amount: 125 }] }] }) },
    invoicePayments: { list: async () => ({ has_more: false, data: [{ payment: { payment_intent: "pi_initial" }, amount_paid: 2499 }] }) },
    paymentIntents: { retrieve: async () => ({ customer: "cus_test", status: "succeeded", amount_received: 2499 }) },
    refunds: {
      list: async () => ({ has_more: false, data: refunded ? [{ id: "re_full", amount: 2499, status: "succeeded" }] : [] }),
      create: async () => { createCount += 1; refunded = true; return { id: "re_full", amount: 2499, status: "succeeded" }; },
      retrieve: async () => ({ id: "re_full", amount: 2499, status: "succeeded" }),
    },
  };
  const { getRefundPreview, refundAndCancel } = await loadRefundModule(stripe);
  const first = await getRefundPreview("cus_test", "sub_test");
  assert.equal(first.eligible, true);
  const interrupted = await refundAndCancel(first);
  assert.match(interrupted.cancellationError, /could not confirm/);
  const retry = await getRefundPreview("cus_test", "sub_test");
  assert.equal(retry.alreadyRefunded, true);
  const completed = await refundAndCancel(retry);
  assert.equal(completed.cancellationError, null);
  assert.equal(createCount, 1);
  assert.equal(cancelCount, 2);
  assert.equal(canceled, true);
});

test("renewed or later subscription is outside initial-purchase policy and targets its own payment", async () => {
  const now = Math.floor(Date.now() / 1000);
  const purchases = [
    { id: "in_first", status: "paid", billing_reason: "subscription_create", created: now - 365 * 86_400,
      status_transitions: { paid_at: now - 365 * 86_400 }, parent: { subscription_details: { subscription: "sub_old" } }, amount_paid: 2499, currency: "usd" },
    { id: "in_target", status: "paid", billing_reason: "subscription_create", created: now - 86_400,
      status_transitions: { paid_at: now - 86_400 }, parent: { subscription_details: { subscription: "sub_current" } }, amount_paid: 2600, currency: "usd" },
  ];
  let invoiceId;
  const stripe = {
    subscriptions: { retrieve: async () => ({ customer: "cus_test", status: "active", items: { data: [] }, livemode: false }) },
    invoices: { list: () => ({ autoPagingToArray: async () => purchases }) },
    invoicePayments: { list: async ({ invoice }) => { invoiceId = invoice; return { has_more: false, data: [{ payment: { payment_intent: "pi_target" }, amount_paid: 2600 }] }; } },
    paymentIntents: { retrieve: async () => ({ customer: "cus_test", status: "succeeded", amount_received: 2600 }) },
    refunds: { list: async () => ({ has_more: false, data: [] }) },
  };
  const { getRefundPreview } = await loadRefundModule(stripe);
  const preview = await getRefundPreview("cus_test", "sub_current");
  assert.equal(preview.eligible, false);
  assert.equal(preview.invoiceId, "in_target");
  assert.equal(preview.amount, 2600);
  assert.equal(invoiceId, "in_target");
  await assert.rejects(getRefundPreview("cus_other", "sub_current"), /does not belong/);
});

test("partial refunds and ambiguous invoice payments fail closed", async () => {
  const now = Math.floor(Date.now() / 1000);
  let payments = [{ payment: { payment_intent: "pi_initial" }, amount_paid: 2499 }];
  let refunds = [{ id: "re_partial", status: "succeeded", amount: 1000 }];
  const stripe = {
    subscriptions: { retrieve: async () => ({ customer: "cus_test", status: "active", items: { data: [] } }) },
    invoices: { list: () => ({ autoPagingToArray: async () => [{ id: "in_initial", status: "paid", billing_reason: "subscription_create", created: now,
      status_transitions: { paid_at: now }, parent: { subscription_details: { subscription: "sub_test" } }, amount_paid: 2499, currency: "usd" }] }) },
    invoicePayments: { list: async () => ({ has_more: false, data: payments }) },
    paymentIntents: { retrieve: async () => ({ customer: "cus_test", status: "succeeded", amount_received: 2499 }) },
    refunds: { list: async () => ({ has_more: false, data: refunds }) },
  };
  const { getRefundPreview } = await loadRefundModule(stripe);
  await assert.rejects(getRefundPreview("cus_test", "sub_test"), /partial or unusual/);
  refunds = [];
  payments = [payments[0], payments[0]];
  await assert.rejects(getRefundPreview("cus_test", "sub_test"), /unusual payment history/);
});

test("a renewal exception identifies the latest paid subscription payment, not the original charge", async () => {
  const now = Math.floor(Date.now() / 1000);
  const invoices = [
    { id: "in_first", status: "paid", billing_reason: "subscription_create", created: now - 366 * 86_400,
      status_transitions: { paid_at: now - 366 * 86_400 }, parent: { subscription_details: { subscription: "sub_test" } }, amount_paid: 2499, currency: "usd" },
    { id: "in_renewal", status: "paid", billing_reason: "subscription_cycle", created: now - 86_400,
      status_transitions: { paid_at: now - 86_400 }, parent: { subscription_details: { subscription: "sub_test" } }, amount_paid: 2700, currency: "usd" },
  ];
  const stripe = {
    subscriptions: { retrieve: async () => ({ customer: "cus_test", status: "active", items: { data: [] } }) },
    invoices: { list: () => ({ autoPagingToArray: async () => invoices }) },
    invoicePayments: { list: async () => ({ has_more: false, data: [{ payment: { payment_intent: "pi_renewal" }, amount_paid: 2700 }] }) },
    paymentIntents: { retrieve: async () => ({ customer: "cus_test", status: "succeeded", amount_received: 2700 }) },
    refunds: { list: async () => ({ has_more: false, data: [] }) },
  };
  const { getRefundPreview } = await loadRefundModule(stripe);
  const preview = await getRefundPreview("cus_test", "sub_test");
  assert.equal(preview.eligible, false);
  assert.equal(preview.invoiceId, "in_renewal");
  assert.equal(preview.paymentIntentId, "pi_renewal");
  assert.equal(preview.amount, 2700);
});

test("scheduled cancellation keeps Plus, reactivation clears it, and period-end deletion downgrades", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table billing_accounts(user_id uuid primary key, plan text, status text,
        stripe_customer_id text unique, stripe_subscription_id text, stripe_price_id text,
        current_period_start timestamptz, current_period_end timestamptz, cancel_at_period_end boolean,
        canceled_at timestamptz, source_event_id text, source_event_created_at timestamptz,
        last_payment_at timestamptz, updated_at timestamptz);
      create table billing_webhook_events(event_id text primary key, event_type text, livemode boolean,
        processing_status text default 'received', processed_at timestamptz, error_message text);
      insert into billing_accounts(user_id,plan,status,stripe_customer_id,stripe_subscription_id)
      values('${user}','plus','active','cus_test','sub_test');`);
    await db.exec(migration32);
    const apply = (eventId, status, cancel, observed) => db.query("select apply_billing_webhook($1,'customer.subscription.updated',false,now(),$2::jsonb,null)", [eventId, JSON.stringify({
      observed_at: observed, plan: status === "active" ? "plus" : "free", status,
      stripe_customer_id: "cus_test", stripe_subscription_id: "sub_test", cancel_at_period_end: cancel,
      current_period_end: "2027-01-01T00:00:00Z",
    })]);
    await apply("evt_cancel", "active", true, "2026-10-05T00:00:00Z");
    let row = (await db.query("select plan,cancel_at_period_end from billing_accounts")).rows[0];
    assert.deepEqual(row, { plan: "plus", cancel_at_period_end: true });
    await apply("evt_reactivate", "active", false, "2026-10-05T00:01:00Z");
    row = (await db.query("select plan,cancel_at_period_end from billing_accounts")).rows[0];
    assert.deepEqual(row, { plan: "plus", cancel_at_period_end: false });
    await apply("evt_end", "canceled", false, "2027-01-01T00:00:00Z");
    assert.equal((await db.query("select plan from billing_accounts")).rows[0].plan, "free");
  } finally { await db.close(); }
});

test("all server entitlement readers treat a refunded subscription as Free", async () => {
  const source = await readFile(new URL("../src/lib/entitlements.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  Function("exports", "require", compiled)(exports, (name) => {
    if (name === "server-only") return {};
    if (name === "@/lib/supabase/server" || name === "@/lib/supabase/service") return {};
    throw new Error(name);
  });
  const record = { status: "active", plan: "plus", grandfathered_plus: false,
    stripe_subscription_id: "sub_refunded", refunded_subscription_id: "sub_refunded",
    cancel_at_period_end: false, current_period_end: null };
  assert.equal(exports.tierForBillingRecord(record), "free");
  assert.equal(exports.tierForBillingRecord({ ...record, stripe_subscription_id: "sub_new" }), "plus");
  assert.equal(exports.tierForBillingRecord({ ...record, refunded_subscription_id: null,
    cancel_at_period_end: true, current_period_end: "2020-01-01T00:00:00Z" }), "free");
});
