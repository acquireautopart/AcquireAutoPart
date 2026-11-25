const assert = require("node:assert/strict");
const { test } = require("node:test");
const categoryService = require("../src/modules/admin/categoryService");
const { serializeOrder } = require("../src/modules/customer/shop/helpers");

test("category markup is applied to public product and variant prices", () => {
  const product = categoryService.applyStorefrontPrices(
    {
      price: 100,
      compareAtPrice: 125,
      storefrontPrice: 112.5,
      storefrontCompareAtPrice: 140.63,
      variants: [{ name: "Left", price: 50 }],
    },
    12.5,
  );

  assert.equal(product.price, 112.5);
  assert.equal(product.compareAtPrice, 140.63);
  assert.equal(product.variants[0].price, 56.25);
  assert.equal("storefrontPrice" in product, false);
  assert.equal("storefrontCompareAtPrice" in product, false);
});

test("customer order serialization hides seller base prices and markup values", () => {
  const order = serializeOrder({
    _id: { toString: () => "order-id" },
    code: "ORD-2026-ABCDE",
    items: [
      {
        productId: "product-id",
        name: "Brake pad set",
        price: 112.5,
        sellerPrice: 100,
        categoryMarkupAmount: 12.5,
        quantity: 1,
      },
    ],
    totals: {
      subtotal: 112.5,
      categoryMarkup: 12.5,
      total: 112.5,
    },
  });

  assert.equal(order.items[0].price, 112.5);
  assert.equal("sellerPrice" in order.items[0], false);
  assert.equal("categoryMarkupAmount" in order.items[0], false);
  assert.equal("categoryMarkup" in order.totals, false);
});
