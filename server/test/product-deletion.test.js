const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { mock, test } = require("node:test");
const AuditLog = require("../src/modules/admin/models/AuditLog");
const adminService = require("../src/modules/admin/service");
const categoryService = require("../src/modules/admin/categoryService");
const Product = require("../src/modules/seller/models/Product");
const Seller = require("../src/modules/seller/models/Seller");
const sellerService = require("../src/modules/seller/service");

const productId = "507f1f77bcf86cd799439011";
const sellerId = new mongoose.Types.ObjectId("507f191e810c19729de860ea");

test("seller deletion marks only an owned product deleted and preserves its record", async () => {
  let filter;
  let update;
  mock.method(Product, "findOneAndUpdate", (...args) => {
    [filter, update] = args;
    return {
      lean: async () => ({
        _id: productId,
        status: "Archived",
        deletedAt: update.$set.deletedAt,
      }),
    };
  });

  try {
    const result = await sellerService.deleteProduct(sellerId, productId);
    assert.deepEqual(filter, {
      _id: productId,
      seller: sellerId,
      deletedAt: null,
    });
    assert.equal(update.$set.status, "Archived");
    assert.ok(update.$set.deletedAt instanceof Date);
    assert.equal(result.deletedAt, update.$set.deletedAt);
  } finally {
    mock.restoreAll();
  }
});

test("seller bulk deletion validates IDs and limits deletion to owned active records", async () => {
  let filter;
  let update;
  mock.method(Product, "updateMany", async (...args) => {
    [filter, update] = args;
    return { modifiedCount: 2 };
  });

  try {
    const result = await sellerService.deleteProducts(sellerId, [
      productId,
      productId,
      "507f1f77bcf86cd799439012",
    ]);
    assert.deepEqual(filter, {
      seller: sellerId,
      _id: {
        $in: [productId, "507f1f77bcf86cd799439012"],
      },
      deletedAt: null,
    });
    assert.equal(update.$set.status, "Archived");
    assert.ok(update.$set.deletedAt instanceof Date);
    assert.deepEqual(result, { deletedCount: 2 });
  } finally {
    mock.restoreAll();
  }
});

test("seller product list excludes soft-deleted products", async () => {
  let filter;
  mock.method(Product, "find", (query) => {
    filter = query;
    return {
      sort() {
        return this;
      },
      limit() {
        return this;
      },
      lean: async () => [],
    };
  });
  mock.method(Product, "countDocuments", async () => 0);

  try {
    const result = await sellerService.listProducts(sellerId);
    assert.equal(filter.seller, sellerId);
    assert.equal(filter.deletedAt, null);
    assert.deepEqual(result.products, []);
  } finally {
    mock.restoreAll();
  }
});

test("public catalog excludes soft-deleted listings and their facet values", async () => {
  mock.method(categoryService, "ensureInitialized", async () => {});
  mock.method(categoryService, "listCategories", async () => []);
  mock.method(Seller, "find", () => ({
    distinct: async () => [sellerId],
  }));
  mock.method(Product, "countDocuments", async (filter) => {
    assert.equal(filter.deletedAt, null);
    return 0;
  });
  mock.method(Product, "distinct", async (_field, filter) => {
    assert.equal(filter.deletedAt, null);
    return [];
  });
  mock.method(Product, "find", (filter) => {
    assert.equal(filter.deletedAt, null);
    return {
      select() {
        return this;
      },
      populate() {
        return this;
      },
      sort() {
        return this;
      },
      skip() {
        return this;
      },
      limit() {
        return this;
      },
      lean: async () => [],
    };
  });

  try {
    const result = await sellerService.publicCatalog({ country: "US" });
    assert.deepEqual(result.products, []);
    assert.equal(result.total, 0);
  } finally {
    mock.restoreAll();
  }
});

test("admin deletion is audited and keeps historical product records", async () => {
  let update;
  let audit;
  mock.method(Product, "findOneAndUpdate", (_filter, productUpdate) => {
    update = productUpdate;
    return {
      lean: async () => ({
        _id: productId,
        name: "Brake pads",
        deletedAt: productUpdate.$set.deletedAt,
      }),
    };
  });
  mock.method(AuditLog, "create", async (entry) => {
    audit = entry;
    return entry;
  });

  try {
    const result = await adminService.deleteProduct(
      { email: "admin@example.com" },
      productId,
    );
    assert.equal(update.$set.status, "Archived");
    assert.ok(update.$set.deletedAt instanceof Date);
    assert.equal(result.deletedAt, update.$set.deletedAt);
    assert.equal(audit.action, "listing.deleted");
    assert.match(audit.summary, /Brake pads was deleted/);
  } finally {
    mock.restoreAll();
  }
});

test("admin bulk deletion rejects invalid IDs without modifying products", async () => {
  mock.method(Product, "updateMany", async () => {
    assert.fail("Invalid IDs must not trigger a database update.");
  });

  try {
    await assert.rejects(
      adminService.deleteProducts(
        { email: "admin@example.com" },
        [productId, "invalid"],
      ),
      (error) =>
        error.statusCode === 400 &&
        /between 1 and 500 valid listings/.test(error.message),
    );
  } finally {
    mock.restoreAll();
  }
});

test("admin moderation cannot reactivate a soft-deleted listing", async () => {
  let filter;
  mock.method(Product, "findOneAndUpdate", async (query) => {
    filter = query;
    return null;
  });

  try {
    await assert.rejects(
      adminService.moderateProduct(
        { email: "admin@example.com" },
        productId,
        "Active",
      ),
      (error) =>
        error.statusCode === 404 && /Listing not found/.test(error.message),
    );
    assert.deepEqual(filter, { _id: productId, deletedAt: null });
  } finally {
    mock.restoreAll();
  }
});

test("admin product list excludes soft-deleted products", async () => {
  let filter;
  mock.method(Product, "find", (query) => {
    filter = query;
    return {
      populate() {
        return this;
      },
      sort() {
        return this;
      },
      limit() {
        return this;
      },
      lean: async () => [],
    };
  });

  try {
    const result = await adminService.listProducts();
    assert.deepEqual(filter, { deletedAt: null });
    assert.deepEqual(result.products, []);
  } finally {
    mock.restoreAll();
  }
});
