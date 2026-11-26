const assert = require("node:assert/strict");
const { mock, test } = require("node:test");
const Category = require("../src/modules/admin/models/Category");
const categoryService = require("../src/modules/admin/categoryService");
const adminService = require("../src/modules/admin/service");
const Product = require("../src/modules/seller/models/Product");

test("admin category list includes live product counts, thumbnails and update dates", async () => {
  const updatedAt = new Date("2026-01-15T12:00:00.000Z");
  mock.method(categoryService, "listCategories", async (options) => {
    assert.deepEqual(options, { includeMarkup: true, includeImages: true });
    return [{
      id: "category-id",
      name: "Engine Parts",
      slug: "engine-parts",
      subcategories: ["Pistons"],
      markupPercent: 12,
      active: true,
    }];
  });
  mock.method(Product, "aggregate", async (pipeline) => {
    assert.deepEqual(pipeline[0], { $match: { deletedAt: null } });
    return [
      {
        _id: "Engine Parts",
        productCount: 4,
        image: "https://images.example.com/engine.jpg",
      },
    ];
  });
  mock.method(Category, "find", (filter) => {
    assert.deepEqual(filter, { deletedAt: null });
    return {
      select() {
        return this;
      },
      lean: async () => [{ slug: "engine-parts", updatedAt }],
    };
  });
  mock.method(Product, "countDocuments", async (filter) => {
    assert.deepEqual(filter, { deletedAt: null });
    return 4;
  });

  try {
    const result = await adminService.listCategories();
    assert.equal(result.totalProducts, 4);
    assert.deepEqual(result.categories[0], {
      id: "category-id",
      name: "Engine Parts",
      slug: "engine-parts",
      subcategories: ["Pistons"],
      markupPercent: 12,
      active: true,
      productCount: 4,
      image: "https://images.example.com/engine.jpg",
      updatedAt,
      subcategoryImages: [],
    });
  } finally {
    mock.restoreAll();
  }
});
