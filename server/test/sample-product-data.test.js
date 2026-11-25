const assert = require("node:assert/strict");
const { test } = require("node:test");
const products = require("../data/sample-auto-parts-products.json");
const categories = require("../../categories.json");

test("sample auto-parts catalog has 132 valid four-wheel draft records", () => {
  assert.equal(products.length, 132);
  assert.equal(new Set(products.map((product) => product.sku)).size, 132);
  assert.equal(new Set(products.map((product) => product.category)).size, 11);

  for (const product of products) {
    const category = categories.find((entry) => entry.name === product.category);
    assert.ok(product.name);
    assert.ok(product.category);
    assert.ok(
      category?.subcategories.some(
        (subcategory) => subcategory.name === product.subcategory,
      ),
    );
    assert.ok(product.brand);
    assert.ok(Number.isFinite(product.price) && product.price > 0);
    assert.equal(product.status, "Draft");
    assert.ok(product.description.includes("Sample catalog listing"));
    assert.ok(product.images.length >= 1 && product.images.length <= 6);
    assert.ok(product.images.every((image) => /^https:\/\//.test(image)));
    assert.ok(product.fitments.length > 0);
    assert.equal(product.demoReviews, undefined);
  }
});
