const shopService = require("./service");
const { serializeCart, serializeOrder } = require("./helpers");
const {
  getCartItemInput,
  getCartQuantityInput,
  getCartMergeInput,
  getCheckoutInput,
  getOrderQuery,
} = require("./validators");

function reject(res, result) {
  return res.status(400).json({ message: result.error });
}

/* ------------------------------------------------------------------- cart -- */

async function getCart(req, res) {
  const cart = await shopService.getCart(req.customer._id);
  return res.json({ cart: serializeCart(cart) });
}

async function addCartItem(req, res) {
  const parsed = getCartItemInput(req.body);
  if (parsed.error) {
    return reject(res, parsed);
  }

  const cart = await shopService.addCartItem(req.customer._id, parsed);
  return res.status(201).json({ cart: serializeCart(cart) });
}

async function updateCartItem(req, res) {
  const parsed = getCartQuantityInput(req.body);
  if (parsed.error) {
    return reject(res, parsed);
  }

  const cart = await shopService.setCartItemQuantity(
    req.customer._id,
    req.params.productId,
    parsed.quantity,
  );
  return res.json({ cart: serializeCart(cart) });
}

async function removeCartItem(req, res) {
  const cart = await shopService.removeCartItem(
    req.customer._id,
    req.params.productId,
  );
  return res.json({ cart: serializeCart(cart) });
}

async function clearCart(req, res) {
  const cart = await shopService.clearCart(req.customer._id);
  return res.json({ cart: serializeCart(cart) });
}

async function mergeCart(req, res) {
  const parsed = getCartMergeInput(req.body);
  const cart = await shopService.mergeCart(req.customer._id, parsed.items);
  return res.json({ cart: serializeCart(cart) });
}

/* ----------------------------------------------------------------- orders -- */

async function getOrders(req, res) {
  const { status, year } = getOrderQuery(req.query);
  const result = await shopService.getOrders(req.customer._id, {
    status,
    year,
  });

  return res.json({
    orders: result.orders.map(serializeOrder),
    summary: result.summary,
    years: result.years,
  });
}

async function getOrder(req, res) {
  const order = await shopService.getOrder(req.customer._id, req.params.id);
  return res.json({ order: serializeOrder(order) });
}

async function createOrder(req, res) {
  const parsed = getCheckoutInput(req.body);
  if (parsed.error) {
    return reject(res, parsed);
  }

  const result = await shopService.placeOrder(req.customer._id, {
    ...parsed,
    origin: req.get("origin"),
    resend: req.app.locals.resend,
  });
  if (result.checkoutUrl) {
    return res.status(201).json({
      order: serializeOrder(result.order),
      checkoutUrl: result.checkoutUrl,
    });
  }
  return res.status(201).json({ order: serializeOrder(result) });
}

async function quoteOrder(req, res) {
  const parsed = getCheckoutInput(req.body);
  if (parsed.error) return reject(res, parsed);
  const quote = await shopService.placeOrder(req.customer._id, {
    ...parsed,
    preview: true,
  });
  return res.json({ quote });
}

async function validateCoupon(req, res) {
  const productIds = Array.isArray(req.body?.productIds)
    ? req.body.productIds.map((id) => String(id).slice(0, 64))
    : null;
  const result = await shopService.validateCoupon(req.customer._id, {
    couponCode: req.body?.couponCode,
    productIds,
  });
  return res.json(result);
}

async function cancelOrder(req, res) {
  const order = await shopService.cancelOrder(req.customer._id, req.params.id);
  return res.json({ order: serializeOrder(order) });
}

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeCart,
  getOrders,
  getOrder,
  createOrder,
  quoteOrder,
  validateCoupon,
  cancelOrder,
};
