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
async function loadRoute({ status = null, readError = null, rpcError = null, stripeFailure = false } = {}) {
  const ts = (await import("typescript")).default;
  const source = await readFile(new URL("../src/app/api/billing/webhook/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const calls = [];
  const event = { id: "evt_route", type: "customer.subscription.updated", created: 1790942400, livemode: false, data: { object: { id: "sub_test" } } };
  const stripe = {
    webhooks: { constructEvent: () => event },
    subscriptions: { retrieve: async () => {
      if (stripeFailure) throw new Error("Provider unavailable");
      return { id: "sub_test", status: "active", customer: "cus_test", items: { data: [] }, cancel_at_period_end: false };
    } },
  };
  const admin = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: status ? { processing_status: status } : null, error: readError }) }) }) }),
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
