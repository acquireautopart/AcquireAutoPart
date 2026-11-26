const assert = require("node:assert/strict");
const { mock, test } = require("node:test");
const Category = require("../src/modules/admin/models/Category");
const Product = require("../src/modules/seller/models/Product");
const categoryService = require("../src/modules/admin/categoryService");
const productImport = require("../src/modules/seller/productImport");
const sellerService = require("../src/modules/seller/service");

function queryWithResult(result) {
  const query = {
    select() {
      return query;
    },
    lean: async () => result,
  };
  return query;
}

test("sellers can create and import products with categories outside the managed list", async () => {
  mock.method(Category, "bulkWrite", async () => ({}));
  mock.method(Product, "find", () => queryWithResult([]));
  mock.method(Category, "findOne", () => queryWithResult(null));
  mock.method(Category, "find", () => queryWithResult([]));
  let savedProduct;
  mock.method(Product, "create", async (document) => {
    savedProduct = document;
    return { ...document, _id: "product-id" };
  });

  try {
    const category = "Brake System";
    const subcategory = "Brake Pads";
    const product = await sellerService.createProduct("seller-id", {
      sku: "BRAKE-001",
      name: "Ceramic Brake Pad Set",
      category,
      subcategory,
      price: 124.99,
      images: ["https://images.example.com/brake-pads.jpg"],
    });

    assert.equal(savedProduct.category, category);
    assert.equal(savedProduct.subcategory, subcategory);
    assert.equal(product.category, category);

    const result = await productImport.validateProductImport("seller-id", {
      fileName: "products.json",
      body: Buffer.from(
        JSON.stringify([
          {
            sku: "BRAKE-002",
            name: "Ceramic Brake Pad Set",
            category,
            subcategory,
            price: 124.99,
            images: ["https://images.example.com/brake-pads.jpg"],
          },
        ]),
      ),
    });

    assert.deepEqual(result.issues, []);
    assert.equal(result.products[0].category, category);
  } finally {
    mock.restoreAll();
  }
});

test("managed categories stay canonical while accepting seller-defined subcategories", async () => {
  mock.method(Category, "findOne", () =>
    queryWithResult({
      name: "Brake System",
      subcategories: ["Brake Pads"],
    }),
  );

  try {
    assert.deepEqual(
      await categoryService.validateProductCategory(
        "brake system",
        "Performance Pads",
      ),
      {
        category: "Brake System",
        subcategory: "Performance Pads",
      },
    );
  } finally {
    mock.restoreAll();
  }
});
