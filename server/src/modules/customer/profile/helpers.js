const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require("./constants");
const { decryptValue } = require("../../../utils/encryption");

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function formatDate(value) {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function shortDate(value) {
  if (!value) {
    return "Pending";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Pending";
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function parsePagination(query) {
  const rawPage = Number.parseInt(query?.page, 10);
  const rawLimit = Number.parseInt(query?.limit, 10);

  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return { page, limit, skip: (page - 1) * limit };
}

function serializeCustomer(customer) {
  return {
    id: customer._id.toString(),
    name: customer.name,
    email: customer.email,
    phone: customer.phone || "",
    profilePhoto: customer.profilePhoto || "",
    role: customer.role || "customer",
    createdAt: customer.createdAt,
  };
}

function serializePreferences(customer) {
  return {
    orderUpdates: customer.preferences?.orderUpdates ?? true,
    priceDrops: customer.preferences?.priceDrops ?? true,
    newsletter: customer.preferences?.newsletter ?? false,
    twoFactor: customer.preferences?.twoFactor ?? false,
  };
}

function serializeWallet(wallet) {
  return {
    balance: roundMoney(wallet?.balance),
    pending: roundMoney(wallet?.pending),
    cashbackEarned: roundMoney(wallet?.cashbackEarned),
    currency: wallet?.currency || "USD",
    updatedAt: wallet?.updatedAt || null,
  };
}

function serializeLedgerEntry(entry) {
  return {
    id: entry._id.toString(),
    date: formatDate(entry.occurredAt),
    occurredAt: entry.occurredAt,
    ref: entry.reference || "",
    description: entry.description,
    method: entry.channel,
    type: entry.type,
    amount: roundMoney(entry.amount),
    balance: roundMoney(entry.balanceAfter),
    currency: entry.currency || "USD",
    status: entry.status,
  };
}

function serializeWalletTransaction(entry) {
  return {
    id: entry._id.toString(),
    type: entry.type,
    title: entry.description,
    date: formatDate(entry.occurredAt),
    occurredAt: entry.occurredAt,
    amount: roundMoney(entry.amount),
    currency: entry.currency || "USD",
    status: entry.status,
  };
}

function serializeVehicle(vehicle) {
  return {
    id: vehicle._id.toString(),
    name: vehicle.name,
    years: vehicle.years || "",
    year: vehicle.year || null,
    make: vehicle.make || "",
    model: vehicle.model || "",
    trim: vehicle.trim || "",
    engine: vehicle.engine || "",
    fuel: vehicle.fuel || "",
    parts: vehicle.partsCount || 0,
    image: vehicle.imageUrl || "",
    isPrimary: Boolean(vehicle.isPrimary),
    createdAt: vehicle.createdAt,
  };
}

function serializeWishlistItem(item) {
  return {
    id: item._id.toString(),
    productId: item.productId,
    name: item.name,
    brand: item.brand || "",
    category: item.category || "",
    price: roundMoney(item.price),
    currency: item.currency || "USD",
    oldPrice: item.oldPrice === null ? null : roundMoney(item.oldPrice),
    rating: item.rating || 0,
    reviews: item.reviews || 0,
    stock: item.stock || "In stock",
    image: item.imageUrl || "",
    createdAt: item.createdAt,
  };
}

function serializeAddress(address) {
  return {
    id: address._id.toString(),
    label: address.label,
    name: address.name,
    line: address.line,
    city: address.city || "",
    region: address.region || "",
    postalCode: address.postalCode || "",
    country: address.country || "",
    phone: address.phone || "",
    isDefault: Boolean(address.isDefault),
  };
}

function formatCardExpiry(month, year) {
  if (!month || !year) {
    return "";
  }
  return `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;
}

function serializePayment(payment) {
  return {
    id: payment._id.toString(),
    brand: payment.brand,
    type: payment.type,
    last4: payment.last4,
    holder: payment.holder || "",
    expires: formatCardExpiry(payment.expiresMonth, payment.expiresYear),
    isDefault: Boolean(payment.isDefault),
  };
}

function serializeKyc(kyc) {
  return {
    status: kyc.status,
    level: kyc.level,
    maxLevel: kyc.maxLevel,
    steps: (kyc.steps || []).map((step) => ({
      id: step.key,
      label: step.label,
      detail: step.detail || "",
      status: step.status,
      submittedAt: step.submittedAt,
    })),
  };
}

function serializeReturn(entry) {
  const otpIsLive =
    entry.trackingStatus === "Out for Delivery" &&
    entry.deliveryOtpExpiresAt &&
    new Date(entry.deliveryOtpExpiresAt) > new Date() &&
    !entry.deliveryOtpUsedAt;
  return {
    id: entry._id.toString(),
    code: entry.code,
    order: entry.orderRef || "",
    item: entry.item,
    reason: entry.reason,
    type: entry.type || "Return",
    status: entry.status,
    trackingStatus: entry.trackingStatus || entry.status,
    scanToken: entry.scanToken || "",
    deliveryOtp: otpIsLive ? decryptValue(entry.deliveryOtpEncrypted) : "",
    events: (entry.trackingEvents || []).map((event) => ({
      status: event.status,
      source: event.source,
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
    requested: formatDate(entry.requestedAt),
    requestedAt: entry.requestedAt,
    refund: roundMoney(entry.refund),
    timeline: (entry.timeline || []).map((step) => ({
      label: step.label,
      date: step.date,
      done: Boolean(step.done),
    })),
  };
}

function serializeTicket(ticket) {
  return {
    id: ticket._id.toString(),
    reference: ticket.reference,
    subject: ticket.subject,
    orderRef: ticket.orderRef || "",
    message: ticket.message,
    status: ticket.status,
    createdAt: ticket.createdAt,
  };
}

/*
 * Builds the four step return timeline from the current status so the API
 * always returns a consistent progress view.
 */
function buildReturnTimeline(
  status,
  requestedAt,
  { labels, now = new Date() },
) {
  const reached = {
    Requested: 0,
    Approved: 1,
    "In transit": 2,
    Refunded: 3,
    Rejected: 0,
    "Replacement Shipped": 2,
    Completed: 3,
  }[status];

  return labels.map((label, index) => {
    const done = index <= reached;
    if (!done) {
      return { label, date: "Pending", done: false };
    }
    if (index === 0) {
      return { label, date: shortDate(requestedAt), done: true };
    }
    if (status === "Rejected") {
      return {
        label,
        date: index === 1 ? "Not approved" : "Pending",
        done: false,
      };
    }
    return { label, date: shortDate(now), done: true };
  });
}

module.exports = {
  roundMoney,
  formatDate,
  shortDate,
  parsePagination,
  serializeCustomer,
  serializePreferences,
  serializeWallet,
  serializeLedgerEntry,
  serializeWalletTransaction,
  serializeVehicle,
  serializeWishlistItem,
  serializeAddress,
  serializePayment,
  serializeKyc,
  serializeReturn,
  serializeTicket,
  buildReturnTimeline,
};
