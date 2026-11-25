const mongoose = require("mongoose");
const crypto = require("node:crypto");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Address = require("../models/Address");
const PaymentMethod = require("../models/PaymentMethod");
const Wallet = require("../models/Wallet");
const LedgerEntry = require("../models/LedgerEntry");
const SellerProduct = require("../../seller/models/Product");
const Seller = require("../../seller/models/Seller");
const { createNewOrderNotifications } = require("../../seller/notifications");
const SellerDiscount = require("../../seller/models/Discount");
const stripeService = require("../../payments/stripe/service");
const categoryService = require("../../admin/categoryService");
const HttpError = require("../../../utils/HttpError");
const { MAX_CART_LINES, MAX_CART_ITEM_QUANTITY } = require("./constants");
const { getCountry } = require("../../market/countries");
const { roundMoney, computeTotals, buildOrderTimeline } = require("./helpers");

function roundCurrencyMoney(amount, currency) {
  const minorUnitsPerMajor = stripeService.toMinorUnits(
    1,
    String(currency || "USD").toLowerCase(),
  );
  return Math.round(Number(amount) * minorUnitsPerMajor) / minorUnitsPerMajor;
}

function requireObjectId(id, label = "record") {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, `That ${label} is no longer available.`);
  }
  return id;
}

/* ------------------------------------------------------------------- cart -- */

async function loadCart(customerId) {
  const existing = await Cart.findOne({ customer: customerId });
  if (existing) {
    return existing;
  }
  try {
    return await Cart.create({ customer: customerId, items: [] });
  } catch (error) {
    if (error.code === 11000) {
      return Cart.findOne({ customer: customerId });
    }
    throw error;
  }
}

/* Adds to an existing line instead of duplicating it, like an e-commerce cart. */
function cartLineKey(item) {
  return item.variantId
    ? `${item.productId}::${item.variantId}`
    : item.productId;
}
function splitCartLineKey(value) {
  const [productId, variantId = ""] = String(value).split("::");
  return { productId, variantId };
}
async function upsertLine(cart, incoming) {
  const line = cart.items.find(
    (item) => cartLineKey(item) === cartLineKey(incoming),
  );
  const quantity = Math.min(
    (line?.quantity || 0) + incoming.quantity,
    MAX_CART_ITEM_QUANTITY,
  );
  const current = await refreshSellerLine({ ...incoming, quantity });
  if (
    cart.items.some(
      (item) => item.currency && item.currency !== current.currency,
    )
  ) {
    throw new HttpError(
      409,
      "Your cart contains products priced in another currency. Clear it before switching marketplace countries.",
    );
  }

  if (!line) {
    if (cart.items.length >= MAX_CART_LINES) {
      throw new HttpError(
        400,
        "Your cart is full. Remove an item to add another.",
      );
    }
    cart.items.push(current);
    return;
  }

  line.quantity = quantity;
  /* Refresh the catalogue snapshot in case price or name changed. */
  line.name = current.name;
  line.brand = current.brand;
  line.category = current.category;
  line.subcategory = current.subcategory;
  line.variant = current.variant;
  line.variantId = current.variantId;
  line.price = current.price;
  line.currency = current.currency;
  line.oldPrice = current.oldPrice;
  line.imageUrl = current.imageUrl;
}

async function refreshSellerLine(incoming) {
  if (!mongoose.isValidObjectId(incoming.productId))
    throw new HttpError(404, "This product is no longer available.");
  const product = await SellerProduct.findOne({
    _id: incoming.productId,
    status: "Active",
  }).lean();
  if (!product)
    throw new HttpError(404, "This seller product is no longer available.");
  const seller = await Seller.findById(product.seller)
    .select("adminStatus verified country settings.currency")
    .lean();
  if (
    !seller ||
    !(
      ["Approved"].includes(seller.adminStatus) ||
      (!seller.adminStatus && seller.verified)
    )
  )
    throw new HttpError(
      409,
      "This seller is not approved to accept marketplace orders.",
    );
  const variant = incoming.variantId
    ? product.variants.find(
        (entry) => entry._id.toString() === incoming.variantId,
      )
    : null;
  if (incoming.variantId && !variant)
    throw new HttpError(404, "That product variant is no longer available.");
  const available = variant ? variant.stock : product.stock;
  if (available < incoming.quantity)
    throw new HttpError(
      409,
      `Only ${available} units of ${product.name} are available.`,
    );
  const sellerPrice = variant?.price ?? product.price;
  const markupPercent = await categoryService.getMarkupPercent(product.category);
  return {
    ...incoming,
    name: product.name,
    brand: product.brand || "",
    category: product.category,
    subcategory: product.subcategory || "",
    variant: variant?.name || incoming.variant || "",
    variantId: variant?._id.toString() || "",
    price: categoryService.storefrontPrice(sellerPrice, markupPercent),
    sellerPrice,
    currency: seller.settings?.currency || "USD",
    oldPrice:
      product.compareAtPrice == null
        ? null
        : categoryService.storefrontPrice(
            product.compareAtPrice,
            markupPercent,
          ),
    imageUrl: product.images?.[0] || "",
  };
}
async function restoreSellerLine(item) {
  const increments = { stock: item.quantity, soldCount: -item.quantity };
  if (item.variantId) increments["variants.$.stock"] = item.quantity;
  const filter = { _id: item.productId };
  if (item.variantId) filter["variants._id"] = item.variantId;
  return SellerProduct.updateOne(filter, { $inc: increments });
}

async function getCart(customerId) {
  const cart = await loadCart(customerId);
  const currentItems = cart.items.filter((item) =>
    mongoose.isValidObjectId(item.productId),
  );
  if (currentItems.length !== cart.items.length) {
    cart.items = currentItems;
    await cart.save();
  }
  return cart;
}

async function addCartItem(customerId, payload) {
  const cart = await loadCart(customerId);
  await upsertLine(cart, payload);
  cart.markModified("items");
  await cart.save();
  return cart;
}

async function setCartItemQuantity(customerId, productId, quantity) {
  const cart = await loadCart(customerId);
  const { productId: actualProductId, variantId } = splitCartLineKey(productId);
  const index = cart.items.findIndex((item) => cartLineKey(item) === productId);
  if (index === -1) {
    throw new HttpError(404, "That item is no longer in your cart.");
  }

  if (quantity > 0) {
    const current = await refreshSellerLine({
      productId: actualProductId,
      variantId,
      quantity,
    });
    cart.items[index].price = current.price;
    cart.items[index].name = current.name;
    cart.items[index].brand = current.brand;
    cart.items[index].category = current.category;
    cart.items[index].subcategory = current.subcategory;
    cart.items[index].variant = current.variant;
    cart.items[index].oldPrice = current.oldPrice;
    cart.items[index].currency = current.currency;
    cart.items[index].imageUrl = current.imageUrl;
  }

  if (quantity <= 0) {
    cart.items.splice(index, 1);
  } else {
    cart.items[index].quantity = quantity;
  }

  cart.markModified("items");
  await cart.save();
  return cart;
}

async function removeCartItem(customerId, productId) {
  const cart = await loadCart(customerId);
  const index = cart.items.findIndex((item) => cartLineKey(item) === productId);
  if (index >= 0) {
    cart.items.splice(index, 1);
    cart.markModified("items");
    await cart.save();
  }
  return cart;
}

async function clearCart(customerId) {
  const cart = await loadCart(customerId);
  cart.items = [];
  await cart.save();
  return cart;
}

/* Folds the device (guest) cart into the account cart right after sign-in. */
async function mergeCart(customerId, items) {
  const cart = await loadCart(customerId);

  for (const incoming of items) {
    await upsertLine(cart, incoming);
  }

  cart.markModified("items");
  await cart.save();
  return cart;
}

/* --------------------------------------------------------------- payments -- */

async function ensureWallet(customerId) {
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

/*
 * Conditional update keeps the wallet from ever going negative, the same
 * guard the withdrawal flow uses.
 */
async function chargeWallet(customerId, amount, { description, reference }) {
  await ensureWallet(customerId);

  const wallet = await Wallet.findOneAndUpdate(
    { customer: customerId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true },
  );

  if (!wallet) {
    throw new HttpError(
      400,
      "Not enough wallet balance for this order. Top up your wallet or choose another payment method.",
    );
  }

  await LedgerEntry.create({
    customer: customerId,
    occurredAt: new Date(),
    reference,
    description,
    channel: "Wallet",
    type: "debit",
    amount: roundMoney(amount),
    currency: wallet.currency || "USD",
    balanceAfter: roundMoney(wallet.balance),
    status: "Completed",
  });

  return wallet;
}

async function refundWallet(customerId, amount, { description, reference }) {
  await ensureWallet(customerId);

  const wallet = await Wallet.findOneAndUpdate(
    { customer: customerId },
    { $inc: { balance: amount } },
    { new: true },
  );

  await LedgerEntry.create({
    customer: customerId,
    occurredAt: new Date(),
    reference,
    description,
    channel: "Wallet",
    type: "credit",
    amount: roundMoney(amount),
    currency: wallet.currency || "USD",
    balanceAfter: roundMoney(wallet.balance),
    status: "Completed",
  });

  return wallet;
}

/* ---------------------------------------------------------------- orders -- */

function makeOrderCode() {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ORD-${year}-${random}`;
}

async function placeOrder(
  customerId,
  {
    addressId,
    paymentMethod,
    paymentId,
    productIds,
    couponCode,
    origin,
    resend,
    preview = false,
  },
) {
  const cart = await loadCart(customerId);
  if (!cart.items.length) {
    throw new HttpError(
      400,
      "Your cart is empty. Add a part before checking out.",
    );
  }

  /* Checkout only the lines the customer ticked; default to the whole cart. */
  const selected = productIds
    ? cart.items.filter((item) => productIds.includes(cartLineKey(item)))
    : [...cart.items];

  if (!selected.length) {
    throw new HttpError(400, "Select at least one item to place the order.");
  }

  requireObjectId(addressId, "address");
  const address = await Address.findOne({
    _id: addressId,
    customer: customerId,
  }).lean();
  if (!address) {
    throw new HttpError(404, "That delivery address was not found.");
  }

  const currentSelected = await Promise.all(
    selected.map((item) =>
      refreshSellerLine(item.toObject ? item.toObject() : item),
    ),
  );
  const items = currentSelected.map((item) => ({
    productId: item.productId,
    name: item.name,
    brand: item.brand,
    category: item.category,
    subcategory: item.subcategory || "",
    variant: item.variant,
    variantId: item.variantId || "",
    price: item.price,
    sellerPrice: item.sellerPrice ?? item.price,
    categoryMarkupAmount: roundMoney(
      Number(item.price) - Number(item.sellerPrice ?? item.price),
    ),
    currency: item.currency || "USD",
    oldPrice: item.oldPrice,
    imageUrl: item.imageUrl,
    quantity: item.quantity,
  }));
  if (new Set(items.map((item) => item.currency)).size > 1) {
    throw new HttpError(
      409,
      "An order can only contain products priced in one currency. Clear your cart and choose one marketplace country.",
    );
  }
  const totals = computeTotals(items);
  const sellerProductIds = items
    .filter((item) => mongoose.isValidObjectId(item.productId))
    .map((item) => item.productId);
  const sellerProducts = sellerProductIds.length
    ? await SellerProduct.find({
        _id: { $in: sellerProductIds },
        status: "Active",
      })
        .select("_id seller")
        .lean()
    : [];
  const sellerIds = [
    ...new Set(sellerProducts.map((product) => product.seller.toString())),
  ];
  const sellers = sellerIds.length
    ? await Seller.find({ _id: { $in: sellerIds } })
        .select(
          "_id storeName country settings.taxRate settings.shippingFee stripeAccountId",
        )
        .lean()
    : [];
  const sellerById = new Map(
    sellers.map((seller) => [seller._id.toString(), seller]),
  );
  const sellerForProduct = new Map(
    sellerProducts.map((product) => [
      product._id.toString(),
      product.seller.toString(),
    ]),
  );
  if (paymentMethod === "Stripe") {
    if (sellers.length !== sellerIds.length) {
      throw new HttpError(
        409,
        "A seller in this order is no longer available.",
      );
    }
    for (const seller of sellers) {
      if (!seller.stripeAccountId) {
        throw new HttpError(
          409,
          `${seller.storeName || "A seller"} must connect Stripe before accepting online payments.`,
        );
      }
      const account = await stripeService.getConnectedAccount(
        seller.stripeAccountId,
      );
      if (
        !account.details_submitted ||
        !account.payouts_enabled ||
        account.capabilities?.transfers !== "active"
      ) {
        throw new HttpError(
          409,
          `${seller.storeName || "A seller"} has not completed Stripe payout verification.`,
        );
      }
    }
  }
  let sellerShipping = 0;
  for (const sellerId of sellerIds) {
    const seller = sellerById.get(sellerId);
    sellerShipping += Number(seller?.settings?.shippingFee) || 0;
  }
  totals.shipping = Math.round((totals.shipping + sellerShipping) * 100) / 100;

  let appliedDiscount = { code: "", seller: null, amount: 0 };
  let discountRecord = null;
  if (couponCode) {
    const now = new Date();
    discountRecord = await SellerDiscount.findOne({
      code: couponCode,
      active: true,
      startsAt: { $lte: now },
      $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
    }).lean();
    if (!discountRecord)
      throw new HttpError(400, "That coupon code is invalid or expired.");
    const eligibleSubtotal = items
      .filter(
        (item) =>
          sellerForProduct.get(item.productId) ===
          discountRecord.seller.toString(),
      )
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (!eligibleSubtotal)
      throw new HttpError(
        400,
        "That coupon does not apply to products in this order.",
      );
    const amount =
      discountRecord.type === "percentage"
        ? (eligibleSubtotal * discountRecord.value) / 100
        : Math.min(eligibleSubtotal, discountRecord.value);
    appliedDiscount = {
      code: discountRecord.code,
      seller: discountRecord.seller,
      amount: Math.round(amount * 100) / 100,
    };
    totals.savings =
      Math.round((totals.savings + appliedDiscount.amount) * 100) / 100;
  }
  let sellerTax = 0;
  for (const sellerId of sellerIds) {
    const seller = sellerById.get(sellerId);
    let taxable = items
      .filter((item) => sellerForProduct.get(item.productId) === sellerId)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (appliedDiscount.seller?.toString() === sellerId)
      taxable = Math.max(0, taxable - appliedDiscount.amount);
    sellerTax += (taxable * (Number(seller?.settings?.taxRate) || 0)) / 100;
  }
  totals.tax = Math.round(sellerTax * 100) / 100;
  const baseTotal = Math.max(
    0,
    roundCurrencyMoney(
      (totals.subtotal +
        totals.shipping +
        totals.tax -
        (Number(appliedDiscount.amount) || 0)),
      items[0]?.currency || "USD",
    ),
  );
  const feeRate = 0;
  let categoryMarkup = 0;
  const sellerFees = new Map(
    sellerIds.map((sellerId) => {
      const sellerItems = items
        .filter((item) => sellerForProduct.get(item.productId) === sellerId)
      const sellerRetailGross = sellerItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const sellerGross = sellerItems.reduce(
        (sum, item) =>
          sum + Number(item.sellerPrice ?? item.price) * item.quantity,
        0,
      );
      const sellerMarkup = sellerRetailGross - sellerGross;
      const retailDiscount =
        appliedDiscount.seller?.toString() === sellerId
          ? appliedDiscount.amount
          : 0;
      const sellerDiscount = sellerRetailGross
        ? (retailDiscount * sellerGross) / sellerRetailGross
        : 0;
      const markupDiscount = sellerRetailGross
        ? (retailDiscount * sellerMarkup) / sellerRetailGross
        : 0;
      categoryMarkup += Math.max(0, sellerMarkup - markupDiscount);
      const commissionableAmount = Math.max(
        0,
        roundMoney(sellerGross - sellerDiscount),
      );
      return [
        sellerId,
        { commissionableAmount, platformFee: 0, platformFeeRate: feeRate },
      ];
    }),
  );
  totals.categoryMarkup = roundCurrencyMoney(
    categoryMarkup,
    items[0]?.currency || "USD",
  );
  totals.platformFee = 0;
  totals.total = roundCurrencyMoney(
    baseTotal + totals.platformFee,
    items[0]?.currency || "USD",
  );
  const stripeTransfers = [];
  if (paymentMethod === "Stripe") {
    for (const sellerId of sellerIds) {
      const seller = sellerById.get(sellerId);
      const amount = roundMoney(sellerFees.get(sellerId).commissionableAmount);
      if (amount <= 0) continue;
      stripeTransfers.push({
        seller: sellerId,
        connectedAccountId: seller.stripeAccountId,
        amount,
        status: "pending",
      });
    }
  }

  const payment = {
    method: paymentMethod,
    brand: "",
    last4: "",
    label: "",
    paid: false,
    status: paymentMethod === "Stripe" ? "pending" : "unpaid",
    transfers: stripeTransfers,
  };
  if (paymentMethod === "Cash on delivery") {
    payment.codSettlement = {
      status: "pending",
      collectedAmount: 0,
      collectedAt: null,
      remittanceReference: "",
    };
  }

  if (preview) {
    return {
      currency: items[0]?.currency || "USD",
      totals,
      appliedDiscount,
      platformFeeRate: 0,
    };
  }

  if (paymentMethod === "Wallet") {
    const wallet = await ensureWallet(customerId);
    if (wallet.currency !== (items[0]?.currency || "USD")) {
      throw new HttpError(
        409,
        `Your wallet is in ${wallet.currency}. Choose another payment method or use the matching marketplace currency.`,
      );
    }
    if (wallet.balance < totals.total) {
      throw new HttpError(
        400,
        "Not enough wallet balance for this order. Top up your wallet or choose another payment method.",
      );
    }
  } else if (paymentMethod === "Card") {
    requireObjectId(paymentId, "payment method");
    const card = await PaymentMethod.findOne({
      _id: paymentId,
      customer: customerId,
    }).lean();
    if (!card) {
      throw new HttpError(404, "That payment method was not found.");
    }
    payment.brand = card.brand;
    payment.last4 = card.last4;
    payment.label = `${card.brand} ending ${card.last4}`;
  }

  /* Seller-managed stock is reserved at checkout. */
  let discountReserved = false;
  if (discountRecord) {
    const now = new Date();
    const reservation = await SellerDiscount.findOneAndUpdate(
      {
        _id: discountRecord._id,
        active: true,
        startsAt: { $lte: now },
        $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
        $expr: {
          $or: [{ $eq: ["$usageLimit", 0] }, { $lt: ["$uses", "$usageLimit"] }],
        },
      },
      { $inc: { uses: 1 } },
      { new: true },
    );
    if (!reservation)
      throw new HttpError(
        409,
        "That coupon has reached its usage limit or expired.",
      );
    discountReserved = true;
  }
  const releaseDiscount = async () => {
    if (discountReserved) {
      await SellerDiscount.updateOne(
        { _id: discountRecord._id, uses: { $gt: 0 } },
        { $inc: { uses: -1 } },
      );
      discountReserved = false;
    }
  };

  const sellerLines = items.filter((item) =>
    mongoose.isValidObjectId(item.productId),
  );
  const reserved = [];
  try {
    for (const item of sellerLines) {
      const filter = {
        _id: item.productId,
        status: "Active",
        stock: { $gte: item.quantity },
      };
      const increments = { stock: -item.quantity, soldCount: item.quantity };
      if (item.variantId) {
        filter.variants = {
          $elemMatch: { _id: item.variantId, stock: { $gte: item.quantity } },
        };
        increments["variants.$.stock"] = -item.quantity;
      }
      const updated = await SellerProduct.findOneAndUpdate(
        filter,
        { $inc: increments },
        { new: true },
      );
      if (updated) reserved.push({ item, sellerId: updated.seller.toString() });
      else {
        const exists = await SellerProduct.exists({
          _id: item.productId,
          status: "Active",
        });
        if (exists)
          throw new HttpError(
            409,
            `${item.name} is out of stock or has changed. Update your cart and try again.`,
          );
      }
    }
  } catch (error) {
    await Promise.all(reserved.map(({ item }) => restoreSellerLine(item)));
    await releaseDiscount();
    throw error;
  }

  const placedAt = new Date();
  let order;
  try {
    order = await Order.create({
      customer: customerId,
      code: makeOrderCode(),
      items,
      currency: items[0]?.currency || "USD",
      address: {
        label: address.label,
        name: address.name,
        line: address.line,
        city: address.city,
        region: address.region,
        postalCode: address.postalCode,
        country: address.country,
        phone: address.phone,
      },
      payment,
      totals,
      appliedDiscount,
      status: "Processing",
      placedAt,
      sellerFulfillments: [
        ...new Set(reserved.map((entry) => entry.sellerId)),
      ].map((seller) => ({
        seller,
        status: "New",
        scanToken: crypto.randomBytes(32).toString("hex"),
        ...sellerFees.get(seller.toString()),
        platformFeePayer: "buyer",
        events: [{ status: "New", source: "system", occurredAt: placedAt }],
      })),
      timeline: buildOrderTimeline("Processing", placedAt),
    });
  } catch (error) {
    await Promise.all(reserved.map(({ item }) => restoreSellerLine(item)));
    await releaseDiscount();
    throw error;
  }

  if (paymentMethod === "Stripe") {
    try {
      const session = await stripeService.createCheckoutSession(order, origin);
      order.payment.stripeSessionId = session.id;
      await order.save();
      return { order, checkoutUrl: session.url };
    } catch (error) {
      await Promise.all(reserved.map(({ item }) => restoreSellerLine(item)));
      await Order.deleteOne({ _id: order._id });
      await releaseDiscount();
      throw error;
    }
  }

  /* Wallet is charged only after the order row exists, so a failed charge
   * leaves the cart untouched. */
  if (paymentMethod === "Wallet") {
    try {
      await chargeWallet(customerId, totals.total, {
        description: `Payment for order ${order.code}`,
        reference: order.code,
      });
      order.payment.paid = true;
      order.payment.status = "paid";
      await order.save();
    } catch (error) {
      await Promise.all(reserved.map(({ item }) => restoreSellerLine(item)));
      await Order.deleteOne({ _id: order._id });
      await releaseDiscount();
      throw error;
    }
  }

  /* Only the ordered lines leave the cart; anything left unticked stays. */
  const orderedIds = new Set(items.map(cartLineKey));
  cart.items = cart.items.filter((item) => !orderedIds.has(cartLineKey(item)));
  await cart.save();
  await createNewOrderNotifications(order, resend);

  return order;
}

async function completeStripeCheckout(session, resend) {
  if (session.payment_status !== "paid") return;
  const order = await Order.findOne({
    "payment.stripeSessionId": session.id,
  });
  if (!order) throw new HttpError(404, "Stripe checkout order was not found.");
  if (order.payment.paid) return;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!paymentIntentId) {
    throw new HttpError(
      400,
      "Stripe checkout did not include a payment intent.",
    );
  }
  order.payment.stripePaymentIntentId = paymentIntentId;
  order.payment.paid = true;
  order.payment.status = "paid";
  await order.save();
  await removeOrderedCartItems(order);
  await createNewOrderNotifications(order, resend);
}

async function expireStripeCheckout(session, paymentStatus = "expired") {
  const pendingOrder = await Order.findOne({
    "payment.stripeSessionId": session.id,
    "payment.paid": false,
    status: { $ne: "Cancelled" },
  }).lean();
  if (!pendingOrder) return;

  const cancelledAt = new Date();
  const result = await Order.updateOne(
    {
      _id: pendingOrder._id,
      "payment.paid": false,
      status: { $ne: "Cancelled" },
    },
    {
      $set: {
        status: "Cancelled",
        cancelledAt,
        "payment.status": paymentStatus,
        timeline: buildOrderTimeline(
          "Cancelled",
          pendingOrder.placedAt,
          cancelledAt,
        ),
      },
    },
  );
  if (!result.modifiedCount) return;

  await Promise.all(
    pendingOrder.items
      .filter((item) => mongoose.isValidObjectId(item.productId))
      .map((item) => restoreSellerLine(item)),
  );
  if (
    pendingOrder.appliedDiscount?.code &&
    pendingOrder.appliedDiscount?.seller
  ) {
    await SellerDiscount.updateOne(
      {
        code: pendingOrder.appliedDiscount.code,
        seller: pendingOrder.appliedDiscount.seller,
        uses: { $gt: 0 },
      },
      { $inc: { uses: -1 } },
    );
  }
}

async function removeOrderedCartItems(order) {
  const cart = await Cart.findOne({ customer: order.customer });
  if (!cart) return;

  for (const purchased of order.items) {
    const index = cart.items.findIndex(
      (item) => cartLineKey(item) === cartLineKey(purchased),
    );
    if (index === -1) continue;
    if (cart.items[index].quantity <= purchased.quantity) {
      cart.items.splice(index, 1);
    } else {
      cart.items[index].quantity -= purchased.quantity;
    }
  }
  await cart.save();
}

async function validateCoupon(customerId, { couponCode, productIds }) {
  const code = String(couponCode || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code))
    throw new HttpError(400, "Enter a valid coupon code.");
  const cart = await loadCart(customerId);
  const selected = productIds?.length
    ? cart.items.filter((item) => productIds.includes(cartLineKey(item)))
    : cart.items;
  if (!selected.length)
    throw new HttpError(
      400,
      "Add products to your cart before applying a coupon.",
    );
  const current = await Promise.all(
    selected.map((item) =>
      refreshSellerLine(item.toObject ? item.toObject() : item),
    ),
  );
  const ids = current
    .filter((item) => mongoose.isValidObjectId(item.productId))
    .map((item) => item.productId);
  const products = ids.length
    ? await SellerProduct.find({ _id: { $in: ids }, status: "Active" })
        .select("_id seller")
        .lean()
    : [];
  const eligible = new Set(
    products
      .filter((product) => product.seller.toString())
      .map((product) => product._id.toString()),
  );
  const discount = await SellerDiscount.findOne({
    code,
    active: true,
    startsAt: { $lte: new Date() },
    $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }],
    $expr: {
      $or: [{ $eq: ["$usageLimit", 0] }, { $lt: ["$uses", "$usageLimit"] }],
    },
  }).lean();
  if (!discount)
    throw new HttpError(
      400,
      "That coupon code is invalid, expired, or has reached its use limit.",
    );
  const subtotal = current
    .filter(
      (item) =>
        eligible.has(item.productId) &&
        products.some(
          (product) =>
            product._id.toString() === item.productId &&
            product.seller.toString() === discount.seller.toString(),
        ),
    )
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (!subtotal)
    throw new HttpError(
      400,
      "That coupon does not apply to the selected products.",
    );
  const amount =
    discount.type === "percentage"
      ? (subtotal * discount.value) / 100
      : Math.min(subtotal, discount.value);
  return {
    coupon: {
      code: discount.code,
      type: discount.type,
      value: discount.value,
      amount: Math.round(amount * 100) / 100,
    },
  };
}

async function getOrders(customerId, { status = "all", year = null }) {
  const query = { customer: customerId };
  if (status !== "all") {
    query.status = status;
  }
  if (year) {
    query.placedAt = {
      $gte: new Date(Date.UTC(year, 0, 1)),
      $lt: new Date(Date.UTC(year + 1, 0, 1)),
    };
  }

  const [orders, statusRows, yearRows] = await Promise.all([
    Order.find(query)
      .select("+sellerFulfillments.deliveryOtpEncrypted")
      .sort({ placedAt: -1 })
      .lean(),
    Order.aggregate([
      { $match: { customer: customerId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { customer: customerId } },
      { $group: { _id: { $year: "$placedAt" } } },
      { $sort: { _id: -1 } },
    ]),
  ]);

  const summary = {
    total: 0,
    Processing: 0,
    Shipped: 0,
    Delivered: 0,
    Cancelled: 0,
  };
  for (const row of statusRows) {
    if (row._id in summary) {
      summary[row._id] = row.count;
    }
    summary.total += row.count;
  }

  const spent = await Order.aggregate([
    { $match: { customer: customerId, status: { $ne: "Cancelled" } } },
    { $group: { _id: null, total: { $sum: "$totals.total" } } },
  ]);

  return {
    orders,
    summary: { ...summary, spent: roundMoney(spent[0]?.total) },
    years: yearRows.map((row) => row._id).filter(Boolean),
  };
}

async function getOrder(customerId, id) {
  requireObjectId(id, "order");
  const order = await Order.findOne({ _id: id, customer: customerId })
    .select("+sellerFulfillments.deliveryOtpEncrypted")
    .lean();
  if (!order) {
    throw new HttpError(404, "That order was not found.");
  }
  return order;
}

async function cancelOrder(customerId, id) {
  requireObjectId(id, "order");
  const order = await Order.findOne({ _id: id, customer: customerId });
  if (!order) {
    throw new HttpError(404, "That order was not found.");
  }
  if (!["Processing", "Shipped"].includes(order.status)) {
    throw new HttpError(
      400,
      `A ${order.status.toLowerCase()} order cannot be cancelled.`,
    );
  }

  let stockRestored = false;
  if (order.payment.method === "Stripe" && !order.payment.paid) {
    if (!order.payment.stripeSessionId) {
      throw new HttpError(409, "The Stripe checkout session is not available.");
    }
    let session;
    try {
      session = await stripeService.expireCheckoutSession(
        order.payment.stripeSessionId,
      );
    } catch {
      throw new HttpError(
        409,
        "This checkout can no longer be cancelled. Refresh your orders and check the payment status.",
      );
    }
    await expireStripeCheckout(session);
    order.payment.status = "expired";
    stockRestored = true;
  } else if (order.payment.method === "Stripe" && order.payment.paid) {
    for (const transfer of order.payment.transfers) {
      if (transfer.status === "reversed" || !transfer.transferId) continue;
      await stripeService.reverseSellerTransfer({
        order,
        transfer,
        reference: "order-cancellation",
      });
    }
    await stripeService.refundPaymentIntent(
      order,
      Math.max(0, order.totals.total - (order.payment.refundedTotal || 0)),
      "order-cancellation",
    );
    order.payment.paid = false;
    order.payment.status = "refunded";
    order.payment.refundedTotal = order.totals.total;
    order.payment.platformFeeRefundedTotal = order.totals.platformFee || 0;
  }

  order.status = "Cancelled";
  order.cancelledAt = new Date();
  order.timeline = buildOrderTimeline(
    "Cancelled",
    order.placedAt,
    order.cancelledAt,
  );

  /* Money already taken from the wallet goes straight back. */
  if (order.payment.method === "Wallet" && order.payment.paid) {
    await refundWallet(customerId, order.totals.total, {
      description: `Refund for cancelled order ${order.code}`,
      reference: order.code,
    });
    order.payment.paid = false;
    order.payment.status = "refunded";
    order.payment.refundedTotal = order.totals.total;
    order.payment.platformFeeRefundedTotal = order.totals.platformFee || 0;
  }

  if (!stockRestored) {
    const sellerLines = order.items.filter((item) =>
      mongoose.isValidObjectId(item.productId),
    );
    await Promise.all(sellerLines.map((item) => restoreSellerLine(item)));
  }

  await order.save();
  return order;
}

module.exports = {
  loadCart,
  getCart,
  addCartItem,
  setCartItemQuantity,
  removeCartItem,
  clearCart,
  mergeCart,
  placeOrder,
  completeStripeCheckout,
  expireStripeCheckout,
  validateCoupon,
  getOrders,
  getOrder,
  cancelOrder,
  refundWallet,
};
