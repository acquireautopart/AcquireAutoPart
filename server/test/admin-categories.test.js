const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { mock, test } = require("node:test");
const AuditLog = require("../src/modules/admin/models/AuditLog");
const Category = require("../src/modules/admin/models/Category");
const categoryService = require("../src/modules/admin/categoryService");
const adminService = require("../src/modules/admin/service");
const Product = require("../src/modules/seller/models/Product");
const defaultCategories = require("../../categories.json");

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

test("default category initialization stores subcategory names as strings", async () => {
  let operations;
  mock.method(Category, "bulkWrite", async (updates) => {
    operations = updates;
    return {};
  });
  mock.method(Product, "find", () => ({
    select() {
      return this;
    },
    lean: async () => [],
  }));

  try {
    await categoryService.ensureInitialized();
    assert.deepEqual(
      operations.map((operation) => operation.updateOne.filter),
      defaultCategories.map((category) => ({
        $or: [{ slug: category.slug }, { name: category.name }],
      })),
    );
    const storedCategories = operations.map(
      (operation) => operation.updateOne.update.$setOnInsert,
    );
    assert.deepEqual(
      storedCategories.map((category) => category.subcategories),
      defaultCategories.map((category) =>
        category.subcategories.map((subcategory) => subcategory.name),
      ),
    );
  } finally {
    mock.restoreAll();
  }
});

test("default categories and subcategories use configured HTTPS images", () => {
  const imageUrls = defaultCategories.flatMap((category) => [
    category.image,
    ...category.subcategories.map((subcategory) =>
      typeof subcategory === "string" ? "" : subcategory.image,
    ),
  ]);

  assert.ok(imageUrls.length > 0);
  for (const imageUrl of imageUrls) {
    assert.match(imageUrl, /^https:\/\//);
    assert.doesNotMatch(imageUrl, /loremflickr\.com/i);
  }
});

test("category subcategory normalization accepts entries from the JSON category shape", () => {
  assert.deepEqual(
    categoryService.normalizeSubcategories([
      { id: "engine-1", name: "Pistons", image: "https://images.example.com/pistons.jpg" },
      "Cylinder Head",
    ]),
    ["Pistons", "Cylinder Head"],
  );
  assert.deepEqual(
    categoryService.normalizeSubcategories(
      `[\n { id: '78-1', name: 'Driver Airbags', image: 'https://images.example.com/driver.jpg' },\n { id: '78-2', name: 'Passenger Airbags', image: 'https://images.example.com/passenger.jpg' }\n]`,
    ),
    ["Driver Airbags", "Passenger Airbags"],
  );
  assert.deepEqual(
    categoryService.subcategoryNames([
      { name: "Driver Airbags", image: "https://images.example.com/driver.jpg" },
      "Passenger Airbags",
    ]),
    ["Driver Airbags", "Passenger Airbags"],
  );
});

test("category model hydrates object subcategories without casting errors", () => {
  const category = Category.hydrate({
    _id: new mongoose.Types.ObjectId(categoryId),
    name: "Airbag System",
    slug: "airbag-system",
    subcategories: [
      {
        id: "78-1",
        name: "Driver Airbags",
        slug: "driver-airbags",
        image: "https://images.example.com/driver-airbag.jpg",
      },
    ],
  });

  assert.equal(category.subcategories[0].name, "Driver Airbags");
  assert.equal(category.subcategories[0].image, "https://images.example.com/driver-airbag.jpg");
});

test("category reads recover names from stringified legacy subcategory arrays", () => {
  const category = Category.hydrate({
    _id: new mongoose.Types.ObjectId(categoryId),
    name: "Engine Parts",
    slug: "engine-parts",
    subcategories: [
      `[\n { id: '10-1', name: 'Air Intake Manifold', slug: 'air-intake-manifold', image: 'https://images.example.com/intake.jpg' },\n { id: '10-2', name: 'Air Filter Housing', slug: 'air-filter-housing', image: 'https://images.example.com/filter.jpg' }\n]`,
    ],
  });

  assert.deepEqual(categoryService.subcategoryNames(category.subcategories), [
    "Air Intake Manifold",
    "Air Filter Housing",
  ]);
});

test("category responses expose object-form subcategories as names", async () => {
  mock.method(Category, "bulkWrite", async () => ({}));
  mock.method(Product, "find", () => ({
    select() {
      return this;
    },
    lean: async () => [],
  }));
  mock.method(Category, "find", () => ({
    select() {
      return this;
    },
    sort() {
      return this;
    },
    lean: async () => [
      {
        _id: new mongoose.Types.ObjectId(categoryId),
        name: "Engine Parts",
        slug: "engine-parts",
        subcategories: [{ id: "pistons", name: "Pistons" }],
        markupPercent: 5,
        active: true,
      },
    ],
  }));

  try {
    const categories = await categoryService.listCategories({
      includeMarkup: true,
      includeImages: true,
    });
    assert.deepEqual(categories[0].subcategories, ["Pistons"]);
    assert.equal(
      categories[0].image,
      defaultCategories.find((category) => category.slug === "engine-parts").image,
    );
    assert.deepEqual(categories[0].subcategoryImages, [
      {
        name: "Pistons",
        image: defaultCategories
          .find((category) => category.slug === "engine-parts")
          .subcategories.find((subcategory) => subcategory.name === "Pistons")
          .image,
      },
    ]);
  } finally {
    mock.restoreAll();
  }
});

test("admin category responses prefer saved image URLs", async () => {
  const image = "https://images.example.com/custom-engine.jpg";
  mock.method(categoryService, "ensureInitialized", async () => {});
  mock.method(Category, "find", (filter) => {
    assert.deepEqual(filter, { deletedAt: null });
    return {
      select(projection) {
        assert.match(projection, /\bimage\b/);
        return this;
      },
      sort() {
        return this;
      },
      lean: async () => [
        {
          _id: new mongoose.Types.ObjectId(categoryId),
          name: "Engine Parts",
          slug: "engine-parts",
          image,
          subcategories: [],
          active: true,
        },
      ],
    };
  });

  try {
    const categories = await categoryService.listCategories({
      includeImages: true,
    });
    assert.equal(categories[0].image, image);
  } finally {
    mock.restoreAll();
  }
});

test("admin category updates rename product references and refresh storefront prices", async () => {
  const category = makeCategory();
  mockCategorySetup(category);
  mock.method(Product, "updateMany", async (filter, update) => {
    assert.ok(filter.category instanceof RegExp);
    assert.equal(filter.category.test("brake system"), true);
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
      {
        name: "Braking",
        image: "https://images.example.com/brakes.jpg",
        markupPercent: 8,
      },
    );
    assert.equal(updated.name, "Braking");
    assert.equal(updated.slug, "braking");
    assert.equal(updated.image, "https://images.example.com/brakes.jpg");
    assert.equal(category.image, "https://images.example.com/brakes.jpg");
    assert.equal(category.markupPercent, 8);
    await assert.rejects(
      adminService.updateCategory(
        { email: "admin@example.com" },
        categoryId,
        { image: "javascript:alert(1)" },
      ),
      (error) =>
        error.statusCode === 400 &&
        /HTTP or HTTPS category image URL/.test(error.message),
    );
  } finally {
    mock.restoreAll();
  }
});

test("creating a category applies its markup to existing matching products", async () => {
  const category = {
    _id: new mongoose.Types.ObjectId(categoryId),
    name: "Brake System",
    slug: "brake-system",
    subcategories: [],
    markupPercent: 12.5,
    active: true,
  };
  let refreshed;
  mock.method(categoryService, "ensureInitialized", async () => {});
  mock.method(Category, "findOne", async () => null);
  mock.method(Category, "create", async () => category);
  mock.method(categoryService, "updateCategoryPrices", async (name, markup) => {
    refreshed = { name, markup };
  });
  mock.method(AuditLog, "create", async () => ({}));
  mock.method(categoryService, "listCategories", async () => ({
    categories: [
      {
        id: category._id.toString(),
        name: category.name,
        markupPercent: category.markupPercent,
      },
    ],
  }));

  try {
    const result = await adminService.createCategory(
      { email: "admin@example.com" },
      {
        name: category.name,
        markupPercent: category.markupPercent,
      },
    );
    assert.equal(result.name, category.name);
    assert.deepEqual(refreshed, {
      name: category.name,
      markup: category.markupPercent,
    });
  } finally {
    mock.restoreAll();
  }
});

test("admin cannot delete a category while products still use it", async () => {
  const category = makeCategory();
  mockCategorySetup(category);
  mock.method(Product, "countDocuments", async (filter) => {
    assert.ok(filter.category instanceof RegExp);
    assert.equal(filter.category.test("Brake System"), true);
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
