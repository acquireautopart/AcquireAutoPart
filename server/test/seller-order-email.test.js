const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSellerOrderEmail } = require("../src/modules/seller/orderEmail");

test("seller order email includes item quantity, totals, and payment status", () => {
  const email = buildSellerOrderEmail({
    seller: { email: "seller@example.com", storeName: "Parts Store" },
    order: {
      code: "ORD-2026-1234",
      currency: "USD",
      payment: { method: "Cash on delivery", paid: false },
    },
    items: [{ name: "Brake pad", price: 12.5, quantity: 2 }],
  });

  assert.deepEqual(email.to, ["seller@example.com"]);
  assert.equal(email.subject, "New AcquireAuto order ORD-2026-1234");
  assert.match(email.text, /Brake pad x2/);
  assert.match(email.text, /Items total: USD 25\.00/);
  assert.match(email.text, /Cash on delivery \(pending\)/);
});

test("seller order email escapes user-provided HTML", () => {
  const email = buildSellerOrderEmail({
    seller: { email: "seller@example.com", storeName: "<Parts & More>" },
    order: {
      code: "ORD-2026-1234",
      currency: "USD",
      payment: { method: "Wallet", paid: true },
    },
    items: [{ name: "<Brake pad>", price: 1, quantity: 1 }],
  });

  assert.match(email.html, /&lt;Parts &amp; More&gt;/);
  assert.match(email.html, /&lt;Brake pad&gt;/);
  assert.doesNotMatch(email.html, /<Brake pad>/);
});
