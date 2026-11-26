const defaults = require("../../../../categories.json");
const Category = require("./models/Category");
const Product = require("../seller/models/Product");
const HttpError = require("../../utils/HttpError");

let initialization;

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function categoryNamePattern(value) {
  const escaped = String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^\\s*${escaped}\\s*$`, "i");
}

function parseSubcategoryInput(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) =>
      typeof entry === "string" && entry.trim().startsWith("[")
        ? parseSubcategoryInput(entry)
        : [entry],
    );
  }
  if (typeof value !== "string") return value == null ? [] : [value];

  const text = value.trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parseSubcategoryInput(parsed);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }

  if (text.startsWith("[") && text.endsWith("]")) {
    const entries = Array.from(
      text.matchAll(/\bname\s*:\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')/g),
      (match) => (match[1] === undefined ? match[2] : match[1]),
    );
    if (entries.length) return entries;
  }

  return text.split(/[,|\n\r]+/);
}

function subcategoryNames(value) {
  return parseSubcategoryInput(value)
    .map((entry) => {
      const name =
        entry && typeof entry === "object" ? entry.name : entry;
      return String(name || "").trim();
    })
    .filter(Boolean);
}

function normalizeSubcategories(value) {
  const seen = new Set();
  const result = [];
  for (const rawName of subcategoryNames(value)) {
    const name = rawName.slice(0, 80);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) {
      throw new HttpError(400, `The subcategory "${name}" is repeated.`);
    }
    seen.add(key);
    result.push(name);
    if (result.length > 100) {
      throw new HttpError(400, "Add up to 100 subcategories per category.");
    }
  }
  return result;
}

function findMarkupPercent(categoryName, categories) {
  const category = categories.find(
    (entry) =>
      entry.name.toLowerCase() === String(categoryName || "").trim().toLowerCase(),
  );
  return category?.active ? Number(category.markupPercent) || 0 : 0;
}

function storefrontPrice(basePrice, markupPercent) {
  return roundMoney(Number(basePrice) * (1 + Number(markupPercent || 0) / 100));
}

function productPriceFields(product, markupPercent) {
  return {
    storefrontPrice: storefrontPrice(product.price, markupPercent),
    storefrontCompareAtPrice:
      product.compareAtPrice === null || product.compareAtPrice === undefined
        ? null
        : storefrontPrice(product.compareAtPrice, markupPercent),
  };
}

async function backfillStorefrontPrices() {
  const products = await Product.find({
    $or: [
      { storefrontPrice: { $exists: false } },
      { storefrontCompareAtPrice: { $exists: false } },
      { storefrontPrice: 0, price: { $gt: 0 } },
      { storefrontCompareAtPrice: 0, compareAtPrice: { $gt: 0 } },
    ],
  })
    .select("category price compareAtPrice +storefrontPrice")
    .lean();
  if (!products.length) return;

  const categories = await Category.find({ deletedAt: null })
    .select("name markupPercent active")
    .lean();
  const writes = products.map((product) => ({
    updateOne: {
      filter: { _id: product._id },
      update: {
        $set: productPriceFields(
          product,
          findMarkupPercent(product.category, categories),
        ),
      },
    },
  }));
  await Product.bulkWrite(writes);
}

async function ensureInitialized() {
  if (!initialization) {
    initialization = (async () => {
      await Category.bulkWrite(
        defaults.map((category) => ({
          updateOne: {
            filter: {
              $or: [{ slug: category.slug }, { name: category.name }],
            },
            update: {
              $setOnInsert: {
                name: category.name,
                slug: category.slug,
                subcategories: category.subcategories.map((subcategory) =>
                  typeof subcategory === "string" ? subcategory : subcategory.name,
                ),
                markupPercent: 0,
                active: true,
              },
            },
            upsert: true,
          },
        })),
      );
      await backfillStorefrontPrices();
    })();
  }
  try {
    await initialization;
  } catch (error) {
    initialization = null;
    throw error;
  }
}

async function listCategories({
  includeMarkup = false,
  activeOnly = false,
  includeImages = false,
} = {}) {
  await ensureInitialized();
  const filter = activeOnly
    ? { active: true, deletedAt: null }
    : { deletedAt: null };
  const projection = [
    "name",
    "slug",
    "subcategories",
    "active",
    ...(includeMarkup ? ["markupPercent"] : []),
    ...(includeImages ? ["image"] : []),
  ].join(" ");
  const categories = await Category.find(filter).select(projection).sort({ name: 1 }).lean();
  return categories.map((category) => {
    const subcategoryEntries = category.subcategories || [];
    const subcategories = subcategoryNames(subcategoryEntries);
    const defaultCategory = includeImages
      ? defaults.find(
          (entry) =>
            entry.slug === category.slug ||
            entry.name.toLowerCase() === String(category.name || "").toLowerCase(),
        )
      : null;
    return {
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      subcategories,
      active: category.active,
      ...(includeMarkup ? { markupPercent: Number(category.markupPercent) || 0 } : {}),
      ...(includeImages
        ? {
            image: category.image || defaultCategory?.image || "",
            subcategoryImages: subcategories.map((name, index) => {
              const configuredSubcategory = defaultCategory?.subcategories?.find(
                (entry) =>
                  String(typeof entry === "string" ? entry : entry.name || "")
                    .toLowerCase() === name.toLowerCase(),
              );
              const storedSubcategory = subcategoryEntries[index];
              return {
                name,
                image:
                  configuredSubcategory?.image ||
                  (storedSubcategory && typeof storedSubcategory === "object"
                    ? storedSubcategory.image || ""
                    : ""),
              };
            }),
          }
        : {}),
    };
  });
}

async function getMarkupPercent(categoryName) {
  await ensureInitialized();
  const category = await Category.findOne({
    name: categoryNamePattern(categoryName),
    active: true,
    deletedAt: null,
  })
    .select("markupPercent")
    .lean();
  return Number(category?.markupPercent) || 0;
}

async function validateProductCategory(categoryName, subcategory) {
  await ensureInitialized();
  const categoryNameValue = String(categoryName || "").trim();
  const subcategoryValue = String(subcategory || "").trim();
  if (!categoryNameValue) {
    throw new HttpError(400, "category is required.");
  }
  if (categoryNameValue.length > 80) {
    throw new HttpError(400, "category must be 80 characters or fewer.");
  }
  if (subcategoryValue.length > 80) {
    throw new HttpError(400, "subcategory must be 80 characters or fewer.");
  }
  const category = await Category.findOne({
    name: categoryNamePattern(categoryNameValue),
    active: true,
    deletedAt: null,
  }).lean();

  const subcategories = category ? subcategoryNames(category.subcategories) : [];
  const canonicalSubcategory = subcategories.find(
    (entry) => entry.toLowerCase() === subcategoryValue.toLowerCase(),
  );
  return {
    category: category?.name || categoryNameValue,
    subcategory: canonicalSubcategory || subcategoryValue,
  };
}

async function validateProductCategories(products) {
  await ensureInitialized();
  const categories = await Category.find({ active: true, deletedAt: null })
    .select("name subcategories")
    .lean();
  const byName = new Map(
    categories.map((category) => [category.name.toLowerCase(), category]),
  );
  return products.map((product) => {
    const categoryName = String(product?.category || "").trim();
    const category = byName.get(categoryName.toLowerCase());
    const subcategory = String(product?.subcategory || "").trim();
    const subcategories = category ? subcategoryNames(category.subcategories) : [];
    product.category = category?.name || categoryName;
    product.subcategory =
      subcategories.find(
        (entry) => entry.toLowerCase() === subcategory.toLowerCase(),
      ) || subcategory;
    return null;
  }).filter(Boolean);
}

async function updateCategoryPrices(categoryName, markupPercent) {
  await ensureInitialized();
  const products = await Product.find({
    category: categoryNamePattern(categoryName),
  })
    .select("category price compareAtPrice")
    .lean();
  if (!products.length) return;
  await Product.bulkWrite(
    products.map((product) => ({
      updateOne: {
        filter: { _id: product._id },
        update: {
          $set: productPriceFields(product, markupPercent),
        },
      },
    })),
  );
}

async function prepareProduct(product) {
  await ensureInitialized();
  const markupPercent = await getMarkupPercent(product.category);
  return { ...product, ...productPriceFields(product, markupPercent) };
}

async function prepareProducts(products) {
  await ensureInitialized();
  const categories = await Category.find({ deletedAt: null })
    .select("name markupPercent active")
    .lean();
  return products.map((product) => ({
    ...product,
    ...productPriceFields(
      product,
      findMarkupPercent(product.category, categories),
    ),
  }));
}

function applyStorefrontPrices(product, markupPercent) {
  const output = {
    ...product,
    price: storefrontPrice(product.price, markupPercent),
    compareAtPrice:
      product.compareAtPrice == null
        ? null
        : storefrontPrice(product.compareAtPrice, markupPercent),
  };
  delete output.storefrontPrice;
  delete output.storefrontCompareAtPrice;
  if (Array.isArray(product.variants)) {
    output.variants = product.variants.map((variant) => ({
      ...variant,
      price: storefrontPrice(variant.price, markupPercent),
    }));
  }
  return output;
}

module.exports = {
  ensureInitialized,
  listCategories,
  categoryNamePattern,
  getMarkupPercent,
  validateProductCategory,
  validateProductCategories,
  updateCategoryPrices,
  prepareProduct,
  prepareProducts,
  applyStorefrontPrices,
  normalizeSubcategories,
  subcategoryNames,
  slugify,
  storefrontPrice,
};
