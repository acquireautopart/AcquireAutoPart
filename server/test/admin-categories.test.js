const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { mock, test } = require("node:test");
const AuditLog = require("../src/modules/admin/models/AuditLog");
const Category = require("../src/modules/admin/models/Category");
const categoryService = require("../src/modules/admin/categoryService");
const adminService = require("../src/modules/admin/service");
const Product = require("../src/modules/seller/models/Product");

const categoryId = "507f1f77bcf86cd799439011";

function makeCategory(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(categoryId),
    name: "Brake System",
    slug: "brake-system",
    subcategories: ["Brake Pads"],
    markupPercent: 5,
    active: true,
    deletedAt: null,
    save: async function save() {
      return this;
    },
    ...overrides,
  };
}

function mockCategorySetup(category) {
  mock.method(categoryService, "ensureInitialized", async () => {});
  mock.method(Category, "findOne", async () => category);
  mock.method(AuditLog, "create", async () => ({}));
}

test("admin category updates rename product references and refresh storefront prices", async () => {
  const category = makeCategory();
  mockCategorySetup(category);
  mock.method(Product, "updateMany", async (filter, update) => {
    assert.deepEqual(filter, { category: "Brake System" });
    assert.deepEqual(update, { $set: { category: "Braking" } });
    return { modifiedCount: 2 };
  });
  mock.method(categoryService, "updateCategoryPrices", async (name, markup) => {
    assert.equal(name, "Braking");
    assert.equal(markup, 8);
  });

  try {
    const updated = await adminService.updateCategory(
      { email: "admin@example.com" },
      categoryId,
      { name: "Braking", markupPercent: 8 },
    );
    assert.equal(updated.name, "Braking");
    assert.equal(updated.slug, "braking");
    assert.equal(category.markupPercent, 8);
  } finally {
    mock.restoreAll();
  }
});

test("admin cannot delete a category while products still use it", async () => {
  const category = makeCategory();
  mockCategorySetup(category);
  mock.method(Product, "countDocuments", async (filter) => {
    assert.deepEqual(filter, { category: "Brake System" });
    return 1;
  });

  try {
    await assert.rejects(
      adminService.deleteCategory(
        { email: "admin@example.com" },
        categoryId,
      ),
      (error) =>
        error.statusCode === 409 &&
        /used by products/.test(error.message),
    );
    assert.equal(category.deletedAt, null);
  } finally {
    mock.restoreAll();
  }
});

test("admin marks unused categories as deleted and inactive", async () => {
  const category = makeCategory();
  mockCategorySetup(category);
  mock.method(Product, "countDocuments", async () => 0);
  mock.method(categoryService, "updateCategoryPrices", async (name, markup) => {
    assert.equal(name, "Brake System");
    assert.equal(markup, 0);
  });

  try {
    const result = await adminService.deleteCategory(
      { email: "admin@example.com" },
      categoryId,
    );
    assert.equal(result.deleted, true);
    assert.equal(category.active, false);
    assert.ok(category.deletedAt instanceof Date);
  } finally {
    mock.restoreAll();
  }
});
