const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Seller = require("./models/Seller");
const Customer = require("../customer/models/Customer");
const PasswordReset = require("./models/PasswordReset");
const Product = require("./models/Product");
const Discount = require("./models/Discount");
const Order = require("../customer/models/Order");
const ReturnRequest = require("../customer/models/ReturnRequest");
const Review = require("../customer/reviews/Review");
const HttpError = require("../../utils/HttpError");
const { buildOrderTimeline } = require("../customer/shop/helpers");
const { getCountry, getIdentityDocumentTypes } = require("../market/countries");
require("../customer/reviews/Review");
const { encryptValue } = require("../../utils/encryption");
const verificationStorage = require("./verificationStorage");
const stripeService = require("../payments/stripe/service");
const {
  calculateNetPayout,
  calculatePlatformFee,
  getPlatformFeeRate,
} = require("./finance");
const {
  getResendConfig,
  sendPasswordResetEmail,
} = require("./passwordResetEmail");
const { triggerProductAlerts } = require("../customer/profile/service");
const { Resend } = require("resend");
const categoryService = require("../admin/categoryService");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fulfillmentFor(order, sellerId) {
  const sellerState = order.sellerFulfillments?.find(
    (state) => state.seller?.toString() === sellerId?.toString(),
  );
  if (sellerState) return sellerState.status;
  if (["Shipped", "Delivered", "Cancelled"].includes(order.status))
    return order.status;
  return order.sellerFulfillment || "New";
}

function nextScannedFulfillment(status) {
  return ({ New: "Packed", Packed: "Shipped" }[status] || null);
}

function validateSellerLocation(location) {
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  if (
    !location ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new HttpError(400, "Enable location access before updating an order.");
  }
  return {
    latitude,
    longitude,
    label: String(location.label || "Seller facility").trim().slice(0, 120),
  };
}

async function notifyCustomerShipment(order, sellerState) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) return;
  try {
    const customer = await Customer.findById(order.customer).select("email").lean();
    const seller = await Seller.findById(sellerState.seller).select("storeName").lean();
    if (!customer?.email) return;
    const origin = (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].trim();
    const tracking = sellerState.tracking ? `\nCarrier: ${sellerState.carrier || "Not specified"}\nTracking: ${sellerState.tracking}${sellerState.trackingUrl ? `\nTrack package: ${sellerState.trackingUrl}` : ""}` : "";
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: [customer.email],
      subject: `Order ${order.code} update: ${sellerState.status}`,
      text: `Your order ${order.code} from ${seller?.storeName || "an AcquireAuto seller"} is now ${sellerState.status}.${tracking}\n\nView order: ${origin}/profile/orders`,
    });
  } catch { /* Keep tracking updates saved even if email delivery fails. */ }
}

const productFields = [
  "sku",
  "partNumber",
  "name",
  "description",
  "category",
  "subcategory",
  "brand",
  "fitment",
  "fitments",
  "condition",
  "warranty",
  "price",
  "compareAtPrice",
  "stock",
  "lowStockThreshold",
  "images",
  "variants",
  "status",
];
function cleanProduct(input, partial = false) {
  const out = {};
  for (const key of productFields)
    if (Object.hasOwn(input || {}, key)) out[key] = input[key];
  if (!partial) {
    for (const key of ["sku", "name", "category", "price"])
      if (out[key] === undefined || out[key] === "")
        throw new HttpError(400, `${key} is required.`);
    out.sku = String(out.sku).trim().toUpperCase();
  }
  if (out.sku !== undefined) out.sku = String(out.sku).trim().toUpperCase();
  if (out.category !== undefined) out.category = String(out.category).trim();
  if (out.subcategory !== undefined)
    out.subcategory = String(out.subcategory).trim();
  if (out.partNumber !== undefined) out.partNumber = String(out.partNumber).trim().toUpperCase();
  if (out.condition !== undefined && !["New", "Refurbished", "Used"].includes(out.condition))
    throw new HttpError(400, "Choose a valid product condition.");
  if (out.fitments !== undefined) {
    if (!Array.isArray(out.fitments) || out.fitments.length > 25)
      throw new HttpError(400, "Add up to 25 structured vehicle fitments.");
    out.fitments = out.fitments.map((fitment) => {
      const from = fitment.yearFrom === "" || fitment.yearFrom == null ? null : Number(fitment.yearFrom);
      const to = fitment.yearTo === "" || fitment.yearTo == null ? null : Number(fitment.yearTo);
      if ((from !== null && (!Number.isInteger(from) || from < 1900 || from > 2100)) ||
          (to !== null && (!Number.isInteger(to) || to < 1900 || to > 2100)) ||
          (from !== null && to !== null && to < from))
        throw new HttpError(400, "Enter a valid fitment year range.");
      const make = String(fitment.make || "").trim().slice(0, 80);
      const model = String(fitment.model || "").trim().slice(0, 100);
      if (!make || !model) throw new HttpError(400, "Each structured fitment needs a make and model.");
      return {
        yearFrom: from,
        yearTo: to,
        make,
        model,
        trim: String(fitment.trim || "").trim().slice(0, 80),
        engine: String(fitment.engine || "").trim().slice(0, 80),
      };
    });
  }
  if (
    out.status !== undefined &&
    !["Draft", "Active", "Archived"].includes(out.status)
  )
    throw new HttpError(400, "Choose a valid product status.");
  for (const key of ["price", "stock", "lowStockThreshold"])
    if (
      out[key] !== undefined &&
      (!Number.isFinite(Number(out[key])) || Number(out[key]) < 0)
    )
      throw new HttpError(400, `Enter a valid ${key}.`);
  if (!partial && (!Array.isArray(out.images) || out.images.length < 1))
    throw new HttpError(400, "Add at least 1 product image.");
  if (
    out.images !== undefined &&
    (!Array.isArray(out.images) ||
      out.images.length < 1 ||
      out.images.length > 6)
  )
    throw new HttpError(400, "Add between 1 and 6 product image URLs.");
  if (Array.isArray(out.images)) {
    for (const image of out.images) {
      try {
        if (typeof image !== "string") throw new Error("invalid image URL");
        const url = new URL(image);
        if (
          !["http:", "https:"].includes(url.protocol) ||
          image.length > 1000
        ) {
          throw new Error("invalid image URL");
        }
      } catch {
        throw new HttpError(
          400,
          "Enter valid HTTP or HTTPS product image URLs.",
        );
      }
    }
  }
  if (
    out.variants &&
    (!Array.isArray(out.variants) || out.variants.length > 50)
  )
    throw new HttpError(400, "Add up to 50 product variants.");
  if (out.variants?.length)
    out.stock = out.variants.reduce(
      (sum, variant) => sum + Number(variant.stock || 0),
      0,
    );
  return out;
}
function serializeProduct(p) {
  return {
    ...p,
    id: p._id?.toString?.() || p.id,
    _id: undefined,
    seller: undefined,
    storefrontPrice: undefined,
    storefrontCompareAtPrice: undefined,
  };
}

async function register(body) {
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const password = String(body.password || "");
  const phone = String(body.phone || "").replace(/[^\d]/g, "");
  const address = String(body.address || "").trim().slice(0, 1000);
  if (
    !/^\S+@\S+\.\S+$/.test(email) ||
    email.length > 254 ||
    password.length < 10 ||
    password.length > 128
  )
    throw new HttpError(
      400,
      "Enter a valid email address and a password of at least 10 characters.",
    );
  if (phone.length < 7 || phone.length > 15)
    throw new HttpError(400, "Enter a valid mobile number.");
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    return await Seller.create({
      email,
      phone,
      passwordHash,
      name: "",
      storeName: "",
      address,
      identityVerification: { status: "Not submitted", signatureStatus: "Not submitted" },
    });
  } catch (error) {
    if (error.code === 11000)
      throw new HttpError(409, "An account with this email already exists.");
    throw error;
  }
}
async function login(body) {
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const seller = await Seller.findOne({ email }).select("+passwordHash");
  if (
    !seller ||
    !(await bcrypt.compare(String(body.password || ""), seller.passwordHash))
  )
    return null;
  return seller;
}
async function requestPasswordReset({ email, resend, frontendUrl }) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || normalizedEmail.length > 254)
    throw new HttpError(400, "Enter a valid seller email address.");

  const resendConfig = getResendConfig({ resend });
  const seller = await Seller.findOne({ email: normalizedEmail }).select(
    "_id email",
  );
  if (!seller) return;

  const now = new Date();
  const existingReset = await PasswordReset.findOne({
    seller: seller._id,
  }).lean();
  if (existingReset && now - existingReset.updatedAt < 60_000) return;

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
  await PasswordReset.findOneAndUpdate(
    { seller: seller._id },
    { $set: { tokenHash, expiresAt }, $setOnInsert: { seller: seller._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  try {
    const resetUrl = new URL("/seller/reset-password", frontendUrl);
    resetUrl.searchParams.set("token", token);
    await sendPasswordResetEmail({
      config: { resend: resendConfig },
      email: seller.email,
      resetUrl: resetUrl.toString(),
    });
  } catch (error) {
    await PasswordReset.deleteOne({ seller: seller._id, tokenHash });
    console.error(
      "Seller password reset email delivery failed:",
      error.message,
    );
    if (error instanceof HttpError) throw error;
    const deliveryError = new HttpError(
      503,
      "Password reset email could not be sent. Please try again later.",
    );
    throw deliveryError;
  }
}
async function resetPassword({ token, password }) {
  if (typeof token !== "string" || !/^[a-f\d]{64}$/i.test(token))
    throw new HttpError(
      400,
      "This password reset link is invalid or has expired.",
    );
  if (
    typeof password !== "string" ||
    password.length < 10 ||
    password.length > 128 ||
    Buffer.byteLength(password) > 72
  )
    throw new HttpError(400, "Choose a password with 10 to 72 bytes.");

  const passwordHash = await bcrypt.hash(password, 12);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const reset = await PasswordReset.findOneAndDelete({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });
  if (!reset)
    throw new HttpError(
      400,
      "This password reset link is invalid or has expired.",
    );

  const seller = await Seller.findByIdAndUpdate(
    reset.seller,
    { $set: { passwordHash }, $inc: { authVersion: 1 } },
    { new: true },
  );
  if (!seller)
    throw new HttpError(
      400,
      "This password reset link is invalid or has expired.",
    );

  await PasswordReset.deleteMany({ seller: reset.seller });
}
async function listProducts(sellerId, query = {}) {
  const filter = { seller: sellerId };
  if (["Active", "Draft", "Archived"].includes(query.status))
    filter.status = query.status;
  if (query.q)
    filter.$or = ["name", "sku", "partNumber", "category", "fitment", "fitments.make", "fitments.model", "fitments.trim", "fitments.engine"].map((field) => ({
      [field]: {
        $regex: escapeRegex(String(query.q).slice(0, 80)),
        $options: "i",
      },
    }));
  const [products, total] = await Promise.all([
    Product.find(filter).sort({ updatedAt: -1 }).limit(200).lean(),
    Product.countDocuments(filter),
  ]);
  return { products: products.map(serializeProduct), total };
}
async function createProduct(sellerId, body) {
  const cleaned = cleanProduct(body);
  Object.assign(
    cleaned,
    await categoryService.validateProductCategory(
      cleaned.category,
      cleaned.subcategory,
    ),
  );
  return serializeProduct(
    await Product.create({
      ...(await categoryService.prepareProduct(cleaned)),
      seller: sellerId,
    }),
  );
}
async function updateProduct(sellerId, id, body) {
  const previous = await Product.findOne({ _id: id, seller: sellerId }).lean();
  if (!previous) throw new HttpError(404, "Product not found in your catalogue.");
  const cleaned = cleanProduct(body, true);
  const categorySelection = await categoryService.validateProductCategory(
    cleaned.category ?? previous.category,
    cleaned.subcategory ?? previous.subcategory,
    previous,
  );
  Object.assign(cleaned, categorySelection);
  const next = { ...previous, ...cleaned };
  const prepared = await categoryService.prepareProduct(next);
  const product = await Product.findOneAndUpdate(
    { _id: id, seller: sellerId },
    {
      $set: {
        ...cleaned,
        storefrontPrice: prepared.storefrontPrice,
        storefrontCompareAtPrice: prepared.storefrontCompareAtPrice,
      },
    },
    { new: true, runValidators: true },
  ).lean();
  await triggerProductAlerts(previous, product).catch(() => {});
  return serializeProduct(product);
}
async function deleteProduct(sellerId, id) {
  const product = await Product.findOneAndUpdate(
    { _id: id, seller: sellerId },
    { $set: { status: "Archived" } },
    { new: true },
  ).lean();
  if (!product)
    throw new HttpError(404, "Product not found in your catalogue.");
  return { id, status: product.status };
}
async function adjustStock(sellerId, id, body) {
  const delta = Number(body.quantity);
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000)
    throw new HttpError(400, "Enter a non-zero whole-number stock adjustment.");
  const product = await Product.findOne({ _id: id, seller: sellerId });
  if (!product)
    throw new HttpError(404, "Product not found in your catalogue.");
  const previous = product.toObject();
  if (body.variantId) {
    const variant = product.variants.id(body.variantId);
    if (!variant) throw new HttpError(404, "Product variant not found.");
    if (variant.stock + delta < 0)
      throw new HttpError(400, "Variant stock cannot be reduced below zero.");
    variant.stock += delta;
    product.stock += delta;
    await product.save();
    await triggerProductAlerts(previous, product.toObject()).catch(() => {});
    return serializeProduct(product.toObject());
  }
  if (product.stock + delta < 0)
    throw new HttpError(400, "Stock cannot be reduced below zero.");
  product.stock += delta;
  await product.save();
  await triggerProductAlerts(previous, product.toObject()).catch(() => {});
  return serializeProduct(product.toObject());
}
async function getDashboard(seller, timezoneOffset = 0) {
  const products = await Product.find({ seller: seller._id }).lean();
  const productIds = products.map((p) => p._id.toString());
  const orders = productIds.length
    ? await Order.find({ "items.productId": { $in: productIds } })
        .sort({ placedAt: -1 })
        .limit(2000)
        .populate("customer", "name email")
        .lean()
    : [];
  const orderCodes = orders.map((order) => order.code);
  const returnCount = orderCodes.length
    ? await ReturnRequest.countDocuments({
        orderRef: { $in: orderCodes },
        status: { $in: ["Requested", "In transit"] },
      })
    : 0;
  const rows = orders.map((order) => {
    const items = order.items.filter((item) =>
      productIds.includes(item.productId),
    );
    const total = items.reduce(
      (sum, item) =>
        sum + Number(item.sellerPrice ?? item.price) * item.quantity,
      0,
    );
    const fulfillment = fulfillmentFor(order, seller._id);
    return {
      id: order._id.toString(),
      code: order.code,
      customer: order.customer?.name || "Customer",
      email: order.customer?.email || "",
      items: items.map((i) => ({
        name: i.name,
        productId: i.productId,
        quantity: i.quantity,
        price: i.sellerPrice ?? i.price,
      })),
      total,
      paymentStatus: order.payment?.paid
        ? "Paid"
        : order.payment?.method === "Cash on delivery"
          ? "COD"
          : "Pending",
      paymentMethod: order.payment?.method || "",
      fulfillment,
      placedAt: order.placedAt,
    };
  });
  const revenue = rows
    .filter((r) => r.fulfillment !== "Cancelled")
    .reduce((sum, r) => sum + r.total, 0);
  const localDayKey = (date) =>
    new Date(date.getTime() - timezoneOffset * 60000)
      .toISOString()
      .slice(0, 10);
  const todayKey = localDayKey(new Date());
  const todaysOrders = rows.filter(
    (row) =>
      localDayKey(new Date(row.placedAt)) === todayKey &&
      row.fulfillment !== "Cancelled",
  );
  const todayRevenue = todaysOrders.reduce((sum, row) => sum + row.total, 0);
  const days = Array.from({ length: 90 }, (_, i) => {
    const now = new Date();
    const localNow = new Date(now.getTime() - timezoneOffset * 60000);
    localNow.setUTCHours(0, 0, 0, 0);
    localNow.setUTCDate(localNow.getUTCDate() - (89 - i));
    const key = localNow.toISOString().slice(0, 10);
    const amount = rows
      .filter(
        (r) =>
          localDayKey(new Date(r.placedAt)) === key &&
          r.fulfillment !== "Cancelled",
      )
      .reduce((sum, r) => sum + r.total, 0);
    return { date: key, amount };
  });
  const activeProducts = products.filter((p) => p.status === "Active");
  const lowStock = activeProducts.flatMap((p) => {
    const threshold = p.lowStockThreshold ?? seller.settings.lowStockThreshold;
    if (p.variants?.length)
      return p.variants
        .filter((variant) => variant.stock <= threshold)
        .map((variant) => ({
          ...serializeProduct(p),
          id: `${p._id}:${variant._id}`,
          name: `${p.name} · ${variant.name}`,
          sku: variant.sku || p.sku,
          price: variant.price,
          stock: variant.stock,
          variantId: variant._id.toString(),
        }));
    return p.stock <= threshold ? [serializeProduct(p)] : [];
  });
  const productViews = products.reduce(
    (sum, product) => sum + (product.viewCount || 0),
    0,
  );
  return {
    seller: {
      id: seller._id.toString(),
      name: seller.name,
      storeName: seller.storeName,
      email: seller.email,
      country: seller.country || "",
      verified: seller.verified,
      verificationStatus:
        seller.identityVerification?.status || "Not submitted",
      settings: seller.settings,
    },
    metrics: {
      revenue: Math.round(revenue * 100) / 100,
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      todayOrders: todaysOrders.length,
      orders: rows.length,
      averageOrderValue: todaysOrders.length
        ? Math.round((todayRevenue / todaysOrders.length) * 100) / 100
        : 0,
      pendingOrders: rows.filter((r) =>
        ["New", "Packed"].includes(r.fulfillment),
      ).length,
      activeListings: activeProducts.length,
      lowStockCount: lowStock.length,
      returns: returnCount,
      productViews,
      conversionRate: productViews
        ? Math.round((rows.length / productViews) * 10000) / 100
        : 0,
    },
    sales: days,
    recentOrders: rows.slice(0, 8),
    lowStockProducts: lowStock.sort((a, b) => a.stock - b.stock).slice(0, 8),
    bestSellers: products
      .slice()
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, 5)
      .map(serializeProduct),
    ordersInProgress: rows.filter(
      (r) => !["Delivered", "Cancelled"].includes(r.fulfillment),
    ).length,
  };
}
async function listOrders(sellerId, query = {}) {
  const productIds = (
    await Product.find({ seller: sellerId }).select("_id").lean()
  ).map((p) => p._id.toString());
  if (!productIds.length) return { orders: [] };
  const orders = await Order.find({ "items.productId": { $in: productIds } })
    .sort({ placedAt: -1 })
    .limit(200)
    .populate("customer", "name email");
  for (const order of orders) {
    let sellerState = order.sellerFulfillments.find(
      (state) => state.seller.toString() === sellerId.toString(),
    );
    if (!sellerState) {
      order.sellerFulfillments.push({
        seller: sellerId,
        status: fulfillmentFor(order, sellerId),
      });
      sellerState =
        order.sellerFulfillments[order.sellerFulfillments.length - 1];
    }
    let changed = false;
    if (!sellerState.scanToken) {
      sellerState.scanToken = crypto.randomBytes(32).toString("hex");
      changed = true;
    }
    if (!sellerState.events?.length) {
      sellerState.events = [
        {
          status: sellerState.status,
          source: "system",
          occurredAt: order.placedAt,
        },
      ];
      changed = true;
    }
    if (changed || sellerState.isNew) await order.save();
  }
  const mapped = orders.map((o) => {
    const sellerState = o.sellerFulfillments.find(
      (state) => state.seller.toString() === sellerId.toString(),
    );
    return {
    id: o._id.toString(),
    code: o.code,
    customer: o.customer?.name || "Customer",
    email: o.customer?.email || "",
    items: o.items
      .filter((i) => productIds.includes(i.productId))
      .map((i) => ({
        name: i.name,
        productId: i.productId,
        quantity: i.quantity,
        price: i.sellerPrice ?? i.price,
        variant: i.variant || "",
      })),
    paymentStatus: o.payment?.paid
      ? "Paid"
      : o.payment?.method === "Cash on delivery"
        ? "COD"
        : "Pending",
    paymentMethod: o.payment?.method || "",
    fulfillment: fulfillmentFor(o, sellerId),
    trackingStatus: sellerState?.trackingStatus || "",
    events: (sellerState?.events || []).map((event) => ({
      status: event.status,
      occurredAt: event.occurredAt,
      note: event.note || "",
      location:
        event.location?.latitude == null || event.location?.longitude == null
          ? null
          : {
              latitude: event.location.latitude,
              longitude: event.location.longitude,
              label: event.location.label || "",
            },
    })),
    placedAt: o.placedAt,
    scanToken: sellerState?.scanToken,
    currency: o.currency || "USD",
    totals: o.totals,
    address: o.address,
    tracking:
      sellerState?.tracking || "",
    carrier: sellerState?.carrier || "",
    trackingUrl: sellerState?.trackingUrl || "",
  };
  });
  return {
    orders: query.status
      ? mapped.filter((o) => o.fulfillment === query.status)
      : mapped,
  };
}
async function updateOrder(
  sellerId,
  id,
  fulfillment,
  tracking,
  source = "seller_manual",
  carrier,
  trackingUrl,
  locationInput,
) {
  if (!["Packed", "Shipped", "Delivered", "Cancelled"].includes(fulfillment))
    throw new HttpError(400, "Choose a valid fulfillment status.");
  if (fulfillment === "Delivered" && source !== "delivery_agent")
    throw new HttpError(
      403,
      "A delivery agent must verify the customer OTP before marking this package delivered.",
    );
  const location = validateSellerLocation(locationInput);
  const productIds = (
    await Product.find({ seller: sellerId }).select("_id").lean()
  ).map((p) => p._id.toString());
  const order = await Order.findOne({
    _id: id,
    "items.productId": { $in: productIds },
  });
  if (!order) throw new HttpError(404, "Order not found for this store.");
  const previousFulfillment = fulfillmentFor(order, sellerId);
  if (
    (fulfillment === "Packed" && previousFulfillment !== "New") ||
    (fulfillment === "Shipped" && previousFulfillment !== "Packed")
  ) {
    throw new HttpError(
      409,
      "Update seller fulfillment in order: New, Packed, then Shipped.",
    );
  }
  if (order.payment?.method === "Stripe" && !order.payment.paid) {
    throw new HttpError(
      409,
      "Wait for Stripe payment confirmation before updating fulfillment.",
    );
  }
  if (order.status === "Cancelled" || order.status === "Delivered")
    throw new HttpError(
      409,
      "This order is already complete and cannot be changed.",
    );
  if (["Cancelled", "Delivered"].includes(fulfillmentFor(order, sellerId)))
    throw new HttpError(
      409,
      "This seller's order is already complete and cannot be changed.",
    );
  const ownedProducts = await Product.find({
    seller: sellerId,
    _id: {
      $in: order.items
        .map((item) => item.productId)
        .filter((productId) => require("mongoose").isValidObjectId(productId)),
    },
  })
    .select("_id")
    .lean();
  const ownedIds = new Set(
    ownedProducts.map((product) => product._id.toString()),
  );
  const ownsEntireOrder = order.items.every((item) =>
    ownedIds.has(item.productId),
  );
  if (fulfillment === "Cancelled" && !ownsEntireOrder)
    throw new HttpError(
      409,
      "This order contains items from another store. Contact seller support to cancel it safely.",
    );
  if (fulfillment === "Cancelled" && order.payment?.paid)
    throw new HttpError(
      409,
      "This order has been paid. Contact seller support to arrange a refund before cancelling it.",
    );
  if (fulfillment === "Cancelled") {
    order.status = "Cancelled";
    order.cancelledAt = new Date();
    order.timeline = buildOrderTimeline(
      "Cancelled",
      order.placedAt,
      order.cancelledAt,
    );
  }
  if (ownsEntireOrder && fulfillment === "Shipped") {
    order.status = "Shipped";
    order.timeline = buildOrderTimeline("Shipped", order.placedAt);
  }
  if (ownsEntireOrder && fulfillment === "Delivered") {
    order.status = "Delivered";
    order.timeline = buildOrderTimeline("Delivered", order.placedAt);
  }
  let sellerState = order.sellerFulfillments.find(
    (state) => state.seller.toString() === sellerId.toString(),
  );
  if (!sellerState) {
    order.sellerFulfillments.push({ seller: sellerId, status: fulfillment });
    sellerState = order.sellerFulfillments[order.sellerFulfillments.length - 1];
  }
  sellerState.status = fulfillment;
  sellerState.updatedAt = new Date();
  if (fulfillment === "Packed" || fulfillment === "Shipped") {
    sellerState.trackingStatus = fulfillment;
  }
  if (fulfillment === "Cancelled") {
    sellerState.trackingStatus = "Cancelled";
    sellerState.assignedDeliveryAgent = null;
    sellerState.deliveryOtpEncrypted = "";
    sellerState.deliveryOtpExpiresAt = null;
  }
  if (!sellerState.scanToken) {
    sellerState.scanToken = crypto.randomBytes(32).toString("hex");
  }
  if (!sellerState.events) sellerState.events = [];
  sellerState.events.push({
    status: fulfillment,
    source,
    occurredAt: sellerState.updatedAt,
    location,
  });
  if (tracking !== undefined) {
    const clean = String(tracking).trim().slice(0, 100);
    sellerState.tracking = clean;
    if (ownsEntireOrder) order.sellerTracking = clean;
  }
  if (carrier !== undefined) sellerState.carrier = String(carrier).trim().slice(0, 80);
  if (trackingUrl !== undefined) {
    const cleanUrl = String(trackingUrl).trim().slice(0, 500);
    if (cleanUrl) {
      let parsedUrl;
      try { parsedUrl = new URL(cleanUrl); } catch { throw new HttpError(400, "Enter a valid tracking URL."); }
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new HttpError(400, "Tracking URLs must use HTTP or HTTPS.");
    }
    sellerState.trackingUrl = cleanUrl;
  }
  if (fulfillment !== "Cancelled") {
    const sellerStatuses = order.sellerFulfillments.map(
      (state) => state.status,
    );
    if (
      sellerStatuses.length &&
      sellerStatuses.every((status) => status === "Delivered")
    ) {
      order.status = "Delivered";
    } else if (
      sellerStatuses.some((status) => ["Shipped", "Delivered"].includes(status))
    ) {
      order.status = "Shipped";
    } else if (order.status !== "Cancelled") {
      order.status = "Processing";
    }
  }
  if (order.status !== "Cancelled") {
    order.timeline = buildOrderTimeline(
      order.status,
      order.placedAt,
      sellerState.updatedAt,
    );
  }
  if (fulfillment === "Delivered" && order.payment?.method === "Stripe") {
    await stripeService.transferSellerPayout(order, sellerId);
  }
  if (fulfillment === "Cancelled")
    await Promise.all(
      order.items
        .filter((item) => ownedIds.has(item.productId))
        .map((item) => {
          const increments = {
            stock: item.quantity,
            soldCount: -item.quantity,
          };
          const filter = { _id: item.productId, seller: sellerId };
          if (item.variantId) {
            filter.variants = { $elemMatch: { _id: item.variantId } };
            increments["variants.$.stock"] = item.quantity;
          }
          return Product.updateOne(filter, { $inc: increments });
        }),
    );
  await order.save();
  if (fulfillment !== previousFulfillment && fulfillment !== "Cancelled") {
    await notifyCustomerShipment(order, sellerState);
  }
  return {
    id: order._id.toString(),
    fulfillment: fulfillmentFor(order, sellerId),
    tracking: sellerState.tracking || "",
    status: order.status,
  };
}

async function scanOrder(sellerId, scanToken, location) {
  const token = String(scanToken || "").trim();
  if (!/^[a-f\d]{64}$/i.test(token)) {
    throw new HttpError(400, "Scan a valid AcquireAuto package QR or barcode.");
  }
  const order = await Order.findOne({
    sellerFulfillments: { $elemMatch: { seller: sellerId, scanToken: token } },
  });
  if (!order)
    throw new HttpError(
      404,
      "This package label was not found for your store.",
    );
  const sellerState = order.sellerFulfillments.find(
    (state) =>
      state.seller.toString() === sellerId.toString() &&
      state.scanToken === token,
  );
  const lastEvent = sellerState?.events?.at(-1);
  if (
    lastEvent?.source === "seller_scan" &&
    Date.now() - new Date(lastEvent.occurredAt).getTime() < 10_000
  ) {
    throw new HttpError(
      409,
      "This label was just scanned. Wait before scanning it again.",
    );
  }
  const nextStatus = nextScannedFulfillment(sellerState?.status);
  if (!nextStatus) {
    throw new HttpError(
      409,
      "This package has already completed its scan steps.",
    );
  }
  return updateOrder(
    sellerId,
    order._id,
    nextStatus,
    undefined,
    "seller_scan",
    undefined,
    undefined,
    location,
  );
}
async function listReturns(sellerId) {
  const ids = (
    await Product.find({ seller: sellerId }).select("_id").lean()
  ).map((p) => p._id.toString());
  if (!ids.length) return { returns: [] };
  const orders = await Order.find({ "items.productId": { $in: ids } })
    .select("code items")
    .lean();
  const codes = orders.map((order) => order.code);
  if (!codes.length) return { returns: [] };
  const entries = await ReturnRequest.find({ orderRef: { $in: codes } })
    .populate("customer", "name email")
    .sort({ requestedAt: -1 })
    .limit(200)
    .lean();
  const ownedItemByOrder = new Map(
    orders.map((order) => [
      order.code,
      order.items
        .filter((item) => ids.includes(item.productId))
        .map((item) => item.name),
    ]),
  );
  return {
    returns: entries
      .filter((entry) =>
        ownedItemByOrder
          .get(entry.orderRef)
          ?.some((name) => name.toLowerCase() === entry.item.toLowerCase()),
      )
      .map((entry) => ({
        id: entry._id.toString(),
        code: entry.code,
        orderRef: entry.orderRef,
        item: entry.item,
        reason: entry.reason,
        type: entry.type || "Return",
        status: entry.status,
        trackingStatus: entry.trackingStatus || entry.status,
        refund: entry.refund,
        requestedAt: entry.requestedAt,
        customer: entry.customer?.name || "Customer",
        email: entry.customer?.email || "",
        scanToken: entry.scanToken || "",
        events: (entry.trackingEvents || []).map((event) => ({
          status: event.status,
          occurredAt: event.occurredAt,
          location:
            event.location?.latitude == null ||
            event.location?.longitude == null
              ? null
              : {
                  latitude: event.location.latitude,
                  longitude: event.location.longitude,
                  label: event.location.label || "",
                },
        })),
      })),
  };
}
async function updateReturn(sellerId, id, status) {
  if (
    ![
      "Approved",
      "Rejected",
      "In transit",
      "Refunded",
      "Replacement Shipped",
    ].includes(status)
  ) {
    throw new HttpError(400, "Choose a valid return or replacement status.");
  }
  const { returns } = await listReturns(sellerId);
  if (!returns.some((entry) => entry.id === id))
    throw new HttpError(404, "Return request not found for this store.");
  const entry = await ReturnRequest.findById(id);
  if (["Refunded", "Rejected", "Cancelled"].includes(entry.status))
    throw new HttpError(409, "This return request is already closed.");
  if (
    entry.type === "Replacement" &&
    !["Approved", "Rejected", "Replacement Shipped"].includes(status)
  ) {
    throw new HttpError(400, "Replacement requests cannot be refunded.");
  }
  if (
    status === "Replacement Shipped" &&
    (entry.type !== "Replacement" || entry.status !== "Approved")
  ) {
    throw new HttpError(409, "Approve the replacement request before shipping it.");
  }
  if (status === "Refunded" && entry.trackingStatus !== "At Seller") {
    throw new HttpError(409, "Wait until the returned item is received by the seller before refunding.");
  }
  if (status === "Refunded") {
    if (!["Approved", "In transit"].includes(entry.status))
      throw new HttpError(
        409,
        "Approve the return request before issuing a refund.",
      );
    const productIds = (
      await Product.find({ seller: sellerId }).select("_id").lean()
    ).map((product) => product._id.toString());
    const order = await Order.findOne({
      code: entry.orderRef,
      "items.productId": { $in: productIds },
    });
    if (!order || !order.payment.paid)
      throw new HttpError(409, "A refund is available only for paid orders.");
    const lineItems = order.items.filter(
      (item) =>
        productIds.includes(item.productId) &&
        item.name.toLowerCase() === entry.item.toLowerCase(),
    );
    const gross = lineItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const sellerItems = order.items
      .filter((item) => productIds.includes(item.productId));
    const sellerRetailGross = sellerItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const sellerGross = sellerItems.reduce(
      (sum, item) =>
        sum + Number(item.sellerPrice ?? item.price) * item.quantity,
      0,
    );
    const retailDiscount =
      order.appliedDiscount?.seller?.toString() === sellerId.toString()
        ? Number(order.appliedDiscount.amount) || 0
        : 0;
    const sellerDiscount = sellerRetailGross
      ? (retailDiscount * sellerGross) / sellerRetailGross
      : 0;
    const lineDiscount = sellerRetailGross
      ? (retailDiscount * gross) / sellerRetailGross
      : 0;
    const lineSellerGross = lineItems.reduce(
      (sum, item) =>
        sum + Number(item.sellerPrice ?? item.price) * item.quantity,
      0,
    );
    const lineSellerDiscount = sellerGross
      ? (sellerDiscount * lineSellerGross) / sellerGross
      : 0;
    const currency = String(order.currency || "USD").toLowerCase();
    const minorUnitsPerMajor = stripeService.toMinorUnits(1, currency);
    const productRefundAmount = Math.min(
      stripeService.toMinorUnits(Math.max(0, gross - lineDiscount), currency) /
        minorUnitsPerMajor,
      Math.max(0, order.totals.total - (order.payment.refundedTotal || 0)),
    );
    const sellerState = order.sellerFulfillments?.find(
      (state) => state.seller?.toString() === sellerId.toString(),
    );
    const eligibleGross = Math.max(0, sellerGross - sellerDiscount);
    const sellerRefundTarget = Math.min(
      eligibleGross,
      productRefundAmount,
      Math.max(0, lineSellerGross - lineSellerDiscount),
    );
    const categoryMarkupRefund = Math.min(
      Math.max(
        0,
        Number(order.totals.categoryMarkup || 0) -
          Number(order.payment.categoryMarkupRefundedTotal || 0),
      ),
      Math.max(0, roundMoney(productRefundAmount - sellerRefundTarget)),
    );
    const returnedPlatformFee =
      sellerState?.platformFeePayer === "buyer" && eligibleGross > 0
        ? Math.round(
            Math.min(
              Math.max(
                0,
                (Number(order.totals.platformFee) || 0) -
                  (Number(order.payment.platformFeeRefundedTotal) || 0),
              ),
              Number(sellerState.platformFee || 0) *
                (productRefundAmount / eligibleGross),
            ) *
              100,
          ) / 100
        : 0;
    const amount = Math.min(
      productRefundAmount + returnedPlatformFee,
      Math.max(0, order.totals.total - (order.payment.refundedTotal || 0)),
    );
    if (!amount)
      throw new HttpError(
        409,
        "This order has no refundable balance remaining.",
      );
    if (order.payment.method === "Wallet") {
      const { refundWallet } = require("../customer/shop/service");
      await refundWallet(order.customer, amount, {
        description: `Refund for return ${entry.code}`,
        reference: entry.code,
      });
      order.payment.refundedTotal =
        Math.round(((order.payment.refundedTotal || 0) + amount) * 100) / 100;
      order.payment.sellerRefundedTotal =
        Math.round(
          ((order.payment.sellerRefundedTotal || 0) + sellerRefundTarget) *
            100,
        ) / 100;
      order.payment.categoryMarkupRefundedTotal =
        Math.round(
          ((order.payment.categoryMarkupRefundedTotal || 0) +
            categoryMarkupRefund) *
            100,
        ) / 100;
      if (sellerState?.platformFeePayer === "buyer") {
        order.payment.platformFeeRefundedTotal =
          Math.round(
            ((order.payment.platformFeeRefundedTotal || 0) + returnedPlatformFee) *
              100,
          ) / 100;
      }
      if (order.payment.refundedTotal >= order.totals.total) {
        order.payment.paid = false;
        order.payment.status = "refunded";
      } else {
        order.payment.status = "partially_refunded";
      }
      await order.save();
    } else if (order.payment.method === "Stripe") {
      const transfer = order.payment.transfers.find(
        (item) => item.seller.toString() === sellerId.toString(),
      );
      const returnReference = `return-${entry._id}`;
      let sellerRefundAmount =
        sellerState?.platformFeePayer === "buyer"
          ? sellerRefundTarget
          : calculateNetPayout(
              sellerRefundTarget,
              0,
              await getPlatformFeeRate(),
            );
      if (
        transfer?.status === "transferred" &&
        transfer.transferId &&
        eligibleGross
      ) {
        const reversalAmount =
          stripeService.toMinorUnits(
            (transfer.amount * sellerRefundTarget) / eligibleGross,
            currency,
          ) / minorUnitsPerMajor;
        let reversal = (transfer.reversals || []).find(
          (item) => item.reference === returnReference,
        );
        if (!reversal && reversalAmount > 0) {
          await stripeService.reverseSellerTransfer({
            order,
            transfer,
            amount: reversalAmount,
            reference: returnReference,
          });
          reversal = (transfer.reversals || []).find(
            (item) => item.reference === returnReference,
          );
        }
        sellerRefundAmount = reversal?.amount || 0;
      } else if (transfer?.status === "reversed") {
        sellerRefundAmount = 0;
      }
      await stripeService.refundPaymentIntent(
        order,
        amount,
        returnReference,
        sellerId,
        sellerRefundAmount,
      );
      order.payment.sellerRefundedTotal =
        Math.round(
          ((order.payment.sellerRefundedTotal || 0) + sellerRefundAmount) *
            100,
        ) / 100;
      order.payment.categoryMarkupRefundedTotal =
        Math.round(
          ((order.payment.categoryMarkupRefundedTotal || 0) +
            categoryMarkupRefund) *
            100,
        ) / 100;
      if (sellerState?.platformFeePayer === "buyer") {
        order.payment.platformFeeRefundedTotal =
          Math.round(
            ((order.payment.platformFeeRefundedTotal || 0) + returnedPlatformFee) *
              100,
          ) / 100;
      }
      await order.save();
    } else {
      throw new HttpError(
        409,
        "Refunds for this payment method must be issued by the payment provider.",
      );
    }
    entry.refund = amount;
  }
  entry.status = status;
  if (status === "Approved") {
    entry.trackingStatus =
      entry.type === "Replacement" ? "Replacement Preparing" : "Ready for Pickup";
  } else if (status === "Replacement Shipped") {
    entry.trackingStatus = "Ready for Pickup";
  } else if (status === "Rejected") {
    entry.trackingStatus = "Rejected";
  } else if (status === "Refunded") {
    entry.trackingStatus = "Refunded";
  }
  if (["Approved", "Rejected", "Replacement Shipped", "Refunded"].includes(status)) {
    entry.trackingEvents.push({
      status,
      source: "seller",
      occurredAt: new Date(),
    });
  }
  entry.timeline.push({
    label: status,
    date: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
    done: true,
  });
  await entry.save();
  return {
    id: entry._id.toString(),
    status: entry.status,
    trackingStatus: entry.trackingStatus,
    refund: entry.refund,
  };
}
async function listDiscounts(sellerId) {
  return {
    discounts: (
      await Discount.find({ seller: sellerId }).sort({ createdAt: -1 }).lean()
    ).map((d) => ({
      ...d,
      id: d._id.toString(),
      _id: undefined,
      seller: undefined,
    })),
  };
}
async function createDiscount(sellerId, body) {
  const code = String(body.code || "")
    .trim()
    .toUpperCase();
  const value = Number(body.value);
  if (
    !/^[A-Z0-9_-]{3,32}$/.test(code) ||
    !Number.isFinite(value) ||
    value <= 0 ||
    (body.type === "percentage" && value > 100) ||
    !["percentage", "fixed"].includes(body.type)
  )
    throw new HttpError(
      400,
      "Enter a valid coupon code, discount type, and value.",
    );
  return Discount.create({
    seller: sellerId,
    code,
    type: body.type,
    value,
    startsAt: body.startsAt || new Date(),
    endsAt: body.endsAt || null,
    usageLimit: Math.max(0, Number(body.usageLimit) || 0),
  });
}
async function updateDiscount(sellerId, id, body) {
  const d = await Discount.findOneAndUpdate(
    { _id: id, seller: sellerId },
    { $set: { active: Boolean(body.active) } },
    { new: true },
  ).lean();
  if (!d) throw new HttpError(404, "Discount not found.");
  return d;
}
async function deleteDiscount(sellerId, id) {
  const d = await Discount.findOneAndDelete({ _id: id, seller: sellerId });
  if (!d) throw new HttpError(404, "Discount not found.");
  return { id };
}
async function updateSettings(sellerId, body) {
  const allowed = [
    "lowStockThreshold",
    "shippingDays",
    "shippingFee",
    "taxRate",
    "returnWindowDays",
    "returnPolicy",
  ];
  const settings = {};
  for (const key of allowed)
    if (Object.hasOwn(body, key)) settings[`settings.${key}`] = body[key];
  if (body.notifications && typeof body.notifications === "object")
    for (const key of ["orders", "inventory", "payouts"])
      if (typeof body.notifications[key] === "boolean")
        settings[`settings.notifications.${key}`] = body.notifications[key];
  if (body.storeName !== undefined)
    settings.storeName = String(body.storeName).trim().slice(0, 120);
  if (body.name !== undefined)
    settings.name = String(body.name).trim().slice(0, 80);
  if (body.address !== undefined)
    settings.address = String(body.address).trim().slice(0, 1000);
  if (body.taxId !== undefined)
    settings.taxId = String(body.taxId).trim().slice(0, 40);
  if (Array.isArray(body.sellCategories))
    settings.sellCategories = body.sellCategories
      .map((c) => String(c).trim())
      .filter(Boolean)
      .slice(0, 50);
  const seller = await Seller.findByIdAndUpdate(
    sellerId,
    { $set: settings },
    { new: true, runValidators: true },
  )
    .select("-passwordHash")
    .lean();
  return seller;
}
async function getPayoutSummary(sellerId) {
  const ids = (
    await Product.find({ seller: sellerId }).select("_id").lean()
  ).map((p) => p._id.toString());
  const orders = ids.length
    ? await Order.find({
        "items.productId": { $in: ids },
        $or: [
          { "payment.paid": true },
          { "payment.refundedTotal": { $gt: 0 } },
        ],
      })
        .select(
          "items productId status sellerFulfillment sellerFulfillments payment.method payment.refundedTotal payment.sellerRefundedTotal payment.transfers placedAt code currency appliedDiscount",
        )
        .lean()
    : [];
  let availableGross = 0;
  let onHoldGross = 0;
  let refunds = 0;
  let grossSales = 0;
  let fees = 0;
  const currentFeeRate = await getPlatformFeeRate();
  for (const order of orders) {
    const sellerItems = order.items.filter((item) => ids.includes(item.productId));
    const retailGross = sellerItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const gross = sellerItems
      .reduce(
        (sum, item) =>
          sum + Number(item.sellerPrice ?? item.price) * item.quantity,
        0,
      );
    const retailDiscount =
      order.appliedDiscount?.seller?.toString() === sellerId.toString()
        ? Number(order.appliedDiscount.amount) || 0
        : 0;
    const discount = retailGross
      ? (retailDiscount * gross) / retailGross
      : 0;
    const amount = Math.max(0, gross - discount);
    const sellerState = order.sellerFulfillments?.find(
      (state) => state.seller?.toString() === sellerId.toString(),
    );
    const commissionableAmount = Number.isFinite(
      sellerState?.commissionableAmount,
    )
      ? sellerState.commissionableAmount
      : amount;
    const feeRate = Number.isFinite(sellerState?.platformFeeRate)
      ? sellerState.platformFeeRate
      : currentFeeRate;
    const platformFee = Number.isFinite(sellerState?.platformFee)
      ? sellerState.platformFee
      : calculatePlatformFee(commissionableAmount, feeRate);
    grossSales += amount;
    const sellerTransfer = (order.payment?.transfers || []).find(
      (transfer) => transfer.seller.toString() === sellerId.toString(),
    );
    const recordedSellerRefund =
      order.payment?.sellerRefundedTotal ?? order.payment?.refundedTotal ?? 0;
    const refund = Math.min(
      amount,
      order.payment?.method === "Stripe" &&
        Number.isFinite(sellerTransfer?.refundedAmount)
        ? sellerTransfer.refundedAmount
        : recordedSellerRefund,
    );
    refunds += refund;
    const net = Math.max(0, amount - refund);
    const retainedFee =
      sellerState?.platformFeePayer === "buyer"
        ? 0
        : amount > 0
        ? Math.max(0, platformFee * (1 - Math.min(1, refund / amount)))
        : 0;
    const sellerNet = Math.max(0, net - retainedFee);
    const state = fulfillmentFor(order, sellerId);
    if (order.status === "Cancelled" || state === "Cancelled") continue;
    fees += retainedFee;
    if (order.status === "Delivered" || state === "Delivered") {
      if (order.payment?.method !== "Stripe") {
        availableGross += sellerNet;
      }
    } else {
      onHoldGross += sellerNet;
    }
  }
  const history = orders
    .flatMap((order) =>
      (order.payment?.transfers || [])
        .filter(
          (transfer) => transfer.seller.toString() === sellerId.toString(),
        )
        .filter((transfer) => transfer.transferId)
        .map((transfer) => ({
          id: transfer.transferId,
          code: order.code,
          date: order.placedAt,
          status: transfer.status === "reversed" ? "Reversed" : "Transferred",
          amount:
            transfer.status === "reversed" ? -transfer.amount : transfer.amount,
          currency: order.currency,
        })),
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20);
  return {
    gross: Math.round(grossSales * 100) / 100,
    refunds: Math.round(refunds * 100) / 100,
    fees: Math.round(fees * 100) / 100,
    available: Math.round(availableGross * 100) / 100,
    onHold: Math.round(onHoldGross * 100) / 100,
    history,
  };
}
async function getStripeConnectStatus(sellerId) {
  const seller = await Seller.findById(sellerId)
    .select("stripeAccountId")
    .lean();
  if (!seller) throw new HttpError(404, "Seller account not found.");
  return stripeService.getSellerConnectStatus(seller);
}
async function createStripeConnectLink(sellerId, origin) {
  const seller = await Seller.findById(sellerId);
  if (!seller) throw new HttpError(404, "Seller account not found.");
  return stripeService.createSellerAccountLink(seller, origin);
}

async function publicCatalog(query = {}) {
  await categoryService.ensureInitialized();
  const categoryRates = new Map(
    (await categoryService.listCategories({ includeMarkup: true })).map(
      (category) => [
        category.name.toLowerCase(),
        category.active ? category.markupPercent : 0,
      ],
    ),
  );
  const country = getCountry(query.country);
  if (!country)
    throw new HttpError(
      400,
      "Choose a valid country to browse the marketplace.",
    );
  const approvedSellers = await Seller.find({
    country: country.code,
    $or: [
      { adminStatus: "Approved" },
      { adminStatus: { $exists: false }, verified: true },
    ],
  }).distinct("_id");
  if (!approvedSellers.length) {
    return {
      products: [],
      total: 0,
      page: 1,
      pageSize: 24,
      brands: [],
      categories: [],
      fitments: [],
    };
  }
  const filter = {
    seller: { $in: approvedSellers },
    status: "Active",
    stock: { $gt: 0 },
  };
  const searchTerms = String(query.q || "")
    .trim()
    .slice(0, 80)
    .split(/\s+/)
    .filter(Boolean);
  const searchAnyTerms = String(query.searchAny || "")
    .split(",")
    .map((term) => term.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 20);
  const searchableFields = [
    "name",
    "sku",
    "partNumber",
    "brand",
    "category",
    "fitment",
    "fitments.make",
    "fitments.model",
    "fitments.trim",
    "fitments.engine",
    "description",
  ];
  const searchConditions = searchTerms.map((term) => ({
    $or: searchableFields.map((field) => ({
      [field]: { $regex: escapeRegex(term), $options: "i" },
    })),
  }));
  const vehicleYear = Number(query.year);
  const vehicleMake = String(query.make || "").trim().slice(0, 80);
  const vehicleModel = String(query.model || "").trim().slice(0, 100);
  const vehicleTrim = String(query.trim || "").trim().slice(0, 80);
  const vehicleEngine = String(query.engine || "").trim().slice(0, 80);
  if (vehicleMake && vehicleModel) {
    const structuredFitment = {
      make: { $regex: `^${escapeRegex(vehicleMake)}$`, $options: "i" },
      model: { $regex: `^${escapeRegex(vehicleModel)}$`, $options: "i" },
    };
    if (vehicleYear >= 1900 && vehicleYear <= 2100) {
      structuredFitment.$and = [
        { $or: [{ yearFrom: null }, { yearFrom: { $lte: vehicleYear } }] },
        { $or: [{ yearTo: null }, { yearTo: { $gte: vehicleYear } }] },
      ];
    }
    if (vehicleTrim) structuredFitment.trim = { $regex: escapeRegex(vehicleTrim), $options: "i" };
    if (vehicleEngine) structuredFitment.engine = { $regex: escapeRegex(vehicleEngine), $options: "i" };
    const legacyPattern = [vehicleYear >= 1900 && vehicleYear <= 2100 ? String(vehicleYear) : "", vehicleMake, vehicleModel].filter(Boolean).map((term) => `(?=.*${escapeRegex(term)})`).join("") + ".*";
    searchConditions.push({ $or: [{ fitments: { $elemMatch: structuredFitment } }, { fitment: { $regex: legacyPattern, $options: "i" } }] });
  }
  if (searchAnyTerms.length) {
    searchConditions.push({
      $or: searchAnyTerms.flatMap((term) =>
        searchableFields.map((field) => ({
          [field]: { $regex: escapeRegex(term), $options: "i" },
        })),
      ),
    });
  }
  if (searchConditions.length) filter.$and = searchConditions;
  const brands = String(query.brand || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const categories = String(query.category || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (brands.length) filter.brand = { $in: brands };
  if (categories.length) filter.category = { $in: categories };
  if (["New", "Refurbished", "Used"].includes(query.condition)) {
    if (query.condition === "New") {
      filter.$or = [{ condition: "New" }, { condition: { $exists: false } }];
    } else {
      filter.condition = query.condition;
    }
  }

  const minimum =
    query.minPrice === undefined ? undefined : Number(query.minPrice);
  const maximum =
    query.maxPrice === undefined ? undefined : Number(query.maxPrice);
  if (
    (minimum !== undefined && (!Number.isFinite(minimum) || minimum < 0)) ||
    (maximum !== undefined && (!Number.isFinite(maximum) || maximum < 0)) ||
    (minimum !== undefined && maximum !== undefined && maximum < minimum)
  ) {
    throw new HttpError(400, "Enter a valid product price range.");
  }
  if (minimum !== undefined || maximum !== undefined) {
    filter.storefrontPrice = {};
    if (minimum !== undefined) filter.storefrontPrice.$gte = minimum;
    if (maximum !== undefined) filter.storefrontPrice.$lte = maximum;
  }

  const requestedPage = Number(query.page || 1);
  const requestedPageSize = Number(query.pageSize || 24);
  if (!Number.isInteger(requestedPage) || requestedPage < 1) {
    throw new HttpError(400, "Choose a valid product page.");
  }
  if (
    !Number.isInteger(requestedPageSize) ||
    requestedPageSize < 1 ||
    requestedPageSize > 100
  ) {
    throw new HttpError(400, "Choose a product page size between 1 and 100.");
  }
  const sortOrders = {
    featured: { createdAt: -1 },
    popular: { soldCount: -1, viewCount: -1, createdAt: -1 },
    "best-selling": { soldCount: -1, createdAt: -1 },
    "top-rated": {
      ratingAverage: -1,
      ratingCount: -1,
      soldCount: -1,
      createdAt: -1,
    },
    "price-low": { storefrontPrice: 1, createdAt: -1 },
    "price-high": { storefrontPrice: -1, createdAt: -1 },
    name: { name: 1 },
  };
  const sortKey = query.sort || "featured";
  if (!Object.hasOwn(sortOrders, sortKey)) {
    throw new HttpError(400, "Choose a valid product sort order.");
  }
  const sortBy = sortOrders[sortKey];

  const topRatedCatalog =
    sortKey === "top-rated"
      ? Product.aggregate([
          { $match: filter },
          {
            $lookup: {
              from: Review.collection.name,
              localField: "_id",
              foreignField: "product",
              as: "productReviews",
            },
          },
          {
            $set: {
              ratingCount: { $size: "$productReviews" },
              ratingAverage: { $avg: "$productReviews.rating" },
            },
          },
          // Keep reviewed products at the top (their ratingAverage/ratingCount
          // are set, everything else stays null/0 and sorts last) but still
          // return the remaining products so the section is never empty while a
          // marketplace has no verified-purchase reviews yet.
          {
            $facet: {
              products: [
                {
                  $sort: {
                    ratingAverage: -1,
                    ratingCount: -1,
                    soldCount: -1,
                    createdAt: -1,
                  },
                },
                { $skip: (requestedPage - 1) * requestedPageSize },
                { $limit: requestedPageSize },
                {
                  $lookup: {
                    from: Seller.collection.name,
                    localField: "seller",
                    foreignField: "_id",
                    pipeline: [
                      {
                        $project: {
                          storeName: 1,
                          country: 1,
                          "settings.currency": 1,
                          "settings.shippingDays": 1,
                        },
                      },
                    ],
                    as: "sellerInfo",
                  },
                },
                {
                  $set: {
                    sellerInfo: { $arrayElemAt: ["$sellerInfo", 0] },
                  },
                },
                { $project: { productReviews: 0 } },
              ],
              totals: [{ $count: "count" }],
            },
          },
        ]).then(([result]) => ({
          products: result?.products || [],
          total: result?.totals?.[0]?.count || 0,
        }))
      : null;

  const [
    catalogTotal,
    availableBrands,
    availableCategories,
    availableFitments,
    rows,
    rated,
  ] = await Promise.all([
    sortKey === "top-rated"
      ? Promise.resolve(null)
      : Product.countDocuments(filter),
    Product.distinct("brand", {
      seller: { $in: approvedSellers },
      status: "Active",
      stock: { $gt: 0 },
      brand: { $type: "string", $ne: "" },
    }),
    Product.distinct("category", {
      seller: { $in: approvedSellers },
      status: "Active",
      stock: { $gt: 0 },
      category: { $type: "string", $ne: "" },
    }),
    Product.distinct("fitment", {
      seller: { $in: approvedSellers },
      status: "Active",
      stock: { $gt: 0 },
      fitment: { $type: "string", $ne: "" },
    }),
    sortKey === "top-rated"
      ? Promise.resolve([])
      : Product.find(filter)
          .select("+storefrontPrice +storefrontCompareAtPrice")
          .populate(
            "seller",
            "storeName country settings.currency settings.shippingDays settings.returnWindowDays settings.returnPolicy",
          )
          .sort(sortBy)
          .skip((requestedPage - 1) * requestedPageSize)
          .limit(requestedPageSize)
          .lean(),
    topRatedCatalog || Promise.resolve(null),
  ]);
  const total = rated?.total ?? catalogTotal;
  const catalogRows = rated?.products || rows;
  const catalogRatingRows = catalogRows.length
    ? await Review.aggregate([
        { $match: { product: { $in: catalogRows.map((product) => product._id) } } },
        { $group: { _id: "$product", ratingAverage: { $avg: "$rating" }, ratingCount: { $sum: 1 } } },
      ])
    : [];
  const catalogRatings = new Map(
    catalogRatingRows.map((row) => [row._id.toString(), row]),
  );
  return {
    products: catalogRows.map((product) => {
      const { sellerInfo, ...productData } = product;
      const seller = sellerInfo || product.seller;
      const rating = catalogRatings.get(product._id.toString());
      return {
        ...serializeProduct(
          categoryService.applyStorefrontPrices(
            productData,
            categoryRates.get(String(productData.category || "").toLowerCase()) || 0,
          ),
        ),
        ratingAverage: rating ? Math.round(rating.ratingAverage * 100) / 100 : 0,
        ratingCount: rating?.ratingCount || 0,
        country: seller?.country || country.code,
        currency: seller?.settings?.currency || country.currency,
        storeName: seller?.storeName || "AcquireAuto seller",
        shippingDays: seller?.settings?.shippingDays || 3,
        returnWindowDays: seller?.settings?.returnWindowDays ?? 30,
        returnPolicy: seller?.settings?.returnPolicy || "",
      };
    }),
    total,
    page: requestedPage,
    pageSize: requestedPageSize,
    brands: availableBrands
      .filter((brand) => typeof brand === "string" && brand.trim())
      .sort((a, b) => a.localeCompare(b)),
    categories: availableCategories
      .filter((category) => typeof category === "string" && category.trim())
      .sort((a, b) => a.localeCompare(b)),
    fitments: availableFitments
      .filter((fitment) => typeof fitment === "string" && fitment.trim())
      .sort((a, b) => a.localeCompare(b)),
  };
}
async function publicProduct(id, requestedCountry) {
  await categoryService.ensureInitialized();
  const country = getCountry(requestedCountry);
  if (!country)
    throw new HttpError(
      400,
      "Choose a valid country to browse the marketplace.",
    );
  const approvedSellers = await Seller.find({
    country: country.code,
    $or: [
      { adminStatus: "Approved" },
      { adminStatus: { $exists: false }, verified: true },
    ],
  }).distinct("_id");
  const product = approvedSellers.length
    ? await Product.findOneAndUpdate(
        {
          _id: id,
          seller: { $in: approvedSellers },
          status: "Active",
          stock: { $gt: 0 },
        },
        { $inc: { viewCount: 1 } },
        { new: true },
      )
        .select("+storefrontPrice +storefrontCompareAtPrice")
        .populate(
          "seller",
          "storeName country settings.currency settings.shippingDays settings.returnWindowDays settings.returnPolicy",
        )
        .lean()
    : null;
  if (!product) return null;
  const sellerTrust = await getPublicSellerTrust(product.seller);
  const category = await categoryService.listCategories({ includeMarkup: true });
  const markupPercent =
    category.find(
      (entry) => entry.name.toLowerCase() === String(product.category || "").toLowerCase(),
    )?.markupPercent || 0;
  const [productRating] = await Review.aggregate([
    { $match: { product: product._id } },
    { $group: { _id: null, ratingAverage: { $avg: "$rating" }, ratingCount: { $sum: 1 } } },
  ]);
  return {
        ...serializeProduct(
          categoryService.applyStorefrontPrices(product, markupPercent),
        ),
        country: product.seller?.country || country.code,
        currency: product.seller?.settings?.currency || country.currency,
        storeName: product.seller?.storeName || "AcquireAuto seller",
        shippingDays: product.seller?.settings?.shippingDays || 3,
        returnWindowDays: product.seller?.settings?.returnWindowDays ?? 30,
        returnPolicy: product.seller?.settings?.returnPolicy || "",
        ratingAverage: productRating ? Math.round(productRating.ratingAverage * 100) / 100 : 0,
        ratingCount: productRating?.ratingCount || 0,
        sellerTrust,
      };
}

async function getPublicSellerTrust(seller) {
  if (!seller?._id) return null;
  const products = await Product.find({ seller: seller._id, status: "Active" }).select("_id").lean();
  const productIds = products.map((product) => product._id);
  const [ratingRows, orders] = await Promise.all([
    productIds.length ? Review.aggregate([
      { $match: { product: { $in: productIds } } },
      { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]) : Promise.resolve([]),
    productIds.length ? Order.find({ "items.productId": { $in: productIds.map(String) } })
      .select("code placedAt sellerFulfillments status")
      .lean() : Promise.resolve([]),
  ]);
  const sellerId = seller._id.toString();
  let delivered = 0;
  let cancelled = 0;
  for (const order of orders) {
    const fulfillment = (order.sellerFulfillments || []).find((item) => item.seller?.toString() === sellerId);
    if (fulfillment?.status === "Delivered" || (!fulfillment && order.status === "Delivered")) delivered += 1;
    if (fulfillment?.status === "Cancelled" || (!fulfillment && order.status === "Cancelled")) cancelled += 1;
  }
  const codes = orders.map((order) => order.code).filter(Boolean);
  const returnCount = codes.length ? await ReturnRequest.countDocuments({ orderRef: { $in: codes } }) : 0;
  const reviews = ratingRows[0];
  return {
    verified: seller.adminStatus === "Approved" || (!seller.adminStatus && seller.verified),
    ratingAverage: reviews ? Math.round(reviews.average * 100) / 100 : 0,
    reviewCount: reviews?.count || 0,
    completedOrders: delivered,
    cancelledOrders: cancelled,
    returnRequests: returnCount,
    memberSince: seller.createdAt || null,
  };
}

async function submitIdentityDocument(sellerId, metadata, file) {
  const seller = await Seller.findById(sellerId).select(
    "+identityVerification.documentKey",
  );
  if (!seller) throw new HttpError(404, "Seller account not found.");
  const existingCountry = getCountry(seller.country);
  const submittedCountry = getCountry(metadata.country);
  if (
    existingCountry &&
    submittedCountry &&
    existingCountry.code !== submittedCountry.code
  ) {
    throw new HttpError(
      400,
      "The identity document country must match your seller account country.",
    );
  }
  const country = existingCountry || submittedCountry;
  const documentType = String(
    metadata.documentType || seller.identityVerification?.documentType || "",
  ).trim();
  const documentNumber = String(metadata.documentNumber || "").trim();
  if (
    !country ||
    !getIdentityDocumentTypes(country.code).includes(documentType) ||
    documentNumber.length < 3 ||
    documentNumber.length > 120
  ) {
    throw new HttpError(
      400,
      "Choose a valid identity document type and enter its number.",
    );
  }
  const key = await verificationStorage.storeDocument(sellerId, file);
  const oldKey = seller.identityVerification?.documentKey;
  if (!existingCountry) {
    seller.country = country.code;
    seller.settings ||= {};
    seller.settings.currency = country.currency;
  }
  seller.identityVerification = {
    ...seller.identityVerification.toObject(),
    status: "Pending",
    documentType,
    documentNumberEncrypted: encryptValue(documentNumber),
    documentKey: key,
    contentType: file.contentType,
    submittedAt: new Date(),
    reviewedAt: null,
    reviewedBy: "",
    reviewNote: "",
  };
  try {
    await seller.save();
  } catch (error) {
    await verificationStorage.deleteDocument(key).catch((cleanupError) => {
      console.error(
        "Could not clean up an unlinked seller ID document:",
        cleanupError.message,
      );
    });
    throw error;
  }
  if (oldKey) {
    try {
      await verificationStorage.deleteDocument(oldKey);
    } catch (error) {
      console.error(
        "Could not delete the previous seller ID document from S3:",
        {
          code: error?.Code || error?.code || error?.name || "UnknownError",
          requestId: error?.$metadata?.requestId || null,
        },
      );
    }
  }
  return {
    status: seller.identityVerification.status,
    submittedAt: seller.identityVerification.submittedAt,
    country: seller.country,
    currency: seller.settings.currency,
  };
}

async function submitSignatureDocument(sellerId, file) {
  const seller = await Seller.findById(sellerId).select(
    "+identityVerification.signatureKey",
  );
  if (!seller) throw new HttpError(404, "Seller account not found.");
  const key = await verificationStorage.storeDocument(sellerId, file);
  const oldKey = seller.identityVerification?.signatureKey;
  seller.identityVerification = {
    ...seller.identityVerification.toObject(),
    signatureStatus: "Pending",
    signatureKey: key,
    signatureContentType: file.contentType,
    signatureSubmittedAt: new Date(),
  };
  try {
    await seller.save();
  } catch (error) {
    await verificationStorage.deleteDocument(key).catch((cleanupError) => {
      console.error(
        "Could not clean up an unlinked seller signature document:",
        cleanupError.message,
      );
    });
    throw error;
  }
  if (oldKey) {
    try {
      await verificationStorage.deleteDocument(oldKey);
    } catch (error) {
      console.error(
        "Could not delete the previous seller signature document from S3:",
        {
          code: error?.Code || error?.code || error?.name || "UnknownError",
          requestId: error?.$metadata?.requestId || null,
        },
      );
    }
  }
  return {
    signatureStatus: seller.identityVerification.signatureStatus,
    signatureSubmittedAt: seller.identityVerification.signatureSubmittedAt,
  };
}

module.exports = {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getDashboard,
  getPayoutSummary,
  getStripeConnectStatus,
  createStripeConnectLink,
  publicCatalog,
  publicProduct,
  listOrders,
  updateOrder,
  scanOrder,
  nextScannedFulfillment,
  listReturns,
  updateReturn,
  listDiscounts,
  createDiscount,
  deleteDiscount,
  updateSettings,
  submitIdentityDocument,
  submitSignatureDocument,
};
