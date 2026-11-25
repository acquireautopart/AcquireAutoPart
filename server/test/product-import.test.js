const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test, mock } = require("node:test");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
const Product = require("../src/modules/seller/models/Product");
const productImport = require("../src/modules/seller/productImport");
const categoryService = require("../src/modules/admin/categoryService");

const productRow = {
  sku: "BRAKE-001",
  name: "Ceramic Brake Pad Set",
  category: "Brake System",
  subcategory: "Brake Pads",
  price: 124.99,
  images: [
    "https://images.example.com/brake-front.jpg",
    "https://images.example.com/brake-rear.jpg",
  ],
  brand: "Example",
  fitment: "Example Sedan 2020-2024",
  description: "Test listing",
  compareAtPrice: 149.99,
  stock: 25,
  lowStockThreshold: 5,
  status: "Draft",
};

function mockExistingProducts(products = []) {
  mock.method(Product, "find", () => {
    const query = {
      select: () => query,
      session: () => query,
      lean: async () => products,
    };
    return query;
  });
}

function mockCategoryService() {
  mock.method(categoryService, "validateProductCategories", async () => []);
  mock.method(categoryService, "prepareProducts", async (products) => products);
}

function jsonFile(rows) {
  return {
    fileName: "products.json",
    body: Buffer.from(JSON.stringify(rows)),
  };
}

test("JSON product import rejects misspelled fields and invalid image counts", async () => {
  mockExistingProducts();
  mockCategoryService();
  const result = await productImport.validateProductImport("seller-id", {
    ...jsonFile([
      { ...productRow, slu: productRow.sku, sku: undefined, images: [] },
    ]),
  });
  assert.ok(result.issues.some((issue) => issue.field === "slu"));
  assert.ok(result.issues.some((issue) => issue.field === "sku"));
  assert.ok(result.issues.some((issue) => issue.field === "images"));
  mock.restoreAll();
});

test("product import detects duplicate SKUs in the uploaded file and catalogue", async () => {
  mockExistingProducts([{ sku: "BRAKE-001" }]);
  mockCategoryService();
  const result = await productImport.validateProductImport(
    "seller-id",
    jsonFile([productRow, { ...productRow, name: "Another product" }]),
  );
  assert.ok(
    result.issues.some((issue) => issue.message.includes("already exists")),
  );
  assert.ok(
    result.issues.some((issue) => issue.message.includes("duplicates row")),
  );
  mock.restoreAll();
});

test("CSV import requires exact field names and enforces seven images", async () => {
  mockExistingProducts();
  mockCategoryService();
  const headers = Object.keys(productRow);
  const csvRow = headers
    .map((header) => {
      const value =
        header === "images"
          ? Array(8).fill("https://images.example.com/a.jpg").join("|")
          : productRow[header];
      return `"${String(value).replaceAll('"', '""')}"`;
    })
    .join(",");
  const file = {
    fileName: "products.csv",
    body: Buffer.from(`${headers.join(",")}\n${csvRow}\n`),
  };
  const result = await productImport.validateProductImport("seller-id", file);
  assert.ok(result.issues.some((issue) => issue.field === "images"));
  mock.restoreAll();
});

test("JSON product variants are validated using the model field names", async () => {
  mockExistingProducts();
  mockCategoryService();
  const result = await productImport.validateProductImport(
    "seller-id",
    jsonFile([
      {
        ...productRow,
        stock: 99,
        variants: [
          { name: "Left", sku: "BRAKE-L", price: 49.99, stock: 3 },
          { name: "Right", sku: "BRAKE-R", prcie: 49.99, stock: 4 },
        ],
      },
    ]),
  );
  assert.ok(result.issues.some((issue) => issue.field === "variants[2].prcie"));
  assert.equal(result.products[0].stock, 7);
  mock.restoreAll();
});

test("XLSX product import accepts the documented template fields", async () => {
  mockExistingProducts();
  mockCategoryService();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");
  const headers = Object.keys(productRow);
  sheet.addRow(headers);
  sheet.addRow(
    headers.map((header) =>
      header === "images" ? productRow.images.join("|") : productRow[header],
    ),
  );
  const result = await productImport.validateProductImport("seller-id", {
    fileName: "products.xlsx",
    body: Buffer.from(await workbook.xlsx.writeBuffer()),
  });
  assert.equal(result.issues.length, 0);
  assert.equal(result.products[0].images.length, 2);
  mock.restoreAll();
});

test("product batch is inserted in a transaction only after all rows validate", async () => {
  mockExistingProducts();
  mockCategoryService();
  const inserted = [];
  mock.method(Product, "insertMany", async (documents, options) => {
    inserted.push({ documents, options });
    return documents;
  });
  const session = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };
  mock.method(mongoose, "startSession", async () => session);

  const result = await productImport.importProducts(
    "seller-id",
    jsonFile([productRow, { ...productRow, sku: "BRAKE-002" }]),
  );
  assert.equal(result.importedCount, 2);
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].documents[0].seller, "seller-id");
  assert.equal(inserted[0].options.session, session);
  mock.restoreAll();
});

test("an invalid product rejects the batch without calling insertMany", async () => {
  mockExistingProducts();
  mockCategoryService();
  const insertMany = mock.method(Product, "insertMany", async () => {
    throw new Error("insertMany must not run for invalid rows");
  });
  const session = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };
  mock.method(mongoose, "startSession", async () => session);

  await assert.rejects(
    productImport.importProducts(
      "seller-id",
      jsonFile([productRow, { ...productRow, sku: "BRAKE-002", images: [] }]),
    ),
    (error) =>
      error instanceof productImport.ProductImportValidationError &&
      error.issues.some((issue) => issue.field === "images"),
  );
  assert.equal(insertMany.mock.callCount(), 0);
  mock.restoreAll();
});

test("the provided 132-product JSON file passes import validation", async () => {
  mockExistingProducts();
  mockCategoryService();
  const filePath = path.join(
    __dirname,
    "..",
    "data",
    "sample-auto-parts-products.json",
  );
  const result = await productImport.validateProductImport("seller-id", {
    fileName: "sample-auto-parts-products.json",
    body: fs.readFileSync(filePath),
  });
  assert.equal(result.products.length, 132);
  assert.deepEqual(result.issues, []);
  mock.restoreAll();
});

test("downloadable CSV and JSON templates match the import contract", async () => {
  mockExistingProducts();
  const templateDirectory = path.join(
    __dirname,
    "..",
    "..",
    "frontends",
    "seller",
    "public",
    "templates",
  );
  mockCategoryService();
  const csvResult = await productImport.validateProductImport("seller-id", {
    fileName: "seller-products-template.csv",
    body: fs.readFileSync(
      path.join(templateDirectory, "seller-products-template.csv"),
    ),
  });
  const jsonResult = await productImport.validateProductImport("seller-id", {
    fileName: "seller-products-template.json",
    body: fs.readFileSync(
      path.join(templateDirectory, "seller-products-template.json"),
    ),
  });
  assert.deepEqual(csvResult.issues, []);
  assert.deepEqual(jsonResult.issues, []);
  mock.restoreAll();
});
