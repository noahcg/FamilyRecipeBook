import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const dataUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
async function moduleUrl(path, replacements = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  });
  for (const [name, replacement] of Object.entries(replacements)) {
    outputText = outputText.replaceAll(JSON.stringify(name), JSON.stringify(dataUrl(replacement)));
  }
  return dataUrl(outputText);
}
const actions = await import(await moduleUrl("../src/lib/actions/admin-push.ts", {
  "@/lib/admin": 'export async function requireAdmin() { return { id: "admin-a" }; }',
  "@/lib/supabase/service": "export function createServiceClient() { return globalThis.__adminPushTest.client; }",
  "@/lib/push/vapid": 'export function configureWebPush() { return globalThis.__adminPushTest.configured; } export const hasVapidConfig = configureWebPush; export function getVapidPublicKey() { return "public-key"; }',
  "web-push": "export default { sendNotification(...args) { return globalThis.__adminPushTest.send(...args); } };",
}));
const { pushKeyMatches, urlBase64ToUint8Array } = await import(await moduleUrl("../src/lib/push/subscription.ts"));

const endpoint = "https://push.example.test/device-a";
const ownRow = { id: "row-a", user_id: "admin-a", endpoint, p256dh: "key", auth: "auth" };
function setup({ rows = [ownRow], failure, configured = true } = {}) {
  const state = {
    configured, queries: [], sends: [], rows: [...rows],
    async send(...args) {
      state.sends.push(args);
      if (failure) throw failure;
    },
    client: { from(table) {
      assert.equal(table, "admin_push_subscriptions");
      const query = { operation: "select", filters: [] };
      state.queries.push(query);
      const matches = (row) => query.filters.every(([key, value]) => row[key] === value);
      const builder = {
        select() { return builder; },
        delete() { query.operation = "delete"; return builder; },
        eq(key, value) { query.filters.push([key, value]); return builder; },
        async maybeSingle() { return { data: state.rows.find(matches) ?? null, error: null }; },
        then(resolve) {
          if (query.operation === "delete") state.rows = state.rows.filter((row) => !matches(row));
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return builder;
    } },
  };
  globalThis.__adminPushTest = state;
  return state;
}

test("test push targets only the current admin's saved endpoint", async () => {
  const state = setup({ rows: [ownRow, { ...ownRow, id: "row-b", endpoint: "other-device" }] });
  assert.equal((await actions.testAdminPush(endpoint)).success, true);
  assert.deepEqual(state.queries[0].filters, [["user_id", "admin-a"], ["endpoint", endpoint]]);
  assert.equal(state.sends.length, 1);
  assert.equal(state.sends[0][0].endpoint, endpoint);
  assert.equal(JSON.parse(state.sends[0][1]).url, "/app/admin");
});

test("missing or another admin's subscription cannot receive a test", async () => {
  for (const rows of [[], [{ ...ownRow, user_id: "admin-b" }]]) {
    const state = setup({ rows });
    const result = await actions.testAdminPush(endpoint);
    assert.equal(result.success, false);
    assert.match(result.error, /Reconnect/);
    assert.equal(state.sends.length, 0);
  }
});

test("expired subscription removes only the current admin's row and requests reconnection", async () => {
  const other = { ...ownRow, id: "row-b", user_id: "admin-b", endpoint: "other-device" };
  const state = setup({ rows: [ownRow, other], failure: { statusCode: 410 } });
  const result = await actions.testAdminPush(endpoint);
  assert.equal(result.success, false);
  assert.match(result.error, /expired.*Reconnect/);
  assert.deepEqual(state.queries[1].filters, [["id", "row-a"], ["user_id", "admin-a"]]);
  assert.deepEqual(state.rows, [other]);
});

test("incomplete VAPID configuration is reported even with a public key", async () => {
  const state = setup({ configured: false });
  const keyResult = await actions.getAdminPushPublicKey();
  assert.equal(keyResult.success, false);
  assert.match(keyResult.error, /not configured/);
  const testResult = await actions.testAdminPush(endpoint);
  assert.equal(testResult.success, false);
  assert.match(testResult.error, /not configured/);
  assert.equal(state.sends.length, 0);
});

test("subscription key comparison detects matching, rotated, and missing keys", () => {
  const publicKey = "-_8AAQ";
  const decoded = urlBase64ToUint8Array(publicKey);
  assert.deepEqual([...decoded], [251, 255, 0, 1]);
  assert.equal(pushKeyMatches(decoded.buffer, publicKey), true);
  assert.equal(pushKeyMatches(new Uint8Array([251, 255, 0, 2]).buffer, publicKey), false);
  assert.equal(pushKeyMatches(new Uint8Array([251]).buffer, publicKey), false);
  assert.equal(pushKeyMatches(null, publicKey), false);
});
