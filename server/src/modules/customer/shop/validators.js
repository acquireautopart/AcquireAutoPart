const {
  MAX_CART_ITEM_QUANTITY,
  MAX_CART_LINES,
  PAYMENT_METHODS,
  ORDER_STATUSES,
} = require("./constants");

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

/* One cart line. The client only sends the catalogue snapshot it is showing. */
function getCartItemInput(body) {
  if (!isPlainObject(body)) {
    return { error: "Choose a product to add to your cart." };
  }

  const productId = text(body.productId ?? body.id, 64);
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

  const quantity =
    body.quantity === undefined
      ? 1
      : numberInRange(body.quantity, 1, MAX_CART_ITEM_QUANTITY);
  if (quantity === null) {
    return {
      error: `Quantity must be between 1 and ${MAX_CART_ITEM_QUANTITY}.`,
    };
  }

  return {
    productId,
    name,
    brand: text(body.brand, 80),
    category: text(body.category, 80),
    variant: text(body.variant, 120),
    variantId: text(body.variantId, 64),
    price,
    oldPrice,
    quantity,
    imageUrl: text(body.image, 500) || text(body.imageUrl, 500),
  };
}

/* Quantity update keeps its own validator because 0 means "remove the line". */
function getCartQuantityInput(body) {
  if (!isPlainObject(body)) {
    return { error: "Enter the quantity you want." };
  }

  const quantity = Number(body.quantity);
  if (
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    quantity > MAX_CART_ITEM_QUANTITY
  ) {
    return {
      error: `Quantity must be between 0 and ${MAX_CART_ITEM_QUANTITY}.`,
    };
  }

  return { quantity };
}

/* Used after sign-in to fold the guest cart into the server cart. */
function getCartMergeInput(body) {
  const incoming = Array.isArray(body?.items) ? body.items : [];
  const items = [];

  for (const entry of incoming.slice(0, MAX_CART_LINES)) {
    const parsed = getCartItemInput(entry);
    if (!parsed.error) {
      items.push(parsed);
    }
  }

  return { items };
}

function getCheckoutInput(body) {
  if (!isPlainObject(body)) {
    return { error: "Choose a delivery address and a payment method." };
  }

  const addressId = text(body.addressId, 40);
  if (!addressId) {
    return { error: "Select a delivery address before placing the order." };
  }

  const paymentMethod = PAYMENT_METHODS.includes(body.paymentMethod)
    ? body.paymentMethod
    : null;
  if (!paymentMethod) {
    return { error: "Choose how you want to pay for this order." };
  }

  const paymentId = text(body.paymentId, 40);
  if (paymentMethod === "Card" && !paymentId) {
    return { error: "Choose the saved card you want to pay with." };
  }
  const couponCode = text(body.couponCode, 32).toUpperCase();

  /*
   * Optional selection from the cart. When present only those lines are
   * ordered; omitting it keeps the old "order the whole cart" behaviour.
   */
  let productIds = null;
  if (Array.isArray(body.productIds)) {
    const unique = new Set();
    for (const entry of body.productIds.slice(0, MAX_CART_LINES)) {
      const id = text(entry, 64);
      if (id) unique.add(id);
    }
    if (!unique.size) {
      return { error: "Select at least one item to place the order." };
    }
    productIds = [...unique];
  }

  return { addressId, paymentMethod, paymentId, productIds, couponCode };
}

function getOrderQuery(query) {
  const status = ORDER_STATUSES.includes(query?.status) ? query.status : "all";
  const parsedYear = Number.parseInt(query?.year, 10);
  const year =
    Number.isInteger(parsedYear) && parsedYear > 2000 ? parsedYear : null;
  return { status, year };
}

module.exports = {
  getCartItemInput,
  getCartQuantityInput,
  getCartMergeInput,
  getCheckoutInput,
  getOrderQuery,
};
