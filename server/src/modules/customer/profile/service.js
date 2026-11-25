const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const SavedVehicle = require("../models/SavedVehicle");
const WishlistItem = require("../models/WishlistItem");
const ProductAlert = require("../models/ProductAlert");
const SellerProduct = require("../../seller/models/Product");
const { Resend } = require("resend");
const Address = require("../models/Address");
const PaymentMethod = require("../models/PaymentMethod");
const Wallet = require("../models/Wallet");
const LedgerEntry = require("../models/LedgerEntry");
const KycProfile = require("../models/KycProfile");
const ReturnRequest = require("../models/ReturnRequest");
const Order = require("../models/Order");
const SupportTicket = require("../models/SupportTicket");
const HttpError = require("../../../utils/HttpError");
const { encryptValue, fingerprintValue } = require("../../../utils/encryption");
const {
  KYC_STEP_DEFINITIONS,
  KYC_STEP_DEFAULTS,
  RETURN_TIMELINE_LABELS,
} = require("./constants");
const { roundMoney, buildReturnTimeline } = require("./helpers");
const { getCountry } = require("../../market/countries");

const MAX_WISHLIST_ITEMS = 500;

/* ---------------------------------------------------------------- shared -- */

function requireObjectId(id, label = "record") {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, `That ${label} is no longer available.`);
  }
  return id;
}

async function getCustomerOrThrow(customerId) {
  const customer = await Customer.findById(customerId).lean();
  if (!customer) {
    throw new HttpError(404, "Your account could not be found.");
  }
  return customer;
}

async function clearOtherDefaults(Model, customerId, keepId, field) {
  await Model.updateMany(
    { customer: customerId, _id: { $ne: keepId } },
    { $set: { [field]: false } },
  );
}

async function promoteFirstRemaining(Model, customerId, field) {
  const remaining = await Model.findOne({ customer: customerId }).sort({
    createdAt: 1,
  });
  if (!remaining) {
    return;
  }
  await Model.updateOne({ _id: remaining._id }, { $set: { [field]: true } });
}

/* ---------------------------------------------------------------- wallet -- */

async function loadWallet(customerId) {
  const existing = await Wallet.findOne({ customer: customerId });
  if (existing) {
    return existing;
  }
  const customer = await Customer.findById(customerId)
    .select("marketCountry")
    .lean();
  try {
    return await Wallet.create({
      customer: customerId,
      currency: getCountry(customer?.marketCountry)?.currency || "USD",
    });
  } catch (error) {
    if (error.code === 11000) {
      return Wallet.findOne({ customer: customerId });
    }
    throw error;
  }
}

async function postLedgerEntry(
  customerId,
  {
    type,
    amount,
    description,
    channel = "Wallet",
    reference = "",
    status = "Completed",
    balanceDelta = 0,
    pendingDelta = 0,
  },
) {
  await loadWallet(customerId);

  const wallet = await Wallet.findOneAndUpdate(
    { customer: customerId },
    { $inc: { balance: balanceDelta, pending: pendingDelta } },
    { new: true },
  );
  if (!wallet) {
    throw new HttpError(500, "Your wallet could not be updated.");
  }

  const entry = await LedgerEntry.create({
    customer: customerId,
    occurredAt: new Date(),
    reference,
    description,
    channel,
    type,
    amount: roundMoney(amount),
    currency: wallet.currency || "USD",
    balanceAfter: roundMoney(wallet.balance),
    status,
  });

  return { wallet, entry };
}

async function ledgerTotals(customerId) {
  const [credits, debits, wallet] = await Promise.all([
    LedgerEntry.aggregate([
      {
        $match: {
          customer: customerId,
          type: "credit",
          status: { $ne: "Failed" },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    LedgerEntry.aggregate([
      {
        $match: {
          customer: customerId,
          type: "debit",
          status: { $ne: "Failed" },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    loadWallet(customerId),
  ]);

  return {
    credited: roundMoney(credits[0]?.total),
    debited: roundMoney(debits[0]?.total),
    closingBalance: roundMoney(wallet.balance),
    cashbackEarned: roundMoney(wallet.cashbackEarned),
  };
}

async function getWallet(customerId, limit = 20) {
  const wallet = await loadWallet(customerId);
  const [entries, totals] = await Promise.all([
    LedgerEntry.find({ customer: customerId })
      .sort({ occurredAt: -1 })
      .limit(limit)
      .lean(),
    ledgerTotals(customerId),
  ]);
  return { wallet, entries, totals };
}

async function getLedger(
  customerId,
  { type = "all", from, to, page, limit, skip },
) {
  const query = { customer: customerId };
  if (type === "credit" || type === "debit") {
    query.type = type;
  }
  if (from || to) {
    query.occurredAt = {};
    if (from) {
      query.occurredAt.$gte = from;
    }
    if (to) {
      query.occurredAt.$lte = to;
    }
  }

  const [entries, total, totals] = await Promise.all([
    LedgerEntry.find(query)
      .sort({ occurredAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LedgerEntry.countDocuments(query),
    ledgerTotals(customerId),
  ]);

  return { entries, total, page, limit, totals };
}

async function topUpWallet(customerId, amount) {
  /*
   * A wallet top-up is created as a pending credit: the balance only moves
   * once the payment provider confirms the charge.
   */
  return postLedgerEntry(customerId, {
    type: "credit",
    amount,
    description: "Wallet top-up",
    channel: "Card",
    status: "Processing",
    pendingDelta: amount,
  });
}

async function withdrawFromWallet(customerId, amount) {
  await loadWallet(customerId);

  /* Conditional update keeps the balance from ever going negative. */
  const wallet = await Wallet.findOneAndUpdate(
    { customer: customerId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true },
  );
  if (!wallet) {
    throw new HttpError(
      400,
      "You do not have enough wallet balance for this withdrawal.",
    );
  }

  const entry = await LedgerEntry.create({
    customer: customerId,
    occurredAt: new Date(),
    reference: "",
    description: "Withdrawal to bank account",
    channel: "Bank transfer",
    type: "debit",
    amount: roundMoney(amount),
    currency: wallet.currency || "USD",
    balanceAfter: roundMoney(wallet.balance),
    status: "Processing",
  });

  return { wallet, entry };
}

/* --------------------------------------------------------------- wishlist -- */

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getWishlist(customerId, { term, sort }) {
  const query = { customer: customerId };

  if (term) {
    const pattern = new RegExp(escapeRegExp(term), "i");
    query.$or = [{ name: pattern }, { brand: pattern }, { category: pattern }];
  }

  const items = await WishlistItem.find(query)
    .sort({ createdAt: -1 })
    .limit(MAX_WISHLIST_ITEMS)
    .lean();

  if (sort === "price-low") {
    items.sort((a, b) => a.price - b.price);
  } else if (sort === "price-high") {
    items.sort((a, b) => b.price - a.price);
  } else if (sort === "rating") {
    items.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  }

  const savings = items.reduce(
    (total, item) => total + (item.oldPrice ? item.oldPrice - item.price : 0),
    0,
  );

  return { items, savings: roundMoney(Math.max(0, savings)) };
}

async function addWishlistItem(customerId, payload) {
  const count = await WishlistItem.countDocuments({ customer: customerId });
  if (count >= MAX_WISHLIST_ITEMS) {
    throw new HttpError(
      400,
      `Your wishlist is full. You can save up to ${MAX_WISHLIST_ITEMS} parts.`,
    );
  }

  return WishlistItem.findOneAndUpdate(
    { customer: customerId, productId: payload.productId },
    { $set: payload, $setOnInsert: { customer: customerId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function removeWishlistItem(customerId, id) {
  requireObjectId(id, "saved item");
  const removed = await WishlistItem.findOneAndDelete({
    _id: id,
    customer: customerId,
  });
  if (!removed) {
    throw new HttpError(404, "That saved item was not found.");
  }
  return removed;
}

async function getProductAlerts(customerId, productId) {
  const filter = { customer: customerId };
  if (productId) filter.productId = String(productId).slice(0, 64);
  const alerts = await ProductAlert.find(filter).sort({ updatedAt: -1 }).lean();
  const products = await SellerProduct.find({ _id: { $in: alerts.map((alert) => alert.productId) } })
    .select("name price stock images")
    .lean();
  const byId = new Map(products.map((product) => [product._id.toString(), product]));
  return alerts.map((alert) => ({
    id: alert._id.toString(),
    productId: alert.productId,
    productName: byId.get(alert.productId)?.name || "Product listing",
    price: byId.get(alert.productId)?.price ?? null,
    stock: byId.get(alert.productId)?.stock ?? 0,
    image: byId.get(alert.productId)?.images?.[0] || "",
    targetPrice: alert.targetPrice,
    notifyPriceDrop: alert.notifyPriceDrop,
    notifyRestock: alert.notifyRestock,
    active: alert.active,
    lastEvent: alert.lastEvent,
    triggeredAt: alert.triggeredAt,
    updatedAt: alert.updatedAt,
  }));
}

async function createProductAlert(customerId, payload) {
  if (!require("mongoose").isValidObjectId(payload.productId)) throw new HttpError(400, "Choose a valid product.");
  const product = await SellerProduct.findOne({ _id: payload.productId, status: "Active" }).select("_id price stock").lean();
  if (!product) throw new HttpError(404, "This product is no longer available.");
  const targetPrice = payload.targetPrice === undefined ? product.price : payload.targetPrice;
  return ProductAlert.findOneAndUpdate(
    { customer: customerId, productId: product._id.toString() },
    { $set: { targetPrice, notifyPriceDrop: payload.notifyPriceDrop, notifyRestock: payload.notifyRestock, active: true, lastEvent: "", triggeredAt: null } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );
}

async function removeProductAlert(customerId, id) {
  requireObjectId(id, "product alert");
  const removed = await ProductAlert.findOneAndDelete({ _id: id, customer: customerId });
  if (!removed) throw new HttpError(404, "Product alert not found.");
  return removed;
}

async function triggerProductAlerts(previous, next) {
  if (!previous?._id || !next?._id) return;
  const priceDropped = Number(next.price) < Number(previous.price);
  const restocked = Number(previous.stock) <= 0 && Number(next.stock) > 0;
  if (!priceDropped && !restocked) return;
  const alerts = await ProductAlert.find({ productId: next._id.toString(), active: true });
  if (!alerts.length) return;
  const customers = await Customer.find({ _id: { $in: alerts.map((alert) => alert.customer) } }).select("email name").lean();
  const byCustomer = new Map(customers.map((customer) => [customer._id.toString(), customer]));
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  const resend = apiKey && from ? new Resend(apiKey) : null;
  for (const alert of alerts) {
    const event = restocked && alert.notifyRestock
      ? "restocked"
      : priceDropped && alert.notifyPriceDrop && Number(next.price) < Number(alert.targetPrice ?? previous.price)
        ? "price_drop"
        : "";
    if (!event) continue;
    alert.active = false;
    alert.lastEvent = event;
    alert.triggeredAt = new Date();
    await alert.save();
    const customer = byCustomer.get(alert.customer.toString());
    if (resend && customer?.email) {
      const subject = event === "restocked" ? `${next.name} is back in stock` : `Price drop: ${next.name}`;
      const text = event === "restocked"
        ? `${next.name} is back in stock on AcquireAuto. Visit the product page to check availability.`
        : `${next.name} has dropped to ${next.price}. Your target was ${alert.targetPrice}. Visit the product page to check availability.`;
      try { await resend.emails.send({ from, to: [customer.email], subject, text }); } catch { /* Keep the in-account alert even if email delivery is unavailable. */ }
    }
  }
}

async function clearWishlist(customerId) {
  const result = await WishlistItem.deleteMany({ customer: customerId });
  return result.deletedCount || 0;
}

async function getWishlistProductIds(customerId) {
  const items = await WishlistItem.find({ customer: customerId })
    .select("productId")
    .lean();
  return items.map((item) => item.productId);
}

/* --------------------------------------------------------------- vehicles -- */

async function getVehicles(customerId) {
  return SavedVehicle.find({ customer: customerId })
    .sort({ isPrimary: -1, createdAt: -1 })
    .lean();
}

async function createVehicle(customerId, payload) {
  const count = await SavedVehicle.countDocuments({ customer: customerId });
  const isPrimary = count === 0 ? true : Boolean(payload.isPrimary);

  const vehicle = await SavedVehicle.create({
    ...payload,
    customer: customerId,
    isPrimary,
  });

  if (isPrimary) {
    await clearOtherDefaults(
      SavedVehicle,
      customerId,
      vehicle._id,
      "isPrimary",
    );
  }

  return vehicle;
}

async function setPrimaryVehicle(customerId, id) {
  requireObjectId(id, "vehicle");
  const vehicle = await SavedVehicle.findOneAndUpdate(
    { _id: id, customer: customerId },
    { $set: { isPrimary: true } },
    { new: true },
  );
  if (!vehicle) {
    throw new HttpError(404, "That vehicle was not found in your garage.");
  }
  await clearOtherDefaults(SavedVehicle, customerId, vehicle._id, "isPrimary");
  return vehicle;
}

async function removeVehicle(customerId, id) {
  requireObjectId(id, "vehicle");
  const vehicle = await SavedVehicle.findOneAndDelete({
    _id: id,
    customer: customerId,
  });
  if (!vehicle) {
    throw new HttpError(404, "That vehicle was not found in your garage.");
  }
  if (vehicle.isPrimary) {
    await promoteFirstRemaining(SavedVehicle, customerId, "isPrimary");
  }
  return vehicle;
}

/* -------------------------------------------------------------- addresses -- */

async function getAddresses(customerId) {
  return Address.find({ customer: customerId })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();
}

async function createAddress(customerId, payload) {
  const count = await Address.countDocuments({ customer: customerId });
  const isDefault = count === 0 ? true : Boolean(payload.isDefault);

  const address = await Address.create({
    ...payload,
    customer: customerId,
    isDefault,
  });
  if (isDefault) {
    await clearOtherDefaults(Address, customerId, address._id, "isDefault");
  }
  return address;
}

async function updateAddress(customerId, id, changes) {
  requireObjectId(id, "address");
  const address = await Address.findOneAndUpdate(
    { _id: id, customer: customerId },
    { $set: changes },
    { new: true, runValidators: true },
  );
  if (!address) {
    throw new HttpError(404, "That address was not found.");
  }
  return address;
}

async function setDefaultAddress(customerId, id) {
  requireObjectId(id, "address");
  const address = await Address.findOneAndUpdate(
    { _id: id, customer: customerId },
    { $set: { isDefault: true } },
    { new: true },
  );
  if (!address) {
    throw new HttpError(404, "That address was not found.");
  }
  await clearOtherDefaults(Address, customerId, address._id, "isDefault");
  return address;
}

async function removeAddress(customerId, id) {
  requireObjectId(id, "address");
  const address = await Address.findOneAndDelete({
    _id: id,
    customer: customerId,
  });
  if (!address) {
    throw new HttpError(404, "That address was not found.");
  }
  if (address.isDefault) {
    await promoteFirstRemaining(Address, customerId, "isDefault");
  }
  return address;
}

/* --------------------------------------------------------------- payments -- */

async function getPayments(customerId) {
  return PaymentMethod.find({ customer: customerId })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();
}

async function createPayment(customerId, payload, secret) {
  const count = await PaymentMethod.countDocuments({ customer: customerId });
  const isDefault = count === 0 ? true : Boolean(payload.isDefault);

  /*
   * Only a one-way fingerprint of the masked details is stored so the same
   * card cannot be added twice, and the fingerprint cannot be reversed.
   */
  const fingerprint = payload.fingerprintSource
    ? fingerprintValue(payload.fingerprintSource, secret)
    : "";

  const { fingerprintSource, ...rest } = payload;

  const payment = await PaymentMethod.create({
    ...rest,
    customer: customerId,
    isDefault,
    fingerprint,
  });

  if (isDefault) {
    await clearOtherDefaults(
      PaymentMethod,
      customerId,
      payment._id,
      "isDefault",
    );
  }

  return payment;
}

async function setDefaultPayment(customerId, id) {
  requireObjectId(id, "payment method");
  const payment = await PaymentMethod.findOneAndUpdate(
    { _id: id, customer: customerId },
    { $set: { isDefault: true } },
    { new: true },
  );
  if (!payment) {
    throw new HttpError(404, "That payment method was not found.");
  }
  await clearOtherDefaults(PaymentMethod, customerId, payment._id, "isDefault");
  return payment;
}

async function removePayment(customerId, id) {
  requireObjectId(id, "payment method");
  const payment = await PaymentMethod.findOneAndDelete({
    _id: id,
    customer: customerId,
  });
  if (!payment) {
    throw new HttpError(404, "That payment method was not found.");
  }
  if (payment.isDefault) {
    await promoteFirstRemaining(PaymentMethod, customerId, "isDefault");
  }
  return payment;
}

/* -------------------------------------------------------------------- kyc -- */

function applyKycLevel(kyc) {
  const identityVerified = kyc.steps.filter(
    (step) =>
      step.status === "verified" &&
      ["identity", "address", "bank"].includes(step.key),
  ).length;

  kyc.level = Math.min(kyc.maxLevel || 3, 1 + identityVerified);
  kyc.status = kyc.level >= (kyc.maxLevel || 3) ? "Verified" : "In progress";
  return kyc;
}

async function ensureKyc(customer) {
  const existing = await KycProfile.findOne({ customer: customer._id });
  if (existing) {
    return existing;
  }

  const steps = KYC_STEP_DEFINITIONS.map((definition) => {
    const defaults = KYC_STEP_DEFAULTS[definition.key];
    let status = defaults.status;
    let detail = defaults.detail;

    if (definition.key === "email") {
      status = "verified";
      detail = customer.email;
    } else if (definition.key === "phone") {
      status = customer.phone ? "verified" : "pending";
      detail = customer.phone || "Add a mobile number to verify";
    }

    return { key: definition.key, label: definition.label, detail, status };
  });

  const kyc = new KycProfile({ customer: customer._id, steps, maxLevel: 3 });
  applyKycLevel(kyc);

  try {
    return await kyc.save();
  } catch (error) {
    if (error.code === 11000) {
      return KycProfile.findOne({ customer: customer._id });
    }
    throw error;
  }
}

async function getKyc(customer) {
  return ensureKyc(customer);
}

async function submitKycStep(customer, key, payload, secret) {
  const kyc = await ensureKyc(customer);
  const step = kyc.steps.find((entry) => entry.key === key);
  if (!step) {
    throw new HttpError(404, "That verification step does not exist.");
  }
  if (step.status === "verified") {
    throw new HttpError(400, "This step is already verified.");
  }

  if (key === "email" || key === "phone") {
    if (key === "phone" && !customer.phone) {
      throw new HttpError(
        400,
        "Add a mobile number in Account Settings first.",
      );
    }
    step.status = "verified";
    step.detail = key === "email" ? customer.email : customer.phone;
    step.reviewedAt = new Date();
  } else {
    step.status = "pending";
    step.documentNumberEncrypted = payload.documentNumber
      ? encryptValue(payload.documentNumber, secret)
      : "";
    step.documentUrl = payload.documentUrl || "";
    step.submittedAt = new Date();
  }

  applyKycLevel(kyc);
  await kyc.save();
  return kyc;
}

async function syncKycContact(customerId, { email, phone, emailChanged }) {
  const kyc = await KycProfile.findOne({ customer: customerId });
  if (!kyc) {
    return;
  }

  if (email !== undefined) {
    const emailStep = kyc.steps.find((step) => step.key === "email");
    if (emailStep) {
      emailStep.detail = email;
      if (emailChanged) {
        emailStep.status = "pending";
      }
    }
  }

  if (phone !== undefined) {
    const phoneStep = kyc.steps.find((step) => step.key === "phone");
    if (phoneStep) {
      phoneStep.detail = phone || "Add a mobile number to verify";
      phoneStep.status = phone ? "verified" : "pending";
    }
  }

  applyKycLevel(kyc);
  await kyc.save();
}

/* ---------------------------------------------------------------- returns -- */

async function nextReturnCode(customerId) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = `RMA-${Math.floor(100000 + Math.random() * 900000)}`;
    const exists = await ReturnRequest.exists({ customer: customerId, code });
    if (!exists) {
      return code;
    }
  }
  return `RMA-${Date.now().toString().slice(-6)}`;
}

async function getReturns(customerId, { status } = {}) {
  const query = { customer: customerId };
  if (status && status !== "all") {
    query.status = status;
  }

  const entries = await ReturnRequest.find(query)
    .select("+deliveryOtpEncrypted")
    .sort({ requestedAt: -1 })
    .lean();

  const active = entries.filter(
    (entry) =>
      entry.status !== "Refunded" &&
      entry.status !== "Rejected" &&
      entry.status !== "Cancelled" &&
      entry.status !== "Completed",
  ).length;

  const refundedEntries = entries.filter(
    (entry) => entry.status === "Refunded",
  );

  return {
    entries,
    summary: {
      active,
      refunded: refundedEntries.length,
      refundedTotal: roundMoney(
        refundedEntries.reduce((total, entry) => total + entry.refund, 0),
      ),
    },
  };
}

async function createReturn(customerId, payload) {
  const requestedAt = new Date();
  const orderRef = String(payload.orderRef || "")
    .trim()
    .replace(/^#/, "");
  const order = await Order.findOne({
    code: orderRef,
    customer: customerId,
  });
  if (!order) {
    throw new HttpError(404, "That delivered order could not be found.");
  }
  const orderItem = order.items.find(
    (item) => item.name.toLowerCase() === payload.item.toLowerCase(),
  );
  if (!orderItem) {
    throw new HttpError(400, "Choose an item from this order.");
  }
  const product = await SellerProduct.findById(orderItem.productId)
    .select("seller")
    .lean();
  if (!product) {
    throw new HttpError(404, "The seller for this order item could not be found.");
  }
  const sellerState = order.sellerFulfillments.find(
    (state) => state.seller.toString() === product.seller.toString(),
  );
  if (sellerState?.status !== "Delivered") {
    throw new HttpError(409, "Returns and replacements are available after delivery.");
  }
  if (!sellerState.scanToken) {
    sellerState.scanToken = require("crypto").randomBytes(32).toString("hex");
    await order.save();
  }
  const activeRequest = await ReturnRequest.exists({
    customer: customerId,
    orderRef: order.code,
    item: orderItem.name,
    status: { $nin: ["Refunded", "Rejected", "Cancelled", "Completed"] },
  });
  if (activeRequest) {
    throw new HttpError(409, "An active return or replacement already exists for this item.");
  }
  const code = await nextReturnCode(customerId);

  return ReturnRequest.create({
    customer: customerId,
    order: order._id,
    seller: product.seller,
    code,
    type: payload.type,
    orderRef: order.code,
    item: orderItem.name,
    reason: payload.reason,
    refund: payload.type === "Return" ? payload.refund : 0,
    status: "Requested",
    trackingStatus: "Requested",
    scanToken: sellerState.scanToken,
    requestedAt,
    trackingEvents: [
      {
        status: "Requested",
        source: "system",
        occurredAt: requestedAt,
      },
    ],
    timeline: buildReturnTimeline("Requested", requestedAt, {
      labels:
        payload.type === "Replacement"
          ? [
              "Replacement requested",
              "Approved",
              "Replacement shipped",
              "Replacement delivered",
            ]
          : RETURN_TIMELINE_LABELS,
    }),
  });
}

async function cancelReturn(customerId, id) {
  requireObjectId(id, "return request");

  const entry = await ReturnRequest.findOne({ _id: id, customer: customerId });
  if (!entry) {
    throw new HttpError(404, "That return request was not found.");
  }
  if (!["Requested", "Approved"].includes(entry.status)) {
    throw new HttpError(
      400,
      "This return can no longer be cancelled. Please contact support.",
    );
  }

  const now = new Date();
  entry.status = "Cancelled";
  entry.trackingStatus = "Cancelled";
  entry.trackingEvents.push({
    status: "Cancelled",
    source: "system",
    occurredAt: now,
  });
  entry.timeline = [
    {
      label:
        entry.type === "Replacement"
          ? "Replacement requested"
          : "Return requested",
      date: entry.timeline?.[0]?.date || "Requested",
      done: true,
    },
    {
      label: "Cancelled by you",
      date: now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
      done: true,
    },
    {
      label:
        entry.type === "Replacement"
          ? "Replacement shipped"
          : "Picked up",
      date: "Pending",
      done: false,
    },
    {
      label:
        entry.type === "Replacement"
          ? "Replacement delivered"
          : "Refund issued",
      date: "Pending",
      done: false,
    },
  ];

  await entry.save();
  return entry;
}

/* ---------------------------------------------------------------- contact -- */

async function nextTicketReference(customerId) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const reference = `TCK-${Math.floor(100000 + Math.random() * 900000)}`;
    const exists = await SupportTicket.exists({
      customer: customerId,
      reference,
    });
    if (!exists) {
      return reference;
    }
  }
  return `TCK-${Date.now().toString().slice(-6)}`;
}

async function createTicket(customerId, payload) {
  const reference = await nextTicketReference(customerId);
  return SupportTicket.create({
    customer: customerId,
    reference,
    subject: payload.subject,
    orderRef: payload.orderRef,
    message: payload.message,
  });
}

async function getTickets(customerId) {
  return SupportTicket.find({ customer: customerId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
}

/* --------------------------------------------------------------- settings -- */

async function updateProfile(customerId, changes) {
  const current = await Customer.findById(customerId).lean();
  if (!current) {
    throw new HttpError(404, "Your account could not be found.");
  }

  const emailChanged =
    changes.email !== undefined && changes.email !== current.email;

  let customer;
  try {
    customer = await Customer.findByIdAndUpdate(
      customerId,
      { $set: changes },
      { new: true, runValidators: true },
    ).lean();
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(409, "An account with this email already exists.");
    }
    throw error;
  }

  await syncKycContact(customerId, {
    email: changes.email,
    phone: changes.phone,
    emailChanged,
  });

  return customer;
}

async function updatePreferences(customerId, changes) {
  const update = {};
  for (const [key, value] of Object.entries(changes)) {
    update[`preferences.${key}`] = value;
  }

  const customer = await Customer.findByIdAndUpdate(
    customerId,
    { $set: update },
    { new: true, runValidators: true },
  ).lean();

  if (!customer) {
    throw new HttpError(404, "Your account could not be found.");
  }

  return customer;
}

async function changePassword(customerId, { currentPassword, newPassword }) {
  const customer = await Customer.findById(customerId).select("+passwordHash");
  if (!customer) {
    throw new HttpError(404, "Your account could not be found.");
  }

  const matches = await bcrypt.compare(currentPassword, customer.passwordHash);
  if (!matches) {
    throw new HttpError(400, "Your current password is incorrect.");
  }

  customer.passwordHash = await bcrypt.hash(newPassword, 12);
  await customer.save();
  return true;
}

/* ------------------------------------------------------------------ overview -- */

async function getOverview(customer) {
  const customerId = customer._id;

  const [wallet, kyc, wishlist, vehicles, addresses, payments, returns] =
    await Promise.all([
      loadWallet(customerId),
      ensureKyc(customer),
      WishlistItem.countDocuments({ customer: customerId }),
      SavedVehicle.countDocuments({ customer: customerId }),
      Address.countDocuments({ customer: customerId }),
      PaymentMethod.countDocuments({ customer: customerId }),
      ReturnRequest.countDocuments({
        customer: customerId,
        status: { $in: ["Requested", "Approved", "In transit"] },
      }),
    ]);

  return {
    customer,
    wallet,
    kyc,
    counts: {
      wishlist,
      vehicles,
      addresses,
      payments,
      openReturns: returns,
    },
  };
}

module.exports = {
  getCustomerOrThrow,
  getOverview,
  loadWallet,
  getWallet,
  getLedger,
  topUpWallet,
  withdrawFromWallet,
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  getProductAlerts,
  createProductAlert,
  removeProductAlert,
  triggerProductAlerts,
  clearWishlist,
  getWishlistProductIds,
  getVehicles,
  createVehicle,
  setPrimaryVehicle,
  removeVehicle,
  getAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  removeAddress,
  getPayments,
  createPayment,
  setDefaultPayment,
  removePayment,
  getKyc,
  submitKycStep,
  getReturns,
  createReturn,
  cancelReturn,
  createTicket,
  getTickets,
  updateProfile,
  updatePreferences,
  changePassword,
};
