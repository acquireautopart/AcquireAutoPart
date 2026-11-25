const {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  ORDER_TIMELINE_LABELS,
  CANCELLABLE_STATUSES,
} = require("./constants");
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

/*
 * Money maths lives in one place so the cart preview and the placed order can
 * never disagree. Shipping is free once the order crosses the threshold.
 */
function computeTotals(items) {
  const subtotal = roundMoney(
    items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0,
    ),
  );
  const savings = roundMoney(
    items.reduce((sum, item) => {
      const oldPrice =
        item.oldPrice === null || item.oldPrice === undefined
          ? item.price
          : item.oldPrice;
      return (
        sum +
        Math.max(0, Number(oldPrice) - Number(item.price)) *
          Number(item.quantity)
      );
    }, 0),
  );
  const shipping =
    subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;
  const total = roundMoney(subtotal + shipping);

  return { subtotal, savings, shipping, tax: 0, total };
}

function serializeCartItem(item) {
  return {
    productId: item.productId,
    name: item.name,
    brand: item.brand || "",
    category: item.category || "",
    subcategory: item.subcategory || "",
    variant: item.variant || "",
    variantId: item.variantId || "",
    price: roundMoney(item.price),
    currency: item.currency || "USD",
    oldPrice:
      item.oldPrice === null || item.oldPrice === undefined
        ? null
        : roundMoney(item.oldPrice),
    image: item.imageUrl || "",
    quantity: item.quantity,
  };
}

function serializeCart(cart) {
  const items = (cart?.items || []).map(serializeCartItem);
  const totals = computeTotals(items);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, count, currency: items[0]?.currency || "USD", ...totals };
}

function serializeOrderItem(item) {
  return {
    productId: item.productId,
    name: item.name,
    brand: item.brand || "",
    category: item.category || "",
    subcategory: item.subcategory || "",
    variant: item.variant || "",
    variantId: item.variantId || "",
    price: roundMoney(item.price),
    currency: item.currency || "USD",
    oldPrice:
      item.oldPrice === null || item.oldPrice === undefined
        ? null
        : roundMoney(item.oldPrice),
    image: item.imageUrl || "",
    quantity: item.quantity,
    lineTotal: roundMoney(Number(item.price) * Number(item.quantity)),
  };
}

function serializeOrder(order) {
  const items = (order.items || []).map(serializeOrderItem);
  return {
    id: order._id.toString(),
    code: order.code,
    status: order.status,
    placedAt: order.placedAt,
    date: formatDate(order.placedAt),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
    currency: order.currency || items[0]?.currency || "USD",
    address: {
      label: order.address?.label || "",
      name: order.address?.name || "",
      line: order.address?.line || "",
      city: order.address?.city || "",
      region: order.address?.region || "",
      postalCode: order.address?.postalCode || "",
      country: order.address?.country || "",
      phone: order.address?.phone || "",
    },
    payment: {
      method: order.payment?.method || "",
      brand: order.payment?.brand || "",
      last4: order.payment?.last4 || "",
      label: order.payment?.label || "",
      paid: Boolean(order.payment?.paid),
      status:
        order.payment?.status || (order.payment?.paid ? "paid" : "unpaid"),
      refundedTotal: roundMoney(order.payment?.refundedTotal),
    },
    totals: {
      subtotal: roundMoney(order.totals?.subtotal),
      savings: roundMoney(order.totals?.savings),
      shipping: roundMoney(order.totals?.shipping),
      tax: roundMoney(order.totals?.tax),
      platformFee: roundMoney(order.totals?.platformFee),
      total: roundMoney(order.totals?.total),
    },
    appliedDiscount: order.appliedDiscount?.code
      ? {
          code: order.appliedDiscount.code,
          amount: roundMoney(order.appliedDiscount.amount),
        }
      : null,
    timeline: (order.timeline || []).map((step) => ({
      label: step.label,
      date: step.date,
      done: Boolean(step.done),
    })),
    shipments: (order.sellerFulfillments || []).map((shipment) => ({
      status: shipment.status,
      trackingStatus: shipment.trackingStatus || shipment.status,
      carrier: shipment.carrier || "",
      tracking: shipment.tracking || "",
      trackingUrl: shipment.trackingUrl || "",
      deliveryOtp:
        shipment.trackingStatus === "Out for Delivery" &&
        !shipment.deliveryOtpUsedAt &&
        shipment.deliveryOtpExpiresAt &&
        new Date(shipment.deliveryOtpExpiresAt) > new Date()
          ? decryptValue(shipment.deliveryOtpEncrypted)
          : "",
      events: (shipment.events || []).map((event) => ({
        status: event.status,
        source: event.source,
        occurredAt: event.occurredAt,
        note: event.note || "",
        attemptReason: event.attemptReason || "",
        location:
          event.location?.latitude == null || event.location?.longitude == null
            ? null
            : {
                latitude: event.location.latitude,
                longitude: event.location.longitude,
                label: event.location.label || "",
              },
      })),
    })),
    canCancel: CANCELLABLE_STATUSES.includes(order.status),
  };
}

/*
 * Progress view rebuilt from the current status so the API always returns a
 * consistent timeline (a cancelled order collapses to two steps).
 */
function buildOrderTimeline(status, placedAt, now = new Date()) {
  if (status === "Cancelled") {
    return [
      {
        label: ORDER_TIMELINE_LABELS[0],
        date: formatDate(placedAt),
        done: true,
      },
      { label: "Cancelled", date: formatDate(now), done: true },
    ];
  }

  const reached = { Processing: 1, Shipped: 3, Delivered: 4 }[status] ?? 1;

  return ORDER_TIMELINE_LABELS.map((label, index) => ({
    label,
    date:
      index < reached ? formatDate(index === 0 ? placedAt : now) : "Pending",
    done: index < reached,
  }));
}

module.exports = {
  roundMoney,
  formatDate,
  computeTotals,
  serializeCartItem,
  serializeCart,
  serializeOrder,
  buildOrderTimeline,
};
