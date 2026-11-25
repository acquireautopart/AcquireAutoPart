const { CONTACT_SUBJECTS, WISHLIST_SORTS } = require("./constants");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+()\d][\d\s()+-]{5,23}$/;
const last4Pattern = /^[A-Za-z0-9]{2,4}$/;

const ADDRESS_LABELS = ["Home", "Office", "Workshop", "Other"];
const PAYMENT_BRANDS = [
  "Visa",
  "Mastercard",
  "Amex",
  "RuPay",
  "PayPal",
  "Other",
];
const PAYMENT_TYPES = ["Credit card", "Debit card", "Wallet"];
const PREFERENCE_KEYS = [
  "orderUpdates",
  "priceDrops",
  "newsletter",
  "twoFactor",
];

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/* Returns a trimmed string, or "" when the value is missing / too long. */
function text(value, max) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  return trimmed.length > max ? "" : trimmed;
}

function numberInRange(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }
  return parsed;
}

function getProfileUpdate(body) {
  if (!isPlainObject(body)) {
    return { error: "Enter the account details you want to update." };
  }

  const update = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 80) {
      return { error: "Name must be between 2 and 80 characters." };
    }
    update.name = name;
  }

  if (body.email !== undefined) {
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !emailPattern.test(email)) {
      return { error: "Enter a valid email address." };
    }
    update.email = email;
  }

  if (body.phone !== undefined) {
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (phone && (phone.length > 24 || !phonePattern.test(phone))) {
      return { error: "Enter a valid mobile number." };
    }
    update.phone = phone;
  }

  if (!Object.keys(update).length) {
    return { error: "Nothing to update." };
  }

  return update;
}

function getPreferencesUpdate(body) {
  if (!isPlainObject(body)) {
    return { error: "Enter the preferences you want to change." };
  }

  const update = {};
  for (const key of PREFERENCE_KEYS) {
    if (body[key] === undefined) {
      continue;
    }
    if (typeof body[key] !== "boolean") {
      return { error: `${key} must be true or false.` };
    }
    update[key] = body[key];
  }

  if (!Object.keys(update).length) {
    return { error: "Nothing to update." };
  }

  return update;
}

function getPasswordChange(body) {
  if (!isPlainObject(body)) {
    return { error: "Enter your current and new password." };
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword) {
    return { error: "Enter your current password." };
  }

  if (newPassword.length < 8 || Buffer.byteLength(newPassword, "utf8") > 72) {
    return {
      error:
        "New password must be at least 8 characters and no more than 72 bytes.",
    };
  }

  if (newPassword === currentPassword) {
    return {
      error: "New password must be different from your current password.",
    };
  }

  return { currentPassword, newPassword };
}

function getWishlistItem(body) {
  if (!isPlainObject(body)) {
    return { error: "Enter the part you want to save." };
  }

  const productId = text(body.productId, 64);
  if (!productId) {
    return { error: "A valid product id is required." };
  }

  const name = text(body.name, 200);
  if (!name) {
    return { error: "A product name is required." };
  }

  const price = numberInRange(body.price, 0, 1000000);
  if (price === null) {
    return { error: "Enter a valid price." };
  }
  const currency =
    typeof body.currency === "string" && /^[A-Z]{3}$/.test(body.currency)
      ? body.currency
      : "USD";

  let oldPrice = null;
  if (
    body.oldPrice !== undefined &&
    body.oldPrice !== null &&
    body.oldPrice !== ""
  ) {
    oldPrice = numberInRange(body.oldPrice, 0, 1000000);
    if (oldPrice === null) {
      return { error: "Enter a valid original price." };
    }
  }

  const rating =
    body.rating === undefined ? 0 : numberInRange(body.rating, 0, 5);
  if (rating === null) {
    return { error: "Rating must be between 0 and 5." };
  }

  const reviews =
    body.reviews === undefined ? 0 : numberInRange(body.reviews, 0, 100000000);
  if (reviews === null) {
    return { error: "Enter a valid review count." };
  }

  return {
    productId,
    name,
    brand: text(body.brand, 80),
    category: text(body.category, 80),
    price,
    currency,
    oldPrice,
    rating,
    reviews,
    stock: text(body.stock, 60) || "In stock",
    imageUrl: text(body.image, 500) || text(body.imageUrl, 500),
  };
}

function getWishlistQuery(query) {
  const term = text(query?.q ?? "", 80).toLowerCase();
  const sort = WISHLIST_SORTS.includes(query?.sort) ? query.sort : "recent";
  return { term, sort };
}

function getProductAlertInput(body) {
  if (!isPlainObject(body)) return { error: "Enter alert details." };
  const productId = text(body.productId, 64);
  if (!productId) return { error: "Choose a product to watch." };
  const notifyPriceDrop = body.notifyPriceDrop !== false;
  const notifyRestock = body.notifyRestock !== false;
  if (!notifyPriceDrop && !notifyRestock) return { error: "Choose a price or stock alert." };
  let targetPrice;
  if (body.targetPrice !== undefined && body.targetPrice !== null && body.targetPrice !== "") {
    targetPrice = numberInRange(body.targetPrice, 0, 1000000);
    if (targetPrice === null) return { error: "Enter a valid alert price." };
  }
  return { productId, targetPrice, notifyPriceDrop, notifyRestock };
}

function getVehicleInput(body, { partial = false } = {}) {
  if (!isPlainObject(body)) {
    return { error: "Enter your vehicle details." };
  }

  const update = {};

  if (body.name !== undefined || !partial) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 1 || name.length > 120) {
      return { error: "Vehicle name must be between 1 and 120 characters." };
    }
    update.name = name;
  }

  if (body.years !== undefined) {
    update.years = text(body.years, 40);
  }
  if (body.year !== undefined) {
    if (body.year === "" || body.year === null) update.year = null;
    else {
      const year = numberInRange(body.year, 1900, 2100);
      if (year === null || !Number.isInteger(year)) return { error: "Enter a valid vehicle year." };
      update.year = year;
    }
  }
  if (body.make !== undefined) update.make = text(body.make, 80);
  if (body.model !== undefined) update.model = text(body.model, 100);
  if (body.trim !== undefined) update.trim = text(body.trim, 80);
  if (body.engine !== undefined) {
    update.engine = text(body.engine, 80);
  }
  if (body.fuel !== undefined) {
    update.fuel = text(body.fuel, 40);
  }
  if (body.parts !== undefined || body.partsCount !== undefined) {
    const parts = numberInRange(body.parts ?? body.partsCount, 0, 100000);
    if (parts === null) {
      return { error: "Enter a valid parts count." };
    }
    update.partsCount = parts;
  }
  if (body.image !== undefined || body.imageUrl !== undefined) {
    update.imageUrl = text(body.image, 500) || text(body.imageUrl, 500);
  }

  if (!Object.keys(update).length) {
    return { error: "Nothing to update." };
  }

  return update;
}

function getAddressInput(body) {
  if (!isPlainObject(body)) {
    return { error: "Enter the address details." };
  }

  const label = ADDRESS_LABELS.includes(body.label) ? body.label : "Home";

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 120) {
    return { error: "Recipient name must be between 2 and 120 characters." };
  }

  const line = typeof body.line === "string" ? body.line.trim() : "";
  if (line.length < 5 || line.length > 300) {
    return { error: "Street address must be between 5 and 300 characters." };
  }

  const city = text(body.city, 120);
  if (!city) {
    return { error: "Enter a valid city." };
  }

  const region = text(body.region, 120) || "";

  const postalCode =
    typeof body.postalCode === "string" ? body.postalCode.trim() : "";
  if (postalCode.length > 20) {
    return { error: "Enter a valid postal code." };
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (phone && (phone.length > 24 || !phonePattern.test(phone))) {
    return { error: "Enter a valid contact number." };
  }

  return {
    label,
    name,
    line,
    city,
    region,
    postalCode,
    country: text(body.country, 80) || "India",
    phone,
  };
}

function getPaymentInput(body) {
  if (!isPlainObject(body)) {
    return { error: "Enter the payment method details." };
  }

  /*
   * The raw card number and CVV are intentionally rejected: only the masked
   * metadata that the customer is allowed to see back is accepted.
   */
  if (body.cardNumber || body.number || body.cvv || body.cvc) {
    return {
      error:
        "Raw card numbers and CVV values are never accepted by this API. Send the masked details only.",
    };
  }

  const brand = PAYMENT_BRANDS.includes(body.brand) ? body.brand : null;
  if (!brand) {
    return { error: "Choose a supported card or wallet brand." };
  }

  const type = PAYMENT_TYPES.includes(body.type) ? body.type : "Credit card";
  if (type === "Wallet" && brand !== "PayPal") {
    return { error: "Only PayPal wallets are supported right now." };
  }

  const last4 = typeof body.last4 === "string" ? body.last4.trim() : "";
  if (!last4Pattern.test(last4)) {
    return { error: "Enter the last 2 to 4 digits shown on the card." };
  }

  const holder = text(body.holder, 120);
  if (type !== "Wallet" && !holder) {
    return { error: "Enter the cardholder name." };
  }

  let expiresMonth = null;
  let expiresYear = null;

  if (type !== "Wallet") {
    expiresMonth = numberInRange(body.expiresMonth, 1, 12);
    if (expiresMonth === null) {
      return { error: "Enter a valid expiry month." };
    }

    const currentYear = new Date().getFullYear();
    expiresYear = numberInRange(
      body.expiresYear,
      currentYear,
      currentYear + 30,
    );
    if (expiresYear === null) {
      return { error: "Enter a valid expiry year." };
    }
  }

  return { brand, type, last4, holder, expiresMonth, expiresYear };
}

function getAmount(body, { min = 1, max = 100000, label = "amount" } = {}) {
  if (!isPlainObject(body)) {
    return { error: `Enter a valid ${label}.` };
  }

  const raw =
    typeof body.amount === "string" ? body.amount.trim() : body.amount;
  const amount = Number(raw);

  if (!Number.isFinite(amount) || amount < min || amount > max) {
    return { error: `${label} must be between ${min} and ${max}.` };
  }

  /* Money is stored with at most two decimals. */
  return { amount: Math.round(amount * 100) / 100 };
}

function getKycSubmission(body, { requireDocument = true } = {}) {
  if (!isPlainObject(body)) {
    /* Email and phone are verified from the account, so no document is needed. */
    return requireDocument
      ? { error: "Attach a document number or an uploaded file." }
      : { documentNumber: "", documentUrl: "" };
  }

  const documentNumber = text(body.documentNumber, 60);
  const documentUrl = text(body.documentUrl, 500);

  if (requireDocument && !documentNumber && !documentUrl) {
    return {
      error: "Add a document number or an uploaded file before submitting.",
    };
  }

  return { documentNumber, documentUrl };
}

function getReturnInput(body) {
  if (!isPlainObject(body)) {
    return { error: "Enter the return details." };
  }

  const orderRef = text(body.orderRef ?? body.orderId, 40);
  if (orderRef.length < 3) {
    return { error: "Enter a valid order id." };
  }

  const type = body.type === undefined ? "Return" : text(body.type, 20);
  if (!["Return", "Replacement"].includes(type)) {
    return { error: "Choose Return or Replacement." };
  }

  const item = typeof body.item === "string" ? body.item.trim() : "";
  if (item.length < 3 || item.length > 200) {
    return { error: "Enter the item you want to return." };
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3 || reason.length > 300) {
    return { error: "Tell us why you are returning this item." };
  }

  let refund = 0;
  if (body.refund !== undefined && body.refund !== null && body.refund !== "") {
    const parsed = numberInRange(body.refund, 0, 1000000);
    if (parsed === null) {
      return { error: "Enter a valid refund amount." };
    }
    refund = parsed;
  }

  return { orderRef, item, reason, refund, type };
}

function getContactInput(body) {
  if (!isPlainObject(body)) {
    return { error: "Enter your message." };
  }

  const subject = text(body.subject, 120) || CONTACT_SUBJECTS[0];

  const orderRef = text(body.orderRef ?? body.orderId, 40);

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 10 || message.length > 2000) {
    return { error: "Message must be between 10 and 2000 characters." };
  }

  return { subject, orderRef, message };
}

module.exports = {
  getProfileUpdate,
  getPreferencesUpdate,
  getPasswordChange,
  getWishlistItem,
  getWishlistQuery,
  getProductAlertInput,
  getVehicleInput,
  getAddressInput,
  getPaymentInput,
  getAmount,
  getKycSubmission,
  getReturnInput,
  getContactInput,
};
