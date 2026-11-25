const { Readable } = require("node:stream");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
const HttpError = require("../../utils/HttpError");
const Product = require("./models/Product");
const categoryService = require("../admin/categoryService");

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 500;
const MAX_IMAGES = 6;
const productFields = new Set([
  "sku",
  "partNumber",
  "name",
  "category",
  "subcategory",
  "price",
  "images",
  "brand",
  "fitment",
  "fitments",
  "condition",
  "warranty",
  "description",
  "compareAtPrice",
  "stock",
  "lowStockThreshold",
  "status",
  "variants",
]);
const fieldsByHeader = new Map(
  [...productFields].map((field) => [field.toLowerCase(), field]),
);
const allowedStatuses = new Set(["Draft", "Active", "Archived"]);

class ProductImportValidationError extends Error {
  constructor(issues) {
    super("Fix every row error before importing. No products were saved.");
    this.name = "ProductImportValidationError";
    this.issues = issues;
  }
}

function getFileExtension(fileName) {
  return String(fileName || "")
    .split(".")
    .pop()
    .toLowerCase();
}

function splitImages(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;
  return value
    .split(/[|\n\r]+/)
    .map((image) => image.trim())
    .filter(Boolean);
}

function spreadsheetCellValue(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text || "").join("");
    }
    return value.text ?? value.result ?? value.hyperlink ?? value;
  }
  return value;
}

function normalizeHeader(value) {
  return String(spreadsheetCellValue(value) || "")
    .trim()
    .toLowerCase();
}

async function parseSpreadsheet(buffer, extension) {
  const workbook = new ExcelJS.Workbook();
  if (extension === "csv") {
    await workbook.csv.read(Readable.from([buffer]));
  } else {
    await workbook.xlsx.load(buffer);
  }
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 1) {
    throw new HttpError(400, "The spreadsheet is empty.");
  }

  const headers = [];
  for (let column = 1; column <= worksheet.columnCount; column += 1) {
    headers.push(normalizeHeader(worksheet.getRow(1).getCell(column).value));
  }

  const rows = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = headers.map((_, index) =>
      spreadsheetCellValue(row.getCell(index + 1).value),
    );
    if (values.every((value) => value === "" || value === null)) continue;
    rows.push({
      rowNumber,
      values,
      headers,
    });
    if (rows.length > MAX_ROWS) {
      throw new HttpError(400, `Import up to ${MAX_ROWS} products at a time.`);
    }
  }
  return rows;
}

async function parseImportFile(file) {
  if (!Buffer.isBuffer(file?.body) || file.body.length === 0) {
    throw new HttpError(400, "Choose a non-empty CSV, XLSX, or JSON file.");
  }
  if (file.body.length > MAX_FILE_BYTES) {
    throw new HttpError(
      413,
      "Product import files must be no larger than 5 MB.",
    );
  }

  const extension = getFileExtension(file.fileName);
  if (extension === "json") {
    let rows;
    try {
      rows = JSON.parse(file.body.toString("utf8"));
    } catch {
      throw new HttpError(400, "The JSON file is not valid JSON.");
    }
    if (!Array.isArray(rows)) {
      throw new HttpError(
        400,
        "The JSON file must contain an array of products.",
      );
    }
    return rows.map((value, index) => ({
      rowNumber: index + 1,
      value,
      headers: null,
    }));
  }
  if (!["csv", "xlsx"].includes(extension)) {
    throw new HttpError(400, "Upload a .csv, .xlsx, or .json product file.");
  }
  try {
    return await parseSpreadsheet(file.body, extension);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      400,
      `Could not read the ${extension.toUpperCase()} file. Check that it is a valid, unencrypted file.`,
    );
  }
}

function addIssue(issues, row, field, message) {
  issues.push({ row, field, message });
}

function validateString(value, { row, field, required, maxLength, issues }) {
  if (value === undefined || value === null || value === "") {
    if (required) addIssue(issues, row, field, `${field} is required.`);
    return "";
  }
  if (typeof value !== "string" && typeof value !== "number") {
    addIssue(issues, row, field, `${field} must be text.`);
    return "";
  }
  const result = String(value).trim();
  if (!result && required)
    addIssue(issues, row, field, `${field} is required.`);
  else if (result.length > maxLength) {
    addIssue(
      issues,
      row,
      field,
      `${field} must be ${maxLength} characters or fewer.`,
    );
  }
  return result;
}

function validateNumber(value, { row, field, required, integer, issues }) {
  if (value === undefined || value === null || value === "") {
    if (required) addIssue(issues, row, field, `${field} is required.`);
    return undefined;
  }
  const number =
    typeof value === "number" ? value : Number(String(value).trim());
  if (
    !Number.isFinite(number) ||
    number < 0 ||
    (integer && !Number.isInteger(number))
  ) {
    addIssue(
      issues,
      row,
      field,
      integer
        ? `${field} must be a non-negative whole number.`
        : `${field} must be a non-negative number.`,
    );
    return undefined;
  }
  return number;
}

function validateVariants(value, rowNumber, issues) {
  if (value === undefined || value === null || value === "") return [];
  let variants = value;
  if (typeof variants === "string") {
    try {
      variants = JSON.parse(variants);
    } catch {
      addIssue(
        issues,
        rowNumber,
        "variants",
        "variants must be a valid JSON array.",
      );
      return [];
    }
  }
  if (!Array.isArray(variants) || variants.length > 50) {
    addIssue(
      issues,
      rowNumber,
      "variants",
      "variants must be an array with up to 50 entries.",
    );
    return [];
  }

  const allowedVariantFields = new Set(["name", "sku", "price", "stock"]);
  return variants.map((variant, index) => {
    const field = `variants[${index + 1}]`;
    if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
      addIssue(issues, rowNumber, field, "Each variant must be an object.");
      return null;
    }
    for (const key of Object.keys(variant)) {
      if (!allowedVariantFields.has(key)) {
        addIssue(
          issues,
          rowNumber,
          `${field}.${key}`,
          "Unknown variant field.",
        );
      }
    }
    const name = validateString(variant.name, {
      row: rowNumber,
      field: `${field}.name`,
      required: true,
      maxLength: 80,
      issues,
    });
    const sku = validateString(variant.sku, {
      row: rowNumber,
      field: `${field}.sku`,
      maxLength: 64,
      issues,
    });
    const price = validateNumber(variant.price, {
      row: rowNumber,
      field: `${field}.price`,
      required: true,
      issues,
    });
    const stock =
      variant.stock === undefined || variant.stock === ""
        ? 0
        : validateNumber(variant.stock, {
            row: rowNumber,
            field: `${field}.stock`,
            integer: true,
            issues,
          });
    return { name, sku, price, stock };
  });
}

function rowToProduct(row, issues) {
  let source = row.value;
  if (row.headers) {
    source = {};
    const seenHeaders = new Set();
    row.headers.forEach((header, index) => {
      if (!header) {
        if (row.values[index] !== "" && row.values[index] !== null) {
          addIssue(
            issues,
            1,
            `column ${index + 1}`,
            "Every populated column needs a header.",
          );
        }
        return;
      }
      const field = fieldsByHeader.get(header);
      if (!field) {
        addIssue(
          issues,
          1,
          header,
          `Unknown column "${header}". Use the template field names.`,
        );
        return;
      }
      if (seenHeaders.has(field)) {
        addIssue(issues, 1, field, `The "${field}" column is repeated.`);
        return;
      }
      seenHeaders.add(field);
      source[field] = row.values[index];
    });
  }

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    addIssue(
      issues,
      row.rowNumber,
      "row",
      "Each product row must be an object.",
    );
    return null;
  }

  for (const key of Object.keys(source)) {
    if (!productFields.has(key)) {
      addIssue(
        issues,
        row.rowNumber,
        key,
        `Unknown field "${key}". Check spelling and use the exact template field names.`,
      );
    }
  }

  const output = {};
  output.sku = validateString(source.sku, {
    row: row.rowNumber,
    field: "sku",
    required: true,
    maxLength: 64,
    issues,
  });
  output.subcategory = validateString(source.subcategory, {
    row: row.rowNumber,
    field: "subcategory",
    maxLength: 80,
    issues,
  });
  output.partNumber = validateString(source.partNumber, {
    row: row.rowNumber,
    field: "partNumber",
    maxLength: 80,
    issues,
  }).toUpperCase();
  output.name = validateString(source.name, {
    row: row.rowNumber,
    field: "name",
    required: true,
    maxLength: 200,
    issues,
  });
  output.category = validateString(source.category, {
    row: row.rowNumber,
    field: "category",
    required: true,
    maxLength: 80,
    issues,
  });
  output.price = validateNumber(source.price, {
    row: row.rowNumber,
    field: "price",
    required: true,
    issues,
  });

  const imageValues = splitImages(source.images);
  if (!Array.isArray(imageValues)) {
    addIssue(
      issues,
      row.rowNumber,
      "images",
      "images must be an array or URLs separated by |.",
    );
    output.images = [];
  } else {
    output.images = [];
    for (const [imageIndex, image] of imageValues.entries()) {
      if (typeof image !== "string" || !image.trim()) {
        addIssue(
          issues,
          row.rowNumber,
          "images",
          `Image ${imageIndex + 1} must be a non-empty URL.`,
        );
        continue;
      }
      output.images.push(image.trim());
    }
    if (output.images.length < 1 || output.images.length > MAX_IMAGES) {
      addIssue(
        issues,
        row.rowNumber,
        "images",
        `Add between 1 and ${MAX_IMAGES} image URLs for each product.`,
      );
    }
    for (const image of output.images) {
      try {
        const url = new URL(image);
        if (
          !["http:", "https:"].includes(url.protocol) ||
          image.length > 1000
        ) {
          throw new Error("invalid image URL");
        }
      } catch {
        addIssue(
          issues,
          row.rowNumber,
          "images",
          `Invalid image URL: ${image}`,
        );
      }
    }
  }

  output.brand = validateString(source.brand, {
    row: row.rowNumber,
    field: "brand",
    maxLength: 80,
    issues,
  });
  output.fitment = validateString(source.fitment, {
    row: row.rowNumber,
    field: "fitment",
    maxLength: 200,
    issues,
  });
  let structuredFitments = source.fitments || [];
  if (typeof structuredFitments === "string" && structuredFitments.trim()) {
    try { structuredFitments = JSON.parse(structuredFitments); } catch { structuredFitments = null; }
  }
  if (!Array.isArray(structuredFitments) || structuredFitments.length > 25) {
    addIssue(issues, row.rowNumber, "fitments", "fitments must be a JSON array with at most 25 vehicle entries.");
    output.fitments = [];
  } else {
    output.fitments = structuredFitments.map((fitment, index) => {
      const field = `fitments[${index}]`;
      if (!fitment || typeof fitment !== "object" || Array.isArray(fitment)) {
        addIssue(issues, row.rowNumber, "fitments", `${field} must be an object.`);
        return null;
      }
      const make = validateString(fitment.make, { row: row.rowNumber, field: `${field}.make`, required: true, maxLength: 80, issues });
      const model = validateString(fitment.model, { row: row.rowNumber, field: `${field}.model`, required: true, maxLength: 100, issues });
      const yearFrom = fitment.yearFrom === undefined || fitment.yearFrom === "" ? null : validateNumber(fitment.yearFrom, { row: row.rowNumber, field: `${field}.yearFrom`, integer: true, issues });
      const yearTo = fitment.yearTo === undefined || fitment.yearTo === "" ? null : validateNumber(fitment.yearTo, { row: row.rowNumber, field: `${field}.yearTo`, integer: true, issues });
      if ((yearFrom !== null && (yearFrom < 1900 || yearFrom > 2100)) || (yearTo !== null && (yearTo < 1900 || yearTo > 2100)) || (yearFrom !== null && yearTo !== null && yearTo < yearFrom)) addIssue(issues, row.rowNumber, "fitments", `${field} has an invalid year range.`);
      return { yearFrom, yearTo, make, model, trim: validateString(fitment.trim, { row: row.rowNumber, field: `${field}.trim`, maxLength: 80, issues }), engine: validateString(fitment.engine, { row: row.rowNumber, field: `${field}.engine`, maxLength: 80, issues }) };
    }).filter(Boolean);
  }
  output.condition = validateString(source.condition || "New", {
    row: row.rowNumber,
    field: "condition",
    maxLength: 20,
    issues,
  });
  if (!["New", "Refurbished", "Used"].includes(output.condition)) {
    addIssue(issues, row.rowNumber, "condition", "Use New, Refurbished, or Used.");
  }
  output.warranty = validateString(source.warranty, {
    row: row.rowNumber,
    field: "warranty",
    maxLength: 160,
    issues,
  });
  output.description = validateString(source.description, {
    row: row.rowNumber,
    field: "description",
    maxLength: 5000,
    issues,
  });
  output.compareAtPrice =
    source.compareAtPrice === undefined || source.compareAtPrice === ""
      ? null
      : validateNumber(source.compareAtPrice, {
          row: row.rowNumber,
          field: "compareAtPrice",
          issues,
        });
  output.stock =
    source.stock === undefined || source.stock === ""
      ? 0
      : validateNumber(source.stock, {
          row: row.rowNumber,
          field: "stock",
          integer: true,
          issues,
        });
  output.lowStockThreshold =
    source.lowStockThreshold === undefined || source.lowStockThreshold === ""
      ? 5
      : validateNumber(source.lowStockThreshold, {
          row: row.rowNumber,
          field: "lowStockThreshold",
          integer: true,
          issues,
        });
  output.variants = validateVariants(
    source.variants,
    row.rowNumber,
    issues,
  ).filter(Boolean);
  if (output.variants.length) {
    output.stock = output.variants.reduce(
      (total, variant) => total + variant.stock,
      0,
    );
  }
  output.status =
    source.status === undefined || source.status === ""
      ? "Draft"
      : String(source.status).trim();
  if (!allowedStatuses.has(output.status)) {
    addIssue(
      issues,
      row.rowNumber,
      "status",
      "status must be Draft, Active, or Archived.",
    );
  }
  return output;
}

function validateRows(rows, existingSkus = new Set()) {
  const issues = [];
  if (!rows.length) {
    addIssue(issues, 1, "file", "The file has no product rows.");
    return { products: [], issues };
  }
  if (rows.length > MAX_ROWS) {
    addIssue(issues, 1, "file", `Import up to ${MAX_ROWS} products at a time.`);
    return { products: [], issues };
  }

  const products = rows.map((row) => rowToProduct(row, issues));
  const seenSkus = new Map();
  for (const [index, product] of products.entries()) {
    if (!product?.sku) continue;
    const rowNumber = rows[index].rowNumber;
    if (seenSkus.has(product.sku)) {
      addIssue(
        issues,
        rowNumber,
        "sku",
        `SKU duplicates row ${seenSkus.get(product.sku)}.`,
      );
    } else {
      seenSkus.set(product.sku, rowNumber);
    }
    if (existingSkus.has(product.sku)) {
      addIssue(
        issues,
        rowNumber,
        "sku",
        "This SKU already exists in your catalogue.",
      );
    }
  }
  return { products, issues };
}

async function validateProductImport(sellerId, file) {
  const rows = await parseImportFile(file);
  const provisional = validateRows(rows);
  const skus = provisional.products
    .map((product) => product?.sku)
    .filter(Boolean);
  const existing = skus.length
    ? await Product.find({ seller: sellerId, sku: { $in: [...new Set(skus)] } })
        .select("sku")
        .lean()
    : [];
  const result = validateRows(
    rows,
    new Set(existing.map((product) => product.sku.toUpperCase())),
  );
  const categoryIssues = await categoryService.validateProductCategories(
    result.products,
  );
  for (const issue of categoryIssues) {
    addIssue(
      result.issues,
      rows[issue.index].rowNumber,
      issue.message.includes("subcategory") ? "subcategory" : "category",
      issue.message,
    );
  }
  return result;
}

async function importProducts(sellerId, file) {
  const rows = await parseImportFile(file);
  const session = await mongoose.startSession();
  let importedCount = 0;
  try {
    await session.withTransaction(async () => {
      const provisional = validateRows(rows);
      const skus = provisional.products
        .map((product) => product?.sku)
        .filter(Boolean);
      const existing = skus.length
        ? await Product.find({
            seller: sellerId,
            sku: { $in: [...new Set(skus)] },
          })
            .select("sku")
            .session(session)
            .lean()
        : [];
      const result = validateRows(
        rows,
        new Set(existing.map((product) => product.sku.toUpperCase())),
      );
      const categoryIssues = await categoryService.validateProductCategories(
        result.products,
      );
      for (const issue of categoryIssues) {
        addIssue(
          result.issues,
          rows[issue.index].rowNumber,
          issue.message.includes("subcategory") ? "subcategory" : "category",
          issue.message,
        );
      }
      if (result.issues.length) {
        throw new ProductImportValidationError(result.issues);
      }
      const products = await categoryService.prepareProducts(result.products);
      await Product.insertMany(
        products.map((product) => ({ ...product, seller: sellerId })),
        { ordered: true, session },
      );
      importedCount = result.products.length;
    });
  } catch (error) {
    if (error instanceof ProductImportValidationError) throw error;
    if (
      error?.code === 20 ||
      /Transaction numbers are only allowed|replica set|transaction support/i.test(
        error?.message || "",
      )
    ) {
      throw new HttpError(
        503,
        "Bulk import requires MongoDB transaction support. Use MongoDB Atlas or a replica-set database; no products were saved.",
      );
    }
    if (error?.code === 11000) {
      throw new HttpError(
        409,
        "A product SKU was added by another request during import. No products were saved; validate the file again.",
      );
    }
    throw error;
  } finally {
    await session.endSession();
  }
  return { importedCount };
}

module.exports = {
  ProductImportValidationError,
  importProducts,
  validateProductImport,
};
