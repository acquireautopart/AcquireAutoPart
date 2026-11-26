const assert = require("node:assert/strict");
const { mock, test } = require("node:test");
const categoryService = require("../src/modules/admin/categoryService");
const Category = require("../src/modules/admin/models/Category");
const Product = require("../src/modules/seller/models/Product");
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

test("current category markup overrides a stale cached storefront price", () => {
  const product = categoryService.applyStorefrontPrices(
    {
      price: 100,
      compareAtPrice: 125,
      storefrontPrice: 100,
      storefrontCompareAtPrice: 125,
    },
    12.5,
  );

  assert.equal(product.price, 112.5);
  assert.equal(product.compareAtPrice, 140.63);
});

test("zero storefront cache values do not hide valid product prices", () => {
  const product = categoryService.applyStorefrontPrices(
    {
      price: 100,
      compareAtPrice: 125,
      storefrontPrice: 0,
      storefrontCompareAtPrice: 0,
      variants: [],
    },
    12.5,
  );
  assert.equal(product.price, 112.5);
  assert.equal(product.compareAtPrice, 140.63);

  const freeProduct = categoryService.applyStorefrontPrices(
    { price: 0, storefrontPrice: 0, compareAtPrice: 0, storefrontCompareAtPrice: 0 },
    12.5,
  );
  assert.equal(freeProduct.price, 0);
  assert.equal(freeProduct.compareAtPrice, 0);
});

test("storefront initialization backfills stale zero prices from seller prices", async () => {
  let filter;
  let writes;
  mock.method(Category, "bulkWrite", async () => ({}));
  mock.method(Product, "find", (query) => {
    filter = query;
    return {
      select() {
        return this;
      },
      lean: async () => [
        {
          _id: "product-id",
          category: "Brakes",
          price: 100,
          compareAtPrice: 125,
        },
      ],
    };
  });
  mock.method(Category, "find", () => ({
    select() {
      return this;
    },
    lean: async () => [{ name: "Brakes", markupPercent: 12.5, active: true }],
  }));
  mock.method(Product, "bulkWrite", async (operations) => {
    writes = operations;
    return {};
  });

  try {
    await categoryService.ensureInitialized();
    assert.ok(
      filter.$or.some(
        (condition) => condition.storefrontPrice === 0 && condition.price.$gt === 0,
      ),
    );
    assert.equal(writes[0].updateOne.update.$set.storefrontPrice, 112.5);
    assert.equal(
      writes[0].updateOne.update.$set.storefrontCompareAtPrice,
      140.63,
    );
  } finally {
    mock.restoreAll();
  }
});

test("category markup refresh matches product categories without case sensitivity", async () => {
  let writes;
  mock.method(Category, "bulkWrite", async () => ({}));
  mock.method(Product, "find", (filter) => {
    if (filter.category instanceof RegExp) {
      assert.equal(filter.category.test("brake SYSTEM"), true);
      return {
        select() {
          return this;
        },
        lean: async () => [
          {
            _id: "product-id",
            category: "brake SYSTEM",
            price: 100,
            compareAtPrice: 125,
          },
        ],
      };
    }
    return {
      select() {
        return this;
      },
      lean: async () => [],
    };
  });
  mock.method(Product, "bulkWrite", async (operations) => {
    writes = operations;
    return {};
  });

  try {
    await categoryService.updateCategoryPrices("Brake System", 12.5);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].updateOne.update.$set.storefrontPrice, 112.5);
    assert.equal(
      writes[0].updateOne.update.$set.storefrontCompareAtPrice,
      140.63,
    );
  } finally {
    mock.restoreAll();
  }
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
