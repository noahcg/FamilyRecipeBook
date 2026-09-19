import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
for (const [label, data] of [["valid", { title: "Test", body: "Delivered" }], ["null", null], ["malformed", undefined]]) {
  test(`push always displays a visible notification for ${label} payload`, async () => {
    const listeners = new Map();
    const displayed = [];
    vm.runInNewContext(worker, { self: {
      addEventListener: (event, callback) => listeners.set(event, callback),
      registration: { showNotification: async (title, options) => { displayed.push({ title, options }); } },
    } });
    let completion;
    listeners.get("push")({ data: { json: () => { if (data === undefined) throw new Error("Bad JSON"); return data; } }, waitUntil: (promise) => { completion = promise; } });
    assert.ok(completion);
    await completion;
    assert.equal(displayed.length, 1);
    assert.equal(displayed[0].title, data?.title ?? "Home Cooked");
    assert.equal(displayed[0].options.data.url, "/app/admin");
  });
}
