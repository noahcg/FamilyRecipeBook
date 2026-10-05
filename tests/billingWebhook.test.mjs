import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(new URL("../supabase/migrations/032_atomic_billing_webhooks.sql", import.meta.url), "utf8");
const user = "00000000-0000-0000-0000-000000000001";
async function setup() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table billing_accounts(user_id uuid primary key, plan text check(plan in ('free','plus')), status text,
      stripe_customer_id text unique, stripe_subscription_id text, stripe_price_id text,
      current_period_start timestamptz, current_period_end timestamptz, cancel_at_period_end boolean,
      canceled_at timestamptz, source_event_id text, source_event_created_at timestamptz,
      last_payment_at timestamptz, updated_at timestamptz);
    create table billing_webhook_events(event_id text primary key, event_type text, livemode boolean,
      processing_status text default 'received', processed_at timestamptz, error_message text);
    insert into billing_accounts(user_id,plan,stripe_customer_id) values('${user}','free','cus_test');`);
  await db.exec(migration);
  return db;
}
function snapshot(plan = "plus", observedAt = "2026-10-02T12:00:00Z") {
  return { plan, status: plan === "plus" ? "active" : "canceled", stripe_customer_id: "cus_test", stripe_subscription_id: "sub_test", cancel_at_period_end: false, observed_at: observedAt };
}
async function apply(db, id, payload, created = "2026-10-02T12:00:00Z", type = "customer.subscription.updated") {
  return db.query("select apply_billing_webhook($1,$2,false,$3,$4::jsonb,'cus_test') as applied", [id, type, created, payload ? JSON.stringify(payload) : null]);
}

test("failed billing writes rollback acknowledgement and retry can recover", async () => {
  const db = await setup();
  try {
    await assert.rejects(apply(db, "evt_retry", snapshot("invalid")));
    assert.equal((await db.query("select * from billing_webhook_events")).rows.length, 0);
    assert.equal((await apply(db, "evt_retry", snapshot())).rows[0].applied, true);
    assert.equal((await apply(db, "evt_retry", snapshot("free"))).rows[0].applied, false);
    assert.equal((await db.query("select plan from billing_accounts")).rows[0].plan, "plus");
  } finally { await db.close(); }
});
test("failed legacy records recover and older concurrent snapshots cannot overwrite newer state", async () => {
  const db = await setup();
  try {
    await db.exec("insert into billing_webhook_events(event_id, processing_status) values('evt_failed','failed')");
    await apply(db, "evt_failed", snapshot("free", "2026-10-02T12:01:00Z"));
    // An earlier retrieval completing later must not restore Plus, even when event timestamps tie.
    await apply(db, "evt_old", snapshot("plus"));
    assert.equal((await db.query("select plan from billing_accounts")).rows[0].plan, "free");
    assert.equal((await db.query("select processing_status from billing_webhook_events where event_id='evt_failed'")).rows[0].processing_status, "processed");
    // Late delivery can retrieve current provider state and reconcile it.
    await apply(db, "evt_late", snapshot("plus", "2026-10-02T12:02:00Z"), "2026-10-02T11:59:00Z");
    assert.equal((await db.query("select plan from billing_accounts")).rows[0].plan, "plus");
    await apply(db, "evt_new_subscription", { ...snapshot("plus", "2026-10-02T12:03:00Z"), stripe_subscription_id: "sub_new" }, "2026-10-02T12:03:00Z");
    await apply(db, "evt_old_subscription", snapshot("free", "2026-10-02T12:04:00Z"), "2026-10-02T12:02:00Z");
    assert.equal((await db.query("select stripe_subscription_id from billing_accounts")).rows[0].stripe_subscription_id, "sub_new");
  } finally { await db.close(); }
});
test("unknown customers fail closed and payments remain monotonic", async () => {
  const db = await setup();
  try {
    await assert.rejects(apply(db, "evt_unknown", { ...snapshot(), stripe_customer_id: "cus_other" }));
    await apply(db, "evt_paid", null, "2026-10-02T12:02:00Z", "invoice.paid");
    await apply(db, "evt_older_paid", null, "2026-10-02T12:00:00Z", "invoice.paid");
    await apply(db, "evt_failed", null, "2026-10-02T12:03:00Z", "invoice.payment_failed");
    const { rows } = await db.query("select last_payment_at from billing_accounts");
    assert.equal(new Date(rows[0].last_payment_at).toISOString(), "2026-10-02T12:02:00.000Z");
  } finally { await db.close(); }
});

// Execute the actual route with provider/database boundaries injected.
async function loadRoute({ status = null, readError = null, rpcError = null, stripeFailure = false, signatureFails = false, type = "customer.subscription.updated", fullRefund = true, cancelFailure = false, linkedSubscription = "sub_test" } = {}) {
  const ts = (await import("typescript")).default;
  const source = await readFile(new URL("../src/app/api/billing/webhook/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const calls = [];
  const event = { id: "evt_route", type, created: 1790942400, livemode: false, data: { object: { id: type === "charge.refunded" ? "ch_test" : "sub_test" } } };
  const stripe = {
    charges: { retrieve: async () => ({ id: "ch_test", customer: "cus_test", payment_intent: "pi_test", amount: 2499,
      amount_refunded: fullRefund ? 2499 : 1000, currency: "usd" }) },
    invoicePayments: { list: async () => ({ has_more: false, data: [{ invoice: "in_test" }] }) },
    invoices: { retrieve: async () => ({ customer: "cus_test", amount_paid: 2499, parent: { subscription_details: { subscription: "sub_test" } } }) },
    refunds: { list: async () => ({ has_more: false, data: [{ id: "re_test", amount: 2499, status: "succeeded" }] }) },
    webhooks: { constructEvent: () => { if (signatureFails) throw new Error("Bad signature"); return event; } },
    subscriptions: { cancel: async () => { if (cancelFailure) throw new Error("Cancel failed"); calls.push({ name: "stripe_cancel" }); }, retrieve: async () => {
      if (stripeFailure) throw new Error("Provider unavailable");
      return { id: "sub_test", status: "active", customer: "cus_test", items: { data: [] }, cancel_at_period_end: false };
    } },
  };
  const admin = {
    from: (table) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: table === "billing_accounts"
      ? { user_id: "user_test", stripe_subscription_id: linkedSubscription, grandfathered_plus: false }
      : status ? { processing_status: status } : null, error: readError }) }) }) }),
    rpc: async (name, args) => { calls.push({ name, args }); return { data: true, error: rpcError }; },
  };
  const exports = {};
  const require = (name) => {
    if (name === "next/server") return { NextResponse: class extends Response { static json(body) { return Response.json(body); } } };
    if (name === "@/lib/supabase/service") return { createServiceClient: () => admin };
    if (name === "@/lib/stripe") return { getStripe: () => stripe };
    throw new Error(`Unexpected import ${name}`);
  };
  Function("require", "exports", compiled)(require, exports);
  const oldSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = "test_secret";
  try {
    const response = await exports.POST(new Request("https://example.test/api/billing/webhook", { method: "POST", headers: { "stripe-signature": "test_signature" }, body: "{}" }));
    return { response, calls };
  } finally {
    if (oldSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = oldSecret;
  }
}
test("webhook route retries failed and received events and short-circuits processed duplicates", async () => {
  for (const status of [null, "failed", "received"]) {
    const result = await loadRoute({ status });
    assert.equal(result.response.status, 200);
    assert.equal(result.calls.length, 1);
    assert.equal(result.calls[0].args.subscription_data.plan, "plus");
  }
  const duplicate = await loadRoute({ status: "processed", stripeFailure: true });
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.calls.length, 0);
  assert.equal((await duplicate.response.json()).duplicate, true);
});
test("webhook route returns retryable failures for database and provider errors", async () => {
  for (const options of [{ readError: { message: "offline" } }, { rpcError: { message: "write failed" } }, { stripeFailure: true }]) {
    assert.equal((await loadRoute(options)).response.status, 500);
  }
});

test("webhook rejects an invalid Stripe signature before touching billing state", async () => {
  const result = await loadRoute({ signatureFails: true });
  assert.equal(result.response.status, 400);
  assert.equal(result.calls.length, 0);
});

test("signed full-refund webhook validates ownership, cancels, downgrades, and records event", async () => {
  const result = await loadRoute({ type: "charge.refunded" });
  assert.equal(result.response.status, 200);
  assert.equal(result.calls.some((call) => call.name === "stripe_cancel"), true);
  assert.equal(result.calls.find((call) => call.name === "complete_billing_refund").args.target_user_id, "user_test");
  assert.equal(result.calls.some((call) => call.name === "apply_billing_webhook"), true);
});
test("partial refund never downgrades and cancellation failure remains retryable", async () => {
  const partial = await loadRoute({ type: "charge.refunded", fullRefund: false });
  assert.equal(partial.response.status, 200);
  assert.equal(partial.calls.some((call) => call.name === "complete_billing_refund"), false);
  const failure = await loadRoute({ type: "charge.refunded", cancelFailure: true });
  assert.equal(failure.response.status, 500);
  assert.equal(failure.calls.some((call) => call.name === "complete_billing_refund"), true);
  assert.equal(failure.calls.some((call) => call.name === "apply_billing_webhook"), false);
});

test("refund webhook cannot mutate a different linked subscription", async () => {
  const result = await loadRoute({ type: "charge.refunded", linkedSubscription: "sub_other" });
  assert.equal(result.response.status, 200);
  assert.equal(result.calls.some((call) => call.name === "complete_billing_refund"), false);
  assert.equal(result.calls.some((call) => call.name === "stripe_cancel"), false);
});
