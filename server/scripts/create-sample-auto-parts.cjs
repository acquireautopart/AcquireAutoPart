const fs = require("node:fs");
const path = require("node:path");

// The curated JSON file is the source of truth so rerunning this script never
// replaces the product photography, vehicle fitments, or sample feedback.
const outputPath = path.join(
  __dirname,
  "..",
  "data",
  "sample-auto-parts-products.json",
);
const products = JSON.parse(fs.readFileSync(outputPath, "utf8"));

if (!Array.isArray(products) || products.length < 100 || products.length > 200) {
  throw new Error("Expected between 100 and 200 sample auto-parts products.");
}
for (const product of products) {
  if (
    product.status !== "Draft" ||
    !product.fitments?.length ||
    !product.images?.length ||
    !product.category ||
    !product.subcategory
  ) {
    throw new Error(`Sample catalog record is incomplete: ${product.sku}`);
  }
}

fs.writeFileSync(outputPath, `${JSON.stringify(products, null, 2)}\n`);
console.log(`Saved ${products.length} draft sample products to ${outputPath}`);
