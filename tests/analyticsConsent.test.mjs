import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/analytics/consent.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } });
const { parseChoice, CONSENT_LIFETIME, safePage, validMeasurementId, analyticsAllowed, setAnalyticsPermission } = await import(`data:text/javascript,${encodeURIComponent(outputText)}`);

test("preferences expire, reject malformed, future, and old versions", () => {
  const now = 1_000_000_000_000;
  const value = (choice, at = now, version = 2) => JSON.stringify({ choice, at, version });
  assert.equal(parseChoice(value("accepted"), now), "accepted");
  assert.equal(parseChoice(value("rejected"), now), "rejected");
  assert.equal(parseChoice(value("accepted", now, 1), now), null);
  assert.equal(parseChoice(value("rejected", now, 1), now), "rejected");
  for (const raw of [null, "{", value("accepted", now + 1), value("accepted", now - CONSENT_LIFETIME), value("accepted", now, 0), value("other")]) assert.equal(parseChoice(raw, now), null);
});

test("permission checks current persisted consent and blocks stale or withdrawn choices", () => {
  let saved = JSON.stringify({ choice: "accepted", at: Date.now(), version: 2 });
  globalThis.window = { localStorage: { getItem: () => saved } };
  try {
    setAnalyticsPermission("accepted");
    assert.equal(analyticsAllowed(), true);
    saved = JSON.stringify({ choice: "rejected", at: Date.now(), version: 2 });
    assert.equal(analyticsAllowed(), false);
    setAnalyticsPermission(null);
    saved = JSON.stringify({ choice: "accepted", at: Date.now(), version: 2 });
    assert.equal(analyticsAllowed(), false);
    setAnalyticsPermission("accepted", true);
    assert.equal(analyticsAllowed(), true);
    setAnalyticsPermission("rejected");
    assert.equal(analyticsAllowed(), false);
  } finally { delete globalThis.window; setAnalyticsPermission(null); }
});

test("only fixed public routes and valid measurement identifiers are accepted", () => {
  assert.equal(safePage("/guides/example"), "/guides/article");
  assert.equal(safePage("/pricing"), "/pricing");
  for (const path of ["/app/books/private", "/auth/callback", "/guides/a?token=secret", "/share/secret"]) assert.equal(safePage(path), null);
  for (const id of [undefined, "", "G-", "G-abc", "G-ABC?x=1"]) assert.equal(validMeasurementId(id), false);
  assert.equal(validMeasurementId("G-ABC123"), true);
});
