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

function normalizeSubcategories(value) {
  const raw = Array.isArray(value)
    ? value
    : String(value || "").split(/[,|\n\r]+/);
  const seen = new Set();
  const result = [];
  for (const entry of raw) {
    const name = String(entry || "").trim().slice(0, 80);
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

function getMarkupPercent(categoryName, categories) {
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
    ],
  })
    .select("category price compareAtPrice")
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
          getMarkupPercent(product.category, categories),
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
            filter: { slug: category.slug },
            update: {
              $setOnInsert: {
                name: category.name,
                slug: category.slug,
                subcategories: category.subcategories,
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

async function listCategories({ includeMarkup = false, activeOnly = false } = {}) {
  await ensureInitialized();
  const filter = activeOnly
    ? { active: true, deletedAt: null }
    : { deletedAt: null };
  const projection = includeMarkup
    ? "name slug subcategories markupPercent active"
    : "name slug subcategories active";
  const categories = await Category.find(filter).select(projection).sort({ name: 1 }).lean();
  return categories.map((category) => ({
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    subcategories: category.subcategories || [],
    active: category.active,
    ...(includeMarkup ? { markupPercent: Number(category.markupPercent) || 0 } : {}),
  }));
}

async function getMarkupPercent(categoryName) {
  await ensureInitialized();
  const category = await Category.findOne({
    name: new RegExp(`^${String(categoryName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    active: true,
    deletedAt: null,
  })
    .select("markupPercent")
    .lean();
  return Number(category?.markupPercent) || 0;
}

async function validateProductCategory(categoryName, subcategory, previous) {
  await ensureInitialized();
  const categoryNameValue = String(categoryName || "").trim();
  const subcategoryValue = String(subcategory || "").trim();
  const category = await Category.findOne({
    name: new RegExp(`^${categoryNameValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    active: true,
    deletedAt: null,
  }).lean();

  if (!category) {
    if (
      previous &&
      previous.category === categoryNameValue &&
      String(previous.subcategory || "") === subcategoryValue
    ) {
      return {
        category: previous.category,
        subcategory: String(previous.subcategory || ""),
      };
    }
    throw new HttpError(400, "Choose a category from the managed category list.");
  }
  const canonicalSubcategory = category.subcategories.find(
    (entry) => entry.toLowerCase() === subcategoryValue.toLowerCase(),
  );
  if (category.subcategories.length && !canonicalSubcategory) {
    if (
      previous &&
      previous.category === category.name &&
      String(previous.subcategory || "") === subcategoryValue
    ) {
      return {
        category: previous.category,
        subcategory: String(previous.subcategory || ""),
      };
    }
    throw new HttpError(400, "Choose a subcategory from the selected category.");
  }
  if (!category.subcategories.length && subcategoryValue) {
    if (
      previous &&
      previous.category === category.name &&
      String(previous.subcategory || "") === subcategoryValue
    ) {
      return {
        category: previous.category,
        subcategory: String(previous.subcategory || ""),
      };
    }
    throw new HttpError(400, "This category has no managed subcategories.");
  }
  return {
    category: category.name,
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
  return products.map((product, index) => {
    const category = byName.get(String(product?.category || "").trim().toLowerCase());
    if (!category) {
      return {
        index,
        message: "Choose a category from the managed category list.",
      };
    }
    const subcategory = String(product?.subcategory || "").trim();
    if (
      category.subcategories.length &&
      !category.subcategories.some(
        (entry) => entry.toLowerCase() === subcategory.toLowerCase(),
      )
    ) {
      return {
        index,
        message: "Choose a subcategory from the selected category.",
      };
    }
    if (!category.subcategories.length && subcategory) {
      return {
        index,
        message: "This category has no managed subcategories.",
      };
    }
    product.category = category.name;
    product.subcategory =
      category.subcategories.find(
        (entry) => entry.toLowerCase() === subcategory.toLowerCase(),
      ) || subcategory;
    return null;
  }).filter(Boolean);
}

async function updateCategoryPrices(categoryName, markupPercent) {
  await ensureInitialized();
  const products = await Product.find({ category: categoryName })
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
      getMarkupPercent(product.category, categories),
    ),
  }));
}

function applyStorefrontPrices(product, markupPercent) {
  const output = {
    ...product,
    price: product.storefrontPrice ?? storefrontPrice(product.price, markupPercent),
    compareAtPrice:
      product.storefrontCompareAtPrice ??
      (product.compareAtPrice == null
        ? null
        : storefrontPrice(product.compareAtPrice, markupPercent)),
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
  getMarkupPercent,
  validateProductCategory,
  validateProductCategories,
  updateCategoryPrices,
  prepareProduct,
  prepareProducts,
  applyStorefrontPrices,
  normalizeSubcategories,
  slugify,
  storefrontPrice,
};
