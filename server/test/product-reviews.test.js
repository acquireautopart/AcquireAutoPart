const assert = require("node:assert/strict");
const { mock, test } = require("node:test");
const Order = require("../src/modules/customer/models/Order");
const Customer = require("../src/modules/customer/models/Customer");
const reviewService = require("../src/modules/customer/reviews/service");
const Review = require("../src/modules/customer/reviews/Review");
const Product = require("../src/modules/seller/models/Product");
const Seller = require("../src/modules/seller/models/Seller");
const sellerService = require("../src/modules/seller/service");
const categoryService = require("../src/modules/admin/categoryService");

function mockPublicProduct(product = {}) {
  const record = {
    _id: "product-id",
    seller: { _id: "seller-id", country: "US", adminStatus: "Approved" },
    status: "Active",
    stock: 5,
    ...product,
  };
  mock.method(Product, "findById", () => ({
    select() {
      return this;
    },
    populate() {
      return this;
    },
    lean: async () => record,
  }));
}

test("product review requires a valid delivered customer order", async () => {
  mockPublicProduct();
  mock.method(Order, "exists", async () => false);

  try {
    await assert.rejects(
      reviewService.createReview("customer-id", "product-id", "US", {
        rating: 5,
      }),
      (error) =>
        error.statusCode === 403 && /received this product/.test(error.message),
    );
  } finally {
    mock.restoreAll();
  }
});

test("verified buyers can save a rating and the updated real review summary is returned", async () => {
  mockPublicProduct();
  mock.method(Order, "exists", async (filter) => {
    assert.equal(filter.customer, "customer-id");
    assert.equal(filter["items.productId"], "product-id");
    return { _id: "delivered-order" };
  });
  mock.method(Review, "findOneAndUpdate", (filter, update, options) => {
    assert.deepEqual(filter, {
      product: "product-id",
      customer: "customer-id",
    });
    assert.deepEqual(update.$set, {
      rating: 5,
      title: "Great fit",
      comment: "Matched the seller-listed vehicle.",
    });
    assert.equal(options.upsert, true);
    return {
      lean: async () => ({
        _id: "review-id",
        rating: 5,
        title: "Great fit",
        comment: "Matched the seller-listed vehicle.",
        createdAt: new Date("2026-11-10T00:00:00.000Z"),
      }),
    };
  });
  mock.method(Review, "aggregate", async () => [
    { ratingAverage: 4.5, ratingCount: 2 },
  ]);
  mock.method(Customer, "findById", () => ({
    select() { return this; },
    lean: async () => ({ name: "Aarav Sharma" }),
  }));

  try {
    const result = await reviewService.createReview(
      "customer-id",
      "product-id",
      "US",
      {
        rating: 5,
        title: " Great fit ",
        comment: " Matched the seller-listed vehicle. ",
      },
    );
    assert.equal(result.ratingAverage, 4.5);
    assert.equal(result.ratingCount, 2);
    assert.equal(result.review.reviewer, "Aarav S.");
    assert.equal(result.review.verifiedPurchase, true);
  } finally {
    mock.restoreAll();
  }
});

test("product reviews reject ratings outside one to five stars", async () => {
  mockPublicProduct();
  mock.method(Order, "exists", async () => {
    throw new Error("Order lookup should not run for invalid ratings.");
  });

  try {
    await assert.rejects(
      reviewService.createReview("customer-id", "product-id", "US", {
        rating: 6,
      }),
      (error) =>
        error.statusCode === 400 && /rating from 1 to 5/.test(error.message),
    );
  } finally {
    mock.restoreAll();
  }
});

test("top-rated catalog returns only reviewed products with their real averages", async () => {
  mock.method(categoryService, "ensureInitialized", async () => {});
  mock.method(categoryService, "listCategories", async () => []);
  mock.method(Seller, "find", () => ({
    distinct: async () => ["seller-id"],
  }));
  mock.method(Product, "distinct", async () => []);
  mock.method(Product, "aggregate", async (pipeline) => {
    const lookup = pipeline.find((stage) => stage.$lookup);
    assert.equal(lookup.$lookup.from, Review.collection.name);
    return [
      {
        products: [
          {
            _id: "product-id",
            seller: "seller-id",
            sellerInfo: {
              country: "US",
              storeName: "Parts Store",
              settings: { currency: "USD", shippingDays: 2 },
            },
            name: "Brake Pad Set",
            ratingAverage: 4.75,
            ratingCount: 4,
          },
        ],
        totals: [{ count: 1 }],
      },
    ];
  });
  mock.method(Review, "aggregate", async () => [
    { _id: "product-id", ratingAverage: 4.75, ratingCount: 4 },
  ]);

  try {
    const result = await sellerService.publicCatalog({
      country: "US",
      sort: "top-rated",
      pageSize: 8,
    });
    assert.equal(result.total, 1);
    assert.equal(result.products[0].id, "product-id");
    assert.equal(result.products[0].ratingAverage, 4.75);
    assert.equal(result.products[0].ratingCount, 4);
    assert.equal(result.products[0].storeName, "Parts Store");
    assert.equal("sellerInfo" in result.products[0], false);
  } finally {
    mock.restoreAll();
  }
});
