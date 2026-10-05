import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../src/lib/actions/billingRefund.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const userId = "00000000-0000-4000-8000-000000000001";
function load({ authorized = true, cancellationFails = false } = {}) {
  const calls = [];
  let cancellationScheduled = false;
  const stripe = { subscriptions: {
    retrieve: async () => ({ id: "sub_trusted", customer: "cus_trusted", status: "active", livemode: false,
      cancel_at_period_end: cancellationScheduled, items: { data: [] } }),
    update: async (_id, value) => { cancellationScheduled = value.cancel_at_period_end; calls.push(["stripe-update", value]); },
  } };
  const service = { from: (table) => ({ insert: async () => ({ error: null }), select: () => ({ eq: (_column, value) => ({ maybeSingle: async () => {
    calls.push([table, value]);
    return { data: table === "billing_accounts"
      ? { stripe_customer_id: "cus_trusted", stripe_subscription_id: "sub_trusted", grandfathered_plus: false }
      : null, error: null };
  } }) }) }), rpc: async (name, args) => { calls.push([name, args]); return { data: true, error: null }; } };
  const exports = {};
  Function("require", "exports", compiled)((name) => {
    if (name === "zod") return require("zod");
    if (name === "next/cache") return { revalidatePath() {} };
    if (name === "@/lib/admin") return { requireAdmin: async () => {
      if (!authorized) throw new Error("Not an administrator");
      return { id: "00000000-0000-4000-8000-000000000002" };
    } };
    if (name === "@/lib/supabase/service") return { createServiceClient: () => service };
    if (name === "@/lib/stripe") return { getStripe: () => stripe };
    if (name === "node:crypto") return require(name);
    if (name === "@/lib/billingRefund") return {
      getRefundPreview: async (...args) => {
        calls.push(["preview", ...args]);
        return { eligible: true, alreadyRefunded: false, subscriptionId: "sub_trusted", customerId: "cus_trusted",
          invoiceId: "in_trusted", paymentIntentId: "pi_trusted", amount: 2499, currency: "usd" };
      },
      refundAndCancel: async () => { calls.push(["stripe-refund"]); return { refund: { id: "re_trusted" }, cancellationError: cancellationFails ? "Stripe could not confirm subscription cancellation." : null }; },
    };
    throw new Error(name);
  }, exports);
  return { action: exports.refundPlusSubscription, renewalAction: exports.setPlusRenewal, calls };
}

test("non-admin cannot inspect billing or initiate a refund", async () => {
  const { action, calls } = load({ authorized: false });
  await assert.rejects(action({ userId, confirmation: "REFUND" }), /Not an administrator/);
  assert.deepEqual(calls, []);
});
test("refund uses server-side customer and subscription mapping, never browser Stripe IDs", async () => {
  const { action, calls } = load();
  const result = await action({ userId, confirmation: "REFUND", stripe_customer_id: "cus_attacker", stripe_subscription_id: "sub_attacker" });
  assert.equal(result.success, true, JSON.stringify({ result, calls }));
  assert.deepEqual(calls.find((call) => call[0] === "preview"), ["preview", "cus_trusted", "sub_trusted"]);
  assert.equal(calls.find((call) => call[0] === "complete_billing_refund")[1].target_customer_id, "cus_trusted");
});
test("typed confirmation is enforced by the server", async () => {
  const { action, calls } = load();
  assert.equal((await action({ userId, confirmation: "CANCEL" })).success, false);
  assert.deepEqual(calls, []);
});

test("a cancellation failure still commits the refund downgrade for immediate access removal", async () => {
  const { action, calls } = load({ cancellationFails: true });
  const result = await action({ userId, confirmation: "REFUND" });
  assert.equal(result.success, false);
  assert.match(result.error, /Plus access ended/);
  assert.equal(calls.some((call) => call[0] === "complete_billing_refund"), true);
});

test("normal cancellation and reactivation only update the linked subscription", async () => {
  const { renewalAction, calls } = load();
  assert.equal((await renewalAction({ userId, cancel: true })).success, true);
  assert.equal((await renewalAction({ userId, cancel: false })).success, true);
  assert.deepEqual(calls.filter((call) => call[0] === "stripe-update").map((call) => call[1].cancel_at_period_end), [true, false]);
  assert.equal(calls.some((call) => call[0] === "stripe-refund"), false);
});
