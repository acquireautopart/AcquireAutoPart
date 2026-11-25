const HUB_TYPE = {
  PICKUP: "PICKUP",
  SORT_CENTER: "SORT_CENTER",
  MOTHER_HUB: "MOTHER_HUB",
  DELIVERY_HUB: "DELIVERY_HUB",
};

const ROUTE_MODE = {
  TRUCK: "TRUCK",
  TRAIN: "TRAIN",
  FLIGHT: "FLIGHT",
};

const PAYMENT_TYPE = {
  PREPAID: "PREPAID",
  COD: "COD",
};

const SCAN_TYPE = {
  INBOUND: "INBOUND",
  OUTBOUND: "OUTBOUND",
};

const EVENT_CODE = {
  ORDER_PLACED: "ORDER_PLACED",
  SELLER_PROCESSED: "SELLER_PROCESSED",
  PICKED_UP: "PICKED_UP",
  SHIPPED: "SHIPPED",
  ARRIVED_AT_HUB: "ARRIVED_AT_HUB",
  REACHED_DELIVERY_HUB: "REACHED_DELIVERY_HUB",
  DISPATCHED_FROM_HUB: "DISPATCHED_FROM_HUB",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  DELIVERY_ATTEMPTED: "DELIVERY_ATTEMPTED",
  RTO_INITIATED: "RTO_INITIATED",
};

const HUB_TYPES = Object.values(HUB_TYPE);
const ROUTE_MODES = Object.values(ROUTE_MODE);
const PAYMENT_TYPES = Object.values(PAYMENT_TYPE);
const SCAN_TYPES = Object.values(SCAN_TYPE);
const EVENT_CODES = Object.values(EVENT_CODE);

const AWB_PREFIX = "FMPP";
const AWB_DIGITS = 10;
const AWB_MAX_ATTEMPTS = 5;

/** A repeat of the same scan on the same hub within this window is ignored. */
const DUPLICATE_SCAN_WINDOW_MS = 60 * 1000;

/** Last-mile settings. */
const OTP_LENGTH = 4;
const MAX_DELIVERY_ATTEMPTS = 3;

/** Customer notifications. Only these milestones produce an SMS/email. */
const NOTIFICATION_CHANNEL = {
  SMS: "SMS",
  EMAIL: "EMAIL",
};
const NOTIFICATION_STATUS = {
  QUEUED: "QUEUED",
};
const NOTIFICATION_CHANNELS = Object.values(NOTIFICATION_CHANNEL);
const NOTIFICATION_STATUSES = Object.values(NOTIFICATION_STATUS);
const NOTIFY_EVENT_CODES = [
  EVENT_CODE.SHIPPED,
  EVENT_CODE.OUT_FOR_DELIVERY,
  EVENT_CODE.DELIVERED,
  EVENT_CODE.DELIVERY_ATTEMPTED,
];

/** Seller webhooks: one failed POST is retried this many times, with a delay. */
const WEBHOOK_RETRY_COUNT = 3;
const WEBHOOK_RETRY_DELAY_MS = 1000;
const WEBHOOK_TIMEOUT_MS = 5000;
/** Delivery results kept per webhook registration. */
const WEBHOOK_DELIVERY_HISTORY = 50;

/** A parcel with no scan for this long is flagged as stuck. */
const STUCK_AFTER_HOURS = 24;

/** Customer timeline buckets, in the order the tracking page shows them. */
const TIMELINE_GROUPS = [
  {
    name: "Order Confirmed",
    eventCodes: [EVENT_CODE.ORDER_PLACED, EVENT_CODE.SELLER_PROCESSED],
  },
  {
    name: "Shipped",
    eventCodes: [EVENT_CODE.PICKED_UP, EVENT_CODE.SHIPPED],
  },
  {
    name: "In Transit",
    eventCodes: [
      EVENT_CODE.ARRIVED_AT_HUB,
      EVENT_CODE.DISPATCHED_FROM_HUB,
      EVENT_CODE.REACHED_DELIVERY_HUB,
      EVENT_CODE.RTO_INITIATED,
    ],
  },
  {
    name: "Out For Delivery",
    eventCodes: [EVENT_CODE.OUT_FOR_DELIVERY, EVENT_CODE.DELIVERY_ATTEMPTED],
  },
  { name: "Delivered", eventCodes: [EVENT_CODE.DELIVERED] },
];

module.exports = {
  HUB_TYPE,
  HUB_TYPES,
  ROUTE_MODE,
  ROUTE_MODES,
  PAYMENT_TYPE,
  PAYMENT_TYPES,
  SCAN_TYPE,
  SCAN_TYPES,
  EVENT_CODE,
  EVENT_CODES,
  AWB_PREFIX,
  AWB_DIGITS,
  AWB_MAX_ATTEMPTS,
  DUPLICATE_SCAN_WINDOW_MS,
  OTP_LENGTH,
  MAX_DELIVERY_ATTEMPTS,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUS,
  NOTIFICATION_STATUSES,
  NOTIFY_EVENT_CODES,
  WEBHOOK_RETRY_COUNT,
  WEBHOOK_RETRY_DELAY_MS,
  WEBHOOK_TIMEOUT_MS,
  WEBHOOK_DELIVERY_HISTORY,
  STUCK_AFTER_HOURS,
  TIMELINE_GROUPS,
};
