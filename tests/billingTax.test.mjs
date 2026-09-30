import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const routePath = new URL("../src/app/api/billing/checkout/route.ts", import.meta.url);

function property(object, name) {
  return object.properties.find((entry) =>
    ts.isPropertyAssignment(entry) &&
    ((ts.isIdentifier(entry.name) && entry.name.text === name) ||
      (ts.isStringLiteral(entry.name) && entry.name.text === name))
  );
}

function objectProperty(object, name) {
  const entry = property(object, name);
  assert.ok(entry, `Expected ${name} in the Checkout Session parameters.`);
  assert.ok(ts.isObjectLiteralExpression(entry.initializer), `Expected ${name} to be an object.`);
  return entry.initializer;
}

test("paid Checkout subscriptions enable Stripe Tax and retain the configured annual Price", async () => {
  const source = await readFile(routePath, "utf8");
  const file = ts.createSourceFile(routePath.pathname, source, ts.ScriptTarget.Latest, true);
  let sessionParameters;

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "create" &&
      node.arguments.length === 1 &&
      ts.isObjectLiteralExpression(node.arguments[0]) &&
      node.getText(file).startsWith("stripe.checkout.sessions.create(")
    ) {
      sessionParameters = node.arguments[0];
    }
    ts.forEachChild(node, visit);
  }

  visit(file);
  assert.ok(sessionParameters, "Expected Stripe Checkout Session creation.");

  const mode = property(sessionParameters, "mode");
  assert.ok(mode && ts.isStringLiteral(mode.initializer));
  assert.equal(mode.initializer.text, "subscription");

  const automaticTax = objectProperty(sessionParameters, "automatic_tax");
  const enabled = property(automaticTax, "enabled");
  assert.ok(enabled && enabled.initializer.kind === ts.SyntaxKind.TrueKeyword);

  const billingAddressCollection = property(sessionParameters, "billing_address_collection");
  assert.ok(billingAddressCollection && ts.isStringLiteral(billingAddressCollection.initializer));
  assert.equal(billingAddressCollection.initializer.text, "required");

  const customerUpdate = objectProperty(sessionParameters, "customer_update");
  const address = property(customerUpdate, "address");
  assert.ok(address && ts.isStringLiteral(address.initializer));
  assert.equal(address.initializer.text, "auto");

  const lineItems = property(sessionParameters, "line_items");
  assert.ok(lineItems && ts.isArrayLiteralExpression(lineItems.initializer));
  const lineItem = lineItems.initializer.elements[0];
  assert.ok(lineItem && ts.isObjectLiteralExpression(lineItem));
  const price = lineItem.properties.find(
    (entry) => ts.isShorthandPropertyAssignment(entry) && entry.name.text === "price"
  );
  assert.ok(price, "Expected the existing configured price variable in line_items.");
});
