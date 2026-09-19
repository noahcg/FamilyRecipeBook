import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const dataUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
const source = await readFile(new URL("../src/lib/admin-error.ts", import.meta.url), "utf8");
let { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
});
for (const [name, replacement] of Object.entries({
  "server-only": dataUrl("export {};"),
  "next/server": dataUrl("export function after(callback) { globalThis.__adminErrorAfter.push(callback); }"),
  "@/lib/push/sendAdminPush": dataUrl("export function sendAdminPush(payload) { return globalThis.__adminErrorSend(payload); }"),
})) outputText = outputText.replaceAll(JSON.stringify(name), JSON.stringify(replacement));
const { notifyAdminOfError } = await import(dataUrl(outputText));

test("error delivery is registered with the response lifecycle and awaited", async (t) => {
  t.mock.method(console, "error", () => {});
  globalThis.__adminErrorAfter = [];
  let resolveDelivery;
  let sentPayload;
  globalThis.__adminErrorSend = (payload) => {
    sentPayload = payload;
    return new Promise((resolve) => { resolveDelivery = resolve; });
  };
  const error = new Error("Delivery lifecycle regression");
  notifyAdminOfError("test", error);
  notifyAdminOfError("test", error);
  assert.equal(globalThis.__adminErrorAfter.length, 1, "duplicate errors remain throttled");
  assert.equal(sentPayload, undefined, "delivery starts inside the registered callback");
  let finished = false;
  const work = globalThis.__adminErrorAfter[0]().then(() => { finished = true; });
  await Promise.resolve();
  assert.equal(finished, false, "the lifecycle callback must wait for delivery");
  assert.equal(sentPayload.url, "/app/admin");
  resolveDelivery();
  await work;
  assert.equal(finished, true);
});

test("push failures do not escape the response lifecycle callback", async (t) => {
  const logged = t.mock.method(console, "error", () => {});
  globalThis.__adminErrorAfter = [];
  globalThis.__adminErrorSend = async () => { throw new Error("Push unavailable"); };
  notifyAdminOfError("test-failure", new Error("Different server error"));
  await assert.doesNotReject(globalThis.__adminErrorAfter[0]);
  assert.equal(logged.mock.calls.at(-1).arguments[0], "[admin-error] push failed:");
});
