import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("React accepts large recipe photos as page objects instead of nested string arrays", () => {
  const result = execFileSync(process.execPath, ["--conditions=react-server", "-e", `
    const assert = require('node:assert/strict');
    const { decodeReply } = require('next/dist/compiled/react-server-dom-webpack/server.node');
    (async () => {
      const largePhoto = 'data:image/jpeg;base64,' + 'A'.repeat(1_120_000);
      await assert.rejects(Promise.resolve(decodeReply(JSON.stringify(['book', [largePhoto]]), {})), /Maximum array nesting exceeded/);
      for (const pages of [[{dataUrl: largePhoto}], Array.from({length: 4}, () => ({dataUrl: 'data:image/jpeg;base64,' + 'A'.repeat(955_000)}))]) {
        const args = [{bookId: 'book', pages}];
        assert.deepEqual(await decodeReply(JSON.stringify(args), {}), args);
      }
    })().catch(() => { process.exitCode = 1; });
  `], { encoding: "utf8" });
  assert.equal(result, "");
});
