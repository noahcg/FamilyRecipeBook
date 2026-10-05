import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/app/api/billing/checkout/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });

async function checkout({ customer, failure, status = "canceled", saveFails = false }) {
  const calls = [];
  const billing = { stripe_customer_id: "cus_old", stripe_subscription_id: "sub_old", status };
  const admin = { from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: billing }) }) }),
    upsert: async (data) => { calls.push(["save", data]); return { error: saveFails ? new Error("save failed") : null }; },
  }) };
  const stripe = {
    customers: {
      retrieve: async () => { calls.push(["retrieve"]); if (failure) throw failure; return customer; },
      create: async (_, options) => { calls.push(["create", options]); return { id: "cus_new" }; },
    },
    checkout: { sessions: { create: async (params) => { calls.push(["checkout", params]); return { id: "cs_mock", url: "https://checkout.stripe.com/mock" }; } } },
  };
  const mocks = {
    "next/server": { NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) } },
    "@/lib/auth": { getUser: async () => ({ id: "user_mock", email: "mock@example.com" }) },
    "@/lib/supabase/service": { createServiceClient: () => admin },
    "@/lib/stripe": { getStripe: () => stripe, getBillingAppUrl: () => "https://example.com" },
  };
  const exports = {};
  new Function("require", "exports", "process", "console", outputText)(
    name => { assert.ok(mocks[name], name); return mocks[name]; }, exports,
    { env: { STRIPE_PLUS_ANNUAL_PRICE_ID: "price_mock" } }, { info() {}, error() {} },
  );
  return { response: await exports.POST(), calls };
}

for (const scenario of [{ failure: { code: "resource_missing" } }, { customer: { deleted: true } }]) {
  test(`checkout replaces a ${scenario.failure ? "missing" : "deleted"} customer before opening checkout`, async () => {
    const { response, calls } = await checkout(scenario);
    assert.equal(response.status, 200);
    assert.deepEqual(calls.map(call => call[0]), ["retrieve", "create", "save", "checkout"]);
    assert.equal(calls[1][1].idempotencyKey, "home-cooked-customer-user_mock-cus_old");
    assert.equal(calls[2][1].stripe_customer_id, "cus_new");
    assert.equal(calls[3][1].customer, "cus_new");
  });
}

test("checkout reuses an existing customer", async () => {
  const { response, calls } = await checkout({ customer: { id: "cus_old" } });
  assert.equal(response.status, 200);
  assert.deepEqual(calls.map(call => call[0]), ["retrieve", "checkout"]);
  assert.equal(calls[1][1].customer, "cus_old");
});

test("network or authorization failures do not create replacement customers", async () => {
  const { response, calls } = await checkout({ failure: { code: "api_connection_error" } });
  assert.equal(response.status, 500);
  assert.deepEqual(calls.map(call => call[0]), ["retrieve"]);
});

test("existing subscriptions block checkout before customer recovery", async () => {
  const { response, calls } = await checkout({ status: "active" });
  assert.equal(response.status, 409);
  assert.deepEqual(calls, []);
});

test("failed mapping saves prevent checkout", async () => {
  const { response, calls } = await checkout({ customer: { deleted: true }, saveFails: true });
  assert.equal(response.status, 500);
  assert.deepEqual(calls.map(call => call[0]), ["retrieve", "create", "save"]);
});
