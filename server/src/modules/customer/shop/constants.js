/* Shared limits and lookup tables for the cart + orders module. */

const MAX_CART_ITEM_QUANTITY = 99;
const MAX_CART_LINES = 100;

const FREE_SHIPPING_THRESHOLD = 35;
const SHIPPING_FEE = 5.99;

const PAYMENT_METHODS = ["Wallet", "Cash on delivery", "Card", "Stripe"];

const ORDER_STATUSES = ["Processing", "Shipped", "Delivered", "Cancelled"];

/* Statuses a customer is still allowed to cancel from. */
const CANCELLABLE_STATUSES = ["Processing", "Shipped"];

const ORDER_TIMELINE_LABELS = [
  "Order placed",
  "Packed",
  "Shipped",
  "Delivered",
];

module.exports = {
  MAX_CART_ITEM_QUANTITY,
  MAX_CART_LINES,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  PAYMENT_METHODS,
  ORDER_STATUSES,
  CANCELLABLE_STATUSES,
  ORDER_TIMELINE_LABELS,
};
