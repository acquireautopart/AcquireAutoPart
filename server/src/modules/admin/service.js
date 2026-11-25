const crypto = require("crypto");
const mongoose = require("mongoose");
const Seller = require("../seller/models/Seller");
const Product = require("../seller/models/Product");
const Customer = require("../customer/models/Customer");
const Order = require("../customer/models/Order");
const ReturnRequest = require("../customer/models/ReturnRequest");
const SupportTicket = require("../customer/models/SupportTicket");
const AuditLog = require("./models/AuditLog");
const AdminSetting = require("./models/AdminSetting");
const Category = require("./models/Category");
const categoryService = require("./categoryService");
const HttpError = require("../../utils/HttpError");
const { decryptValue } = require("../../utils/encryption");
const verificationStorage = require("../seller/verificationStorage");
const deliveryService = require("../delivery/service");

const round = (n) => Math.round((Number(n) || 0) * 100) / 100;
const months = (days) => Math.max(7, Math.min(90, Number(days) || 30));

async function login({ email, password } = {}) {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredEmail || !configuredPassword)
    throw new HttpError(
      503,
      "Admin access is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in the API environment.",
    );
  const candidate = String(email || "")
    .trim()
    .toLowerCase();
  const stored = Buffer.from(configuredPassword);
  const supplied = Buffer.from(String(password || ""));
  const matches =
    stored.length === supplied.length &&
    crypto.timingSafeEqual(stored, supplied);
  if (candidate !== configuredEmail || !matches) return null;
  return {
    email: configuredEmail,
    name: process.env.ADMIN_NAME || "Marketplace administrator",
    role: "Super admin",
  };
}

async function record(admin, action, entityType, entityId, summary) {
  await AuditLog.create({
    adminEmail: admin.email,
    action,
    entityType,
    entityId: String(entityId || ""),
    summary,
  });
}

function orderCommission(order, fallbackRate) {
  const savedSellerFees = (order.sellerFulfillments || []).filter((entry) =>
    Number.isFinite(entry.platformFeeRate),
  );
  const platformFees = Number.isFinite(order.totals?.platformFee)
    ? Number(order.totals.platformFee)
    : savedSellerFees.length
    ? savedSellerFees.reduce(
      (sum, entry) => sum + (Number(entry.platformFee) || 0),
      0,
    )
    : Math.round(
        Math.max(
          0,
          (Number(order.totals?.subtotal) || 0) -
            (Number(order.appliedDiscount?.amount) || 0),
        ) *
          fallbackRate,
      ) / 100;
  return Math.max(
    0,
    platformFees -
      (Number(order.payment?.platformFeeRefundedTotal) || 0) +
      (Number(order.totals?.categoryMarkup) || 0) -
      (Number(order.payment?.categoryMarkupRefundedTotal) || 0),
  );
}

async function dashboard({ days = 30 } = {}) {
  const span = months(days);
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - span + 1);
  start.setHours(0, 0, 0, 0);
  const previous = new Date(start);
  previous.setDate(previous.getDate() - span);
  const [
    salesOrders,
    totalOrders,
    customers,
    activeSellers,
    pendingSellers,
    pendingReturns,
    openTickets,
    flagged,
    settings,
    sellers,
    products,
    audit,
  ] = await Promise.all([
    Order.find({ placedAt: { $gte: previous } })
      .sort({ placedAt: -1 })
      .limit(6000)
      .lean(),
    Order.countDocuments(),
    Customer.countDocuments(),
    Seller.countDocuments({ adminStatus: "Approved" }),
    Seller.countDocuments({
      $or: [
        { adminStatus: "Pending" },
        { adminStatus: { $exists: false }, verified: false },
      ],
    }),
    ReturnRequest.countDocuments({
      status: { $in: ["Requested", "In transit"] },
    }),
    SupportTicket.countDocuments({ status: { $in: ["Open", "In progress"] } }),
    Product.countDocuments({ moderationStatus: "Flagged" }),
    AdminSetting.findOne({ key: "marketplace" }).lean(),
    Seller.find()
      .select("storeName name email verified adminStatus createdAt")
      .lean(),
    Product.find()
      .select("seller name category sku price soldCount moderationStatus")
      .lean(),
    AuditLog.find().sort({ createdAt: -1 }).limit(8).lean(),
  ]);
  const chosen = salesOrders.filter(
    (order) => new Date(order.placedAt) >= start,
  );
  const gross = chosen
    .filter((order) => order.status !== "Cancelled")
    .reduce((sum, order) => sum + order.totals.total, 0);
  const previousGross = salesOrders
    .filter(
      (order) =>
        new Date(order.placedAt) >= previous &&
        new Date(order.placedAt) < start &&
        order.status !== "Cancelled",
    )
    .reduce((sum, order) => sum + order.totals.total, 0);
  const feeRate =
    Number(settings?.platformFeeRate ?? process.env.SELLER_PLATFORM_FEE_RATE) ||
    0;
  const commission = chosen
    .filter((order) => order.payment?.paid)
    .reduce((sum, order) => sum + orderCommission(order, feeRate), 0);
  const sales = Array.from({ length: span }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    const amount = chosen
      .filter(
        (order) =>
          new Date(order.placedAt).toISOString().slice(0, 10) === key &&
          order.status !== "Cancelled",
      )
      .reduce((sum, order) => sum + order.totals.total, 0);
    return { date: key, amount: round(amount) };
  });
  const sellerById = new Map(
    sellers.map((seller) => [seller._id.toString(), seller]),
  );
  const sellerForProduct = new Map(
    products.map((product) => [
      product._id.toString(),
      product.seller.toString(),
    ]),
  );
  const sellerSales = new Map();
  for (const order of chosen)
    for (const item of order.items) {
      const sellerId = sellerForProduct.get(item.productId);
      if (!sellerId) continue;
      const row = sellerSales.get(sellerId) || { orders: new Set(), gmv: 0 };
      row.orders.add(order._id.toString());
      row.gmv += item.price * item.quantity;
      sellerSales.set(sellerId, row);
    }
  const topSellers = [...sellerSales]
    .map(([id, salesRow]) => ({
      id,
      name: sellerById.get(id)?.storeName || "Store",
      orders: salesRow.orders.size,
      gmv: round(salesRow.gmv),
      status:
        sellerById.get(id)?.adminStatus ||
        (sellerById.get(id)?.verified ? "Approved" : "Pending"),
    }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 8);
  const categories = new Map();
  for (const product of products) {
    const amount = chosen
      .flatMap((order) => order.items)
      .filter((item) => item.productId === product._id.toString())
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (amount)
      categories.set(
        product.category || "Other",
        (categories.get(product.category || "Other") || 0) + amount,
      );
  }
  const categoryTotal =
    [...categories.values()].reduce((a, b) => a + b, 0) || 1;
  const applicationRows = await Seller.find({
    $or: [
      { adminStatus: "Pending" },
      { adminStatus: { $exists: false }, verified: false },
    ],
  })
    .select("storeName name email createdAt")
    .sort({ createdAt: 1 })
    .limit(6)
    .lean();
  return {
    metrics: {
      grossSales: round(gross),
      previousGrossSales: round(previousGross),
      changePercent: previousGross
        ? round(((gross - previousGross) / previousGross) * 100)
        : 0,
      orders: totalOrders,
      commissionEarned: round(commission),
      customers,
      activeSellers,
      awaitingApproval: pendingSellers,
      openDisputes: pendingReturns,
      supportTickets: openTickets,
      flaggedListings: flagged,
    },
    sales,
    sellerApprovals: applicationRows.map((s) => ({
      id: s._id.toString(),
      storeName: s.storeName,
      name: s.name,
      email: s.email,
      appliedAt: s.createdAt,
    })),
    topSellers,
    categories: [...categories]
      .map(([name, amount]) => ({
        name,
        amount: round(amount),
        percent: round((amount / categoryTotal) * 100),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6),
    recentActivity: audit.map((entry) => ({
      id: entry._id.toString(),
      action: entry.summary,
      createdAt: entry.createdAt,
    })),
    system: {
      api: "Operational",
      database: "Operational",
      storefront: settings?.maintenanceMode ? "Maintenance" : "Operational",
      payments: "Not connected",
      email: "Not connected",
    },
  };
}

async function listSellers(query = {}) {
  const rows = await Seller.find()
    .select(
      "storeName name email country verified adminStatus settings identityVerification.status identityVerification.documentType identityVerification.submittedAt createdAt",
    )
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  const q = String(query.q || "").toLowerCase();
  return {
    sellers: rows
      .filter(
        (s) =>
          !q ||
          `${s.storeName} ${s.name} ${s.email} ${s.country || ""}`
            .toLowerCase()
            .includes(q),
      )
      .map((s) => ({
        id: s._id.toString(),
        storeName: s.storeName,
        name: s.name,
        email: s.email,
        country: s.country || "",
        currency: s.settings?.currency || "USD",
        verificationStatus: s.identityVerification?.status || "Not submitted",
        documentType: s.identityVerification?.documentType || "",
        documentSubmittedAt: s.identityVerification?.submittedAt || null,
        verified: s.verified,
        status: s.adminStatus || (s.verified ? "Approved" : "Pending"),
        createdAt: s.createdAt,
      })),
  };
}

async function updateSeller(admin, id, status) {
  if (!["Approved", "Rejected", "Suspended", "Pending"].includes(status))
    throw new HttpError(400, "Choose a valid seller status.");
  if (status === "Approved") {
    const applicant = await Seller.findById(id).select(
      "identityVerification.status",
    );
    if (!applicant) throw new HttpError(404, "Seller not found.");
    if (applicant.identityVerification?.status !== "Approved")
      throw new HttpError(
        409,
        "Review and approve the seller's identity document before approving the account.",
      );
  }
  const seller = await Seller.findByIdAndUpdate(
    id,
    { $set: { adminStatus: status, verified: status === "Approved" } },
    { new: true, runValidators: true },
  ).select("storeName name adminStatus verified");
  if (!seller) throw new HttpError(404, "Seller not found.");
  await record(
    admin,
    `seller.${status.toLowerCase()}`,
    "seller",
    id,
    `${seller.storeName} was ${status.toLowerCase()}.`,
  );
  return {
    id: seller._id.toString(),
    status: seller.adminStatus,
    verified: seller.verified,
  };
}

async function getSellerVerification(admin, id) {
  const seller = await Seller.findById(id)
    .select(
      "+identityVerification.documentKey +identityVerification.documentNumberEncrypted",
    )
    .lean();
  if (!seller) throw new HttpError(404, "Seller not found.");
  const verification = seller.identityVerification || {};
  const number = decryptValue(verification.documentNumberEncrypted);
  const documentUrl = verification.documentKey
    ? await verificationStorage.createReviewUrl(verification.documentKey)
    : "";
  await record(
    admin,
    "seller.identity_document.viewed",
    "seller",
    id,
    `Identity document for ${seller.storeName} was opened for review.`,
  );
  return {
    seller: {
      id: seller._id.toString(),
      storeName: seller.storeName,
      country: seller.country || "",
      name: seller.name,
    },
    verification: {
      status: verification.status || "Not submitted",
      documentType: verification.documentType || "",
      maskedDocumentNumber: number
        ? `${"*".repeat(Math.max(0, number.length - 4))}${number.slice(-4)}`
        : "",
      submittedAt: verification.submittedAt || null,
      reviewNote: verification.reviewNote || "",
      documentUrl,
    },
  };
}

async function reviewSellerVerification(admin, id, status, note = "") {
  if (!["Approved", "Rejected"].includes(status))
    throw new HttpError(
      400,
      "Choose Approved or Rejected for the identity review.",
    );
  const seller = await Seller.findById(id).select(
    "+identityVerification.documentKey",
  );
  if (!seller) throw new HttpError(404, "Seller not found.");
  if (
    !seller.identityVerification?.documentKey ||
    !seller.identityVerification.submittedAt
  ) {
    throw new HttpError(
      409,
      "The seller has not submitted an identity document.",
    );
  }
  seller.identityVerification.status = status;
  seller.identityVerification.reviewedAt = new Date();
  seller.identityVerification.reviewedBy = admin.email;
  seller.identityVerification.reviewNote = String(note).trim().slice(0, 500);
  seller.adminStatus = status === "Approved" ? "Approved" : "Rejected";
  seller.verified = status === "Approved";
  await seller.save();
  await record(
    admin,
    `seller.identity.${status.toLowerCase()}`,
    "seller",
    id,
    `Identity for ${seller.storeName} was ${status.toLowerCase()}.`,
  );
  return {
    id: seller._id.toString(),
    verificationStatus: status,
    status: seller.adminStatus,
    verified: seller.verified,
  };
}

async function listProducts(query = {}) {
  const rows = await Product.find()
    .populate("seller", "storeName email")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  const q = String(query.q || "").toLowerCase();
  return {
    products: rows
      .filter(
        (p) =>
          !q ||
          `${p.name} ${p.sku} ${p.seller?.storeName}`.toLowerCase().includes(q),
      )
      .map((p) => ({
        id: p._id.toString(),
        name: p.name,
        sku: p.sku,
        category: p.category,
        price: p.price,
        stock: p.stock,
        status: p.status,
        moderationStatus: p.moderationStatus || "Clear",
        seller: p.seller?.storeName || "Store",
        sellerEmail: p.seller?.email || "",
        createdAt: p.createdAt,
      })),
  };
}

async function moderateProduct(admin, id, action) {
  if (!["Clear", "Flagged", "Hidden", "Active"].includes(action))
    throw new HttpError(400, "Choose a valid listing action.");
  const patch =
    action === "Hidden"
      ? { status: "Archived", moderationStatus: "Hidden" }
      : action === "Flagged"
        ? { moderationStatus: "Flagged" }
        : action === "Active"
          ? { status: "Active", moderationStatus: "Clear" }
          : { moderationStatus: "Clear" };
  const product = await Product.findByIdAndUpdate(
    id,
    { $set: patch },
    { new: true },
  );
  if (!product) throw new HttpError(404, "Listing not found.");
  await record(
    admin,
    `listing.${action.toLowerCase()}`,
    "product",
    id,
    `Listing ${product.name} was ${action.toLowerCase()}.`,
  );
  return {
    id,
    status: product.status,
    moderationStatus: product.moderationStatus,
  };
}

async function listCustomers(query = {}) {
  const rows = await Customer.find()
    .select("name email phone createdAt")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  const q = String(query.q || "").toLowerCase();
  const orderCounts = await Order.aggregate([
    {
      $group: {
        _id: "$customer",
        orders: { $sum: 1 },
        spent: { $sum: "$totals.total" },
      },
    },
  ]);
  const totals = new Map(orderCounts.map((x) => [x._id.toString(), x]));
  return {
    customers: rows
      .filter(
        (c) =>
          !q || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q),
      )
      .map((c) => ({
        id: c._id.toString(),
        name: c.name,
        email: c.email,
        phone: c.phone,
        joinedAt: c.createdAt,
        orders: totals.get(c._id.toString())?.orders || 0,
        spent: round(totals.get(c._id.toString())?.spent || 0),
      })),
  };
}

async function listOrders(query = {}) {
  const rows = await Order.find()
    .populate("customer", "name email")
    .sort({ placedAt: -1 })
    .limit(500)
    .lean();
  const q = String(query.q || "").toLowerCase();
  return {
    orders: rows
      .filter(
        (o) =>
          !q ||
          `${o.code} ${o.customer?.name} ${o.customer?.email} ${o.items.map((i) => i.name).join(" ")}`
            .toLowerCase()
            .includes(q),
      )
      .map((o) => ({
        id: o._id.toString(),
        code: o.code,
        customer: o.customer?.name || "Customer",
        email: o.customer?.email || "",
        items: o.items,
        total: o.totals.total,
        payment: o.payment,
        status: o.status,
        placedAt: o.placedAt,
      })),
  };
}

async function listReturns() {
  const entries = await ReturnRequest.find()
    .populate("customer", "name email")
    .sort({ requestedAt: -1 })
    .limit(300)
    .lean();
  return {
    returns: entries.map((r) => ({
      id: r._id.toString(),
      code: r.code,
      orderRef: r.orderRef,
      item: r.item,
      reason: r.reason,
      type: r.type || "Return",
      status: r.status,
      trackingStatus: r.trackingStatus || r.status,
      refund: r.refund,
      customer: r.customer?.name || "Customer",
      email: r.customer?.email || "",
      requestedAt: r.requestedAt,
    })),
  };
}
async function updateReturn(admin, id, status) {
  if (!["Approved", "In transit", "Rejected", "Replacement Shipped"].includes(status))
    throw new HttpError(
      400,
      "Choose a valid return status. Refunds must be issued by the owning seller through its payment flow.",
    );
  const r = await ReturnRequest.findById(id);
  if (!r) throw new HttpError(404, "Return request not found.");
  const previousStatus = r.status;
  if (status === "Approved") {
    r.status = status;
    r.trackingStatus =
      r.type === "Replacement" ? "Replacement Preparing" : "Ready for Pickup";
  } else if (status === "Replacement Shipped") {
    if (r.type !== "Replacement" || previousStatus !== "Approved") {
      throw new HttpError(409, "Approve the replacement request before shipping it.");
    }
    r.status = status;
    r.trackingStatus = "Ready for Pickup";
  } else if (status === "Rejected") {
    r.status = status;
    r.trackingStatus = "Rejected";
  } else {
    r.status = status;
  }
  if (["Approved", "Rejected", "Replacement Shipped"].includes(status)) {
    r.trackingEvents.push({
      status,
      source: "admin",
      occurredAt: new Date(),
    });
  }
  await r.save();
  await record(
    admin,
    `return.${status.toLowerCase()}`,
    "return",
    id,
    `Return ${r.code} was marked ${status.toLowerCase()}.`,
  );
  return { id, status: r.status };
}

async function listTickets() {
  const rows = await SupportTicket.find()
    .populate("customer", "name email")
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();
  return {
    tickets: rows.map((t) => ({
      id: t._id.toString(),
      reference: t.reference,
      subject: t.subject,
      message: t.message,
      orderRef: t.orderRef,
      status: t.status,
      customer: t.customer?.name || "Customer",
      email: t.customer?.email || "",
      createdAt: t.createdAt,
    })),
  };
}
async function updateTicket(admin, id, status) {
  if (!["Open", "In progress", "Resolved"].includes(status))
    throw new HttpError(400, "Choose a valid ticket status.");
  const t = await SupportTicket.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true },
  );
  if (!t) throw new HttpError(404, "Support ticket not found.");
  await record(
    admin,
    `ticket.${status.toLowerCase().replaceAll(" ", "-")}`,
    "ticket",
    id,
    `Support ticket ${t.reference} was marked ${status.toLowerCase()}.`,
  );
  return { id, status: t.status };
}

async function getSettings() {
  let settings = await AdminSetting.findOne({ key: "marketplace" }).lean();
  if (!settings)
    settings = await AdminSetting.create({
      key: "marketplace",
      platformFeeRate: Number(process.env.SELLER_PLATFORM_FEE_RATE) || 0,
    });
  return settings;
}
async function getPublicContent() {
  const settings = await AdminSetting.findOne({ key: "marketplace" })
    .select("announcement banners supportEmail")
    .lean();
  return {
    announcement: settings?.announcement || "",
    banners: (settings?.banners || []).filter(
      (banner) => banner.active && banner.message,
    ),
    supportEmail: settings?.supportEmail || "",
  };
}

async function recordCodCollection(
  admin,
  id,
  { amount, carrierFee = 0, reference = "" } = {},
) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, "Order not found.");
  const order = await Order.findById(id);
  if (!order || order.payment.method !== "Cash on delivery") {
    throw new HttpError(404, "COD order not found.");
  }
  if (order.status === "Cancelled") {
    throw new HttpError(409, "A cancelled order cannot be reconciled as collected.");
  }
  if (order.payment.codSettlement?.status === "collected") {
    throw new HttpError(409, "This COD remittance has already been recorded.");
  }
  const received = round(amount);
  const courierCharge = round(carrierFee);
  if (
    received < 0 ||
    courierCharge < 0 ||
    round(received + courierCharge) !== round(order.totals.total)
  ) {
    throw new HttpError(
      400,
      "The remitted amount plus courier fee must equal the full COD total.",
    );
  }
  order.payment.paid = true;
  order.payment.status = "paid";
  order.payment.codSettlement = {
    status: "collected",
    collectedAmount: received,
    carrierFee: courierCharge,
    collectedAt: new Date(),
    remittanceReference: String(reference || "").trim().slice(0, 120),
  };
  await order.save();
  await record(
    admin,
    "payment.cod-collected",
    "order",
    order._id,
    `COD remittance for ${order.code} recorded as collected.`,
  );
  return { id: order._id.toString(), code: order.code, paid: true };
}
async function updateSettings(admin, body) {
  const patch = {};
  if (body.platformFeeRate !== undefined) {
    const value = Number(body.platformFeeRate);
    if (!Number.isFinite(value) || value < 0 || value > 100)
      throw new HttpError(400, "Platform fee must be between 0 and 100%.");
    patch.platformFeeRate = value;
  }
  if (body.maintenanceMode !== undefined)
    patch.maintenanceMode = Boolean(body.maintenanceMode);
  if (body.supportEmail !== undefined)
    patch.supportEmail = String(body.supportEmail)
      .trim()
      .toLowerCase()
      .slice(0, 254);
  if (body.announcement !== undefined)
    patch.announcement = String(body.announcement).trim().slice(0, 500);
  if (Array.isArray(body.banners))
    patch.banners = body.banners.slice(0, 20).map((b) => ({
      title: String(b.title || "").slice(0, 120),
      message: String(b.message || "").slice(0, 500),
      active: Boolean(b.active),
    }));
  const settings = await AdminSetting.findOneAndUpdate(
    { key: "marketplace" },
    { $set: patch, $setOnInsert: { key: "marketplace" } },
    { upsert: true, new: true, runValidators: true },
  ).lean();
  await record(
    admin,
    "settings.updated",
    "settings",
    "marketplace",
    "Marketplace settings were updated.",
  );
  return settings;
}
async function listCategories() {
  return { categories: await categoryService.listCategories({ includeMarkup: true }) };
}
async function createCategory(admin, body) {
  await categoryService.ensureInitialized();
  const name = String(body.name || "").trim().slice(0, 80);
  const slug = categoryService.slugify(name);
  const markupPercent = Number(body.markupPercent);
  if (!name || !slug)
    throw new HttpError(400, "Enter a valid category name.");
  if (!Number.isFinite(markupPercent) || markupPercent < 0 || markupPercent > 100)
    throw new HttpError(400, "Category markup must be between 0 and 100%.");
  const subcategories = categoryService.normalizeSubcategories(body.subcategories);
  let category;
  let restored = false;
  const existing = await Category.findOne({ slug });
  if (existing) {
    if (!existing.deletedAt)
      throw new HttpError(409, "A category with that name already exists.");
    existing.name = name;
    existing.slug = slug;
    existing.subcategories = subcategories;
    existing.markupPercent = markupPercent;
    existing.active = true;
    existing.deletedAt = null;
    await existing.save();
    category = existing;
    restored = true;
  } else {
    try {
      category = await Category.create({
        name,
        slug,
        subcategories,
        markupPercent,
      });
    } catch (error) {
      if (error?.code === 11000)
        throw new HttpError(409, "A category with that name already exists.");
      throw error;
    }
  }
  await record(
    admin,
    restored ? "category.restored" : "category.created",
    "category",
    category._id,
    `${restored ? "Restored" : "Added"} category ${category.name}.`,
  );
  return categoryService.listCategories({ includeMarkup: true }).then((result) =>
    result.categories.find((entry) => entry.id === category._id.toString()),
  );
}
async function updateCategory(admin, id, body) {
  if (!mongoose.isValidObjectId(id))
    throw new HttpError(404, "Category not found.");
  await categoryService.ensureInitialized();
  const category = await Category.findOne({ _id: id, deletedAt: null });
  if (!category) throw new HttpError(404, "Category not found.");
  const oldName = category.name;
  const patch = {};
  if (body.name !== undefined) {
    const name = String(body.name || "").trim().slice(0, 80);
    const slug = categoryService.slugify(name);
    if (!name || !slug)
      throw new HttpError(400, "Enter a valid category name.");
    patch.name = name;
    patch.slug = slug;
  }
  if (body.markupPercent !== undefined) {
    const markupPercent = Number(body.markupPercent);
    if (!Number.isFinite(markupPercent) || markupPercent < 0 || markupPercent > 100)
      throw new HttpError(400, "Category markup must be between 0 and 100%.");
    patch.markupPercent = markupPercent;
  }
  if (body.subcategories !== undefined)
    patch.subcategories = categoryService.normalizeSubcategories(body.subcategories);
  if (body.active !== undefined) patch.active = Boolean(body.active);
  if (!Object.keys(patch).length)
    throw new HttpError(
      400,
      "Provide a category name, markup, subcategories, or status.",
    );
  if (patch.subcategories) {
    const incompatibleProducts = await Product.countDocuments({
      category: oldName,
      subcategory: { $nin: patch.subcategories },
    });
    if (incompatibleProducts) {
      throw new HttpError(
        409,
        "Reassign products before removing subcategories they use.",
      );
    }
  }
  Object.assign(category, patch);
  try {
    await category.save();
  } catch (error) {
    if (error?.code === 11000)
      throw new HttpError(409, "A category with that name already exists.");
    throw error;
  }
  if (oldName !== category.name) {
    await Product.updateMany(
      { category: oldName },
      { $set: { category: category.name } },
    );
  }
  if (
    oldName !== category.name ||
    patch.markupPercent !== undefined ||
    patch.active !== undefined
  ) {
    await categoryService.updateCategoryPrices(
      category.name,
      category.active ? category.markupPercent : 0,
    );
  }
  await record(
    admin,
    "category.updated",
    "category",
    category._id,
    `Updated category ${category.name}.`,
  );
  return {
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    subcategories: category.subcategories,
    markupPercent: category.markupPercent,
    active: category.active,
  };
}
async function deleteCategory(admin, id) {
  if (!mongoose.isValidObjectId(id))
    throw new HttpError(404, "Category not found.");
  await categoryService.ensureInitialized();
  const category = await Category.findOne({ _id: id, deletedAt: null });
  if (!category) throw new HttpError(404, "Category not found.");
  const productCount = await Product.countDocuments({
    category: category.name,
  });
  if (productCount) {
    throw new HttpError(
      409,
      "This category is used by products. Reassign or remove those products before deleting it.",
    );
  }
  category.active = false;
  category.deletedAt = new Date();
  await category.save();
  await categoryService.updateCategoryPrices(category.name, 0);
  await record(
    admin,
    "category.deleted",
    "category",
    category._id,
    `Deleted category ${category.name}.`,
  );
  return { id: category._id.toString(), deleted: true };
}
async function getAuditLog() {
  const entries = await AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  return {
    entries: entries.map((e) => ({
      id: e._id.toString(),
      adminEmail: e.adminEmail,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      summary: e.summary,
      createdAt: e.createdAt,
    })),
  };
}
async function getPayments() {
  const settings = await getSettings();
  const [paid, pending, refunded] = await Promise.all([
    Order.aggregate([
      { $match: { "payment.paid": true } },
      {
        $group: {
          _id: null,
          gross: { $sum: "$totals.total" },
          orders: { $sum: 1 },
          commission: {
            $sum: {
              $add: [
                { $ifNull: ["$totals.categoryMarkup", 0] },
                {
                  $let: {
                    vars: {
                      feeSnapshots: {
                        $filter: {
                          input: { $ifNull: ["$sellerFulfillments", []] },
                          as: "fulfillment",
                          cond: {
                            $ne: [
                              { $type: "$$fulfillment.platformFeeRate" },
                              "missing",
                            ],
                          },
                        },
                      },
                    },
                    in: {
                      $cond: [
                        { $gt: [{ $size: "$$feeSnapshots" }, 0] },
                        {
                          $sum: {
                            $map: {
                              input: "$$feeSnapshots",
                              as: "fulfillment",
                              in: {
                                $ifNull: ["$$fulfillment.platformFee", 0],
                              },
                            },
                          },
                        },
                        {
                          $divide: [
                            {
                              $multiply: [
                                {
                                  $max: [
                                    0,
                                    {
                                      $subtract: [
                                        { $ifNull: ["$totals.subtotal", 0] },
                                        {
                                          $ifNull: [
                                            "$appliedDiscount.amount",
                                            0,
                                          ],
                                        },
                                      ],
                                    },
                                  ],
                                },
                                Number(settings.platformFeeRate) || 0,
                              ],
                            },
                            100,
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: { "payment.paid": { $ne: true }, status: { $ne: "Cancelled" } },
      },
      {
        $group: {
          _id: null,
          amount: { $sum: "$totals.total" },
          orders: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      {
        $group: {
          _id: null,
          amount: { $sum: "$payment.refundedTotal" },
          platformFeeRefunded: { $sum: "$payment.platformFeeRefundedTotal" },
          categoryMarkupRefunded: {
            $sum: "$payment.categoryMarkupRefundedTotal",
          },
        },
      },
    ]),
  ]);
  return {
    paidGross: round(paid[0]?.gross),
    paidOrders: paid[0]?.orders || 0,
    pendingGross: round(pending[0]?.amount),
    pendingOrders: pending[0]?.orders || 0,
    refunded: round(refunded[0]?.amount),
    estimatedCommission: round(
      Math.max(
        0,
        (paid[0]?.commission || 0) -
          (refunded[0]?.platformFeeRefunded || 0) -
          (refunded[0]?.categoryMarkupRefunded || 0),
      ),
    ),
    transfers: "Not connected",
    codOrders: await Order.find({
      "payment.method": "Cash on delivery",
      "payment.codSettlement.status": { $ne: "collected" },
      status: { $ne: "Cancelled" },
    })
      .select("code currency totals.total placedAt payment.codSettlement.status")
      .sort({ placedAt: -1 })
      .limit(100)
      .lean()
      .then((orders) => orders.map((order) => ({
        id: order._id.toString(),
        code: order.code,
        currency: order.currency,
        expected: order.totals.total,
        placedAt: order.placedAt,
      }))),
  };
}

async function listDeliveryAgents(filters) {
  return deliveryService.listAgents(filters);
}

async function createHubStaff(admin, body) {
  const agent = await deliveryService.createHubStaff(body);
  await record(
    admin,
    "hub_staff_created",
    "delivery_agent",
    agent.id,
    `Created hub staff account ${agent.email}.`,
  );
  return agent;
}

async function getDeliveryAgentApplication(id, jwtSecret) {
  return deliveryService.getAgentApplicationReview(id, jwtSecret);
}

async function reviewDeliveryAgent(admin, id, body) {
  const agent = await deliveryService.reviewAgentApplication(
    id,
    body,
    admin.email,
  );
  await record(
    admin,
    `delivery_application.${agent.applicationStatus.toLowerCase()}`,
    "delivery_agent",
    id,
    `Delivery application for ${agent.email} was marked ${agent.applicationStatus}.`,
  );
  return agent;
}

async function updateDeliveryAgent(admin, id, isActive) {
  const agent = await deliveryService.setAgentActive(id, isActive);
  await record(
    admin,
    isActive ? "delivery_agent_activated" : "delivery_agent_deactivated",
    "delivery_agent",
    id,
    `${isActive ? "Activated" : "Deactivated"} delivery agent ${agent.email}.`,
  );
  return agent;
}

async function listDeliveryShipments() {
  return deliveryService.listDispatchShipments();
}

async function assignDeliveryShipment(admin, orderId, body) {
  const shipment = await deliveryService.assignShipment(orderId, body);
  await record(
    admin,
    "delivery_shipment_assigned",
    "order",
    orderId,
    `Assigned ${shipment.orderCode} to delivery agent ${body.agentId}.`,
  );
  return shipment;
}

module.exports = {
  login,
  dashboard,
  listSellers,
  updateSeller,
  getSellerVerification,
  reviewSellerVerification,
  listProducts,
  moderateProduct,
  listCustomers,
  listOrders,
  listReturns,
  updateReturn,
  listTickets,
  updateTicket,
  getSettings,
  getPublicContent,
  updateSettings,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  recordCodCollection,
  getAuditLog,
  getPayments,
  listDeliveryAgents,
  createHubStaff,
  getDeliveryAgentApplication,
  reviewDeliveryAgent,
  updateDeliveryAgent,
  listDeliveryShipments,
  assignDeliveryShipment,
};
