const Hub = require("../models/Hub");
const Notification = require("../models/Notification");
const {
  EVENT_CODE,
  NOTIFICATION_CHANNEL,
  NOTIFY_EVENT_CODES,
} = require("../constants");
const { dispatchScanEvents } = require("./webhookService");

const TRACKING_BASE_URL = (
  process.env.DELIVERY_FRONTEND_URL?.trim() || "http://localhost:3003"
).replace(/\/+$/, "");

function normalizeId(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return value._id ? value._id.toString() : value.toString();
}

function trackingLink(awb) {
  return `${TRACKING_BASE_URL}/track/${awb}`;
}

function hubLabel(hub) {
  return hub?.name ? ` at ${hub.name}` : "";
}

/**
 * The SMS and email text for one milestone, ready to be stored. Events outside
 * NOTIFY_EVENT_CODES produce nothing.
 */
function buildNotificationMessages({ shipment, event, hub }) {
  const link = trackingLink(shipment.awb);
  const label = hubLabel(hub);
  const templates = {
    [EVENT_CODE.SHIPPED]: {
      sms: `${shipment.awb} has been shipped${label}. Track: ${link}`,
      subject: `Your order ${shipment.awb} has been shipped`,
      email: `Your order ${shipment.awb} has been shipped${label} and is on its way to ${shipment.destinationCity}. Track it here: ${link}`,
    },
    [EVENT_CODE.OUT_FOR_DELIVERY]: {
      sms: `${shipment.awb} is out for delivery today. Keep the OTP ready. Track: ${link}`,
      subject: `Your order ${shipment.awb} is out for delivery`,
      email: `Your order ${shipment.awb} is out for delivery and will reach you today. Share the OTP with the delivery partner to complete the handover. Track: ${link}`,
    },
    [EVENT_CODE.DELIVERED]: {
      sms: `${shipment.awb} has been delivered. Thank you for shopping with us!`,
      subject: `Your order ${shipment.awb} has been delivered`,
      email: `Your order ${shipment.awb} has been delivered. Thanks for shopping with us — see you again soon.`,
    },
    [EVENT_CODE.DELIVERY_ATTEMPTED]: {
      sms: `We could not deliver ${shipment.awb} today. We will try again soon. Track: ${link}`,
      subject: `Delivery attempted for your order ${shipment.awb}`,
      email: `We tried to deliver your order ${shipment.awb} today: ${event.message}. We will make another attempt. Track: ${link}`,
    },
  };

  const template = templates[event.eventCode];
  if (!template) return [];

  return [
    { channel: NOTIFICATION_CHANNEL.SMS, subject: "", text: template.sms },
    {
      channel: NOTIFICATION_CHANNEL.EMAIL,
      subject: template.subject,
      text: template.email,
    },
  ].map((message) => ({
    shipment: shipment._id,
    awb: shipment.awb,
    eventCode: event.eventCode,
    ...message,
  }));
}

/**
 * Runs the notification layer for freshly created scan events: the customer
 * milestones are saved as SMS/email text, and every event is POSTed to the
 * seller webhooks.
 */
async function processScanEvents({ shipment, events }) {
  const list = (Array.isArray(events) ? events : [events]).filter(Boolean);
  if (!shipment || !list.length) return { notifications: [], deliveries: [] };

  const hubIds = [
    ...new Set(list.map((event) => normalizeId(event.hub)).filter(Boolean)),
  ];
  const hubs = hubIds.length
    ? await Hub.find({ _id: { $in: hubIds } }).select("code name city").lean()
    : [];
  const hubById = new Map(hubs.map((hub) => [normalizeId(hub._id), hub]));

  const documents = list
    .filter((event) => NOTIFY_EVENT_CODES.includes(event.eventCode))
    .flatMap((event) =>
      buildNotificationMessages({
        shipment,
        event,
        hub: hubById.get(normalizeId(event.hub)) || null,
      }),
    );
  if (documents.length) await Notification.insertMany(documents);

  const deliveries = await dispatchScanEvents({ shipment, events: list, hubById });

  return { notifications: documents, deliveries };
}

module.exports = {
  processScanEvents,
  buildNotificationMessages,
  NOTIFY_EVENT_CODES,
};
