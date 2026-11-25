const assert = require("node:assert/strict");
const { mock, test } = require("node:test");
const Product = require("../src/modules/seller/models/Product");
const sellerService = require("../src/modules/seller/service");
const categoryService = require("../src/modules/admin/categoryService");

test("seller products can be saved with five gallery images", async () => {
  const images = Array.from(
    { length: 5 },
    (_, index) => `https://images.example.com/product-${index + 1}.jpg`,
  );
  mock.method(
    categoryService,
    "validateProductCategory",
    async (category, subcategory) => ({ category, subcategory }),
  );
  mock.method(categoryService, "prepareProduct", async (product) => product);
  let savedProduct;
  mock.method(Product, "create", async (document) => {
    savedProduct = document;
    return { ...document, _id: "product-id" };
  });

  try {
    const product = await sellerService.createProduct("seller-id", {
      sku: "BRAKE-001",
      name: "Brake Pad Set",
      category: "Brake System",
      subcategory: "Brake Pads",
      price: 99.99,
      images,
    });

    assert.deepEqual(savedProduct.images, images);
    assert.deepEqual(product.images, images);
  } finally {
    mock.restoreAll();
  }
});

test("seller products reject zero images, more than six images, and invalid image URLs", async () => {
  const baseProduct = {
    sku: "BRAKE-001",
    name: "Brake Pad Set",
    category: "Brake System",
    subcategory: "Brake Pads",
    price: 99.99,
  };
  await assert.rejects(
    sellerService.createProduct("seller-id", { ...baseProduct, images: [] }),
    (error) =>
      error.statusCode === 400 &&
      /at least 1 product image/.test(error.message),
  );
  await assert.rejects(
    sellerService.createProduct("seller-id", {
      ...baseProduct,
      images: Array.from(
        { length: 7 },
        (_, index) => `https://images.example.com/${index}.jpg`,
      ),
    }),
    (error) =>
      error.statusCode === 400 && /between 1 and 6/.test(error.message),
  );
  await assert.rejects(
    sellerService.createProduct("seller-id", {
      ...baseProduct,
      images: ["javascript:alert(1)"],
    }),
    (error) => error.statusCode === 400 && /HTTP or HTTPS/.test(error.message),
  );
});
