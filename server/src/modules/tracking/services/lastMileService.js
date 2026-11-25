const crypto = require("crypto");
const Shipment = require("../models/Shipment");
const ScanEvent = require("../models/ScanEvent");
const HttpError = require("../../../utils/HttpError");
const {
  EVENT_CODE,
  MAX_DELIVERY_ATTEMPTS,
  OTP_LENGTH,
  PAYMENT_TYPE,
} = require("../constants");
const { processScanEvents } = require("./notificationService");

/** Statuses that close the shipment: it can no longer go out for delivery. */
const CLOSED_STATUS_LABELS = {
  [EVENT_CODE.DELIVERED]: "delivered",
  [EVENT_CODE.RTO_INITIATED]: "on its way back to the seller",
};

function normalizeId(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return value._id ? value._id.toString() : value.toString();
}

function generateOtp() {
  const max = 10 ** OTP_LENGTH;
  return String(crypto.randomInt(0, max)).padStart(OTP_LENGTH, "0");
}

async function loadShipment(awb) {
  const normalized = String(awb || "")
    .trim()
    .toUpperCase();
  const shipment = await Shipment.findOne({ awb: normalized }).lean();
  if (!shipment) {
    throw new HttpError(404, `No shipment found for AWB ${normalized}.`);
  }
  return shipment;
}

/** The delivery hub is the last hop of the planned route. */
function deliveryHubId(shipment) {
  const route = shipment.plannedRoute || [];
  return route.length ? normalizeId(route[route.length - 1]) : "";
}

function hubForEvent(shipment) {
  return normalizeId(shipment.currentHub) || deliveryHubId(shipment) || null;
}

async function insertEvent({
  shipment,
  hubId,
  eventCode,
  message,
  scannedBy,
  scannedAt,
}) {
  const [event] = await ScanEvent.insertMany([
    {
      shipment: shipment._id,
      hub: hubId,
      eventCode,
      message,
      scannedBy: scannedBy || "",
      scannedAt: scannedAt || new Date(),
    },
  ]);

  /* OUT_FOR_DELIVERY, DELIVERED, DELIVERY_ATTEMPTED and RTO_INITIATED all run
     through here, so the notification layer is wired in one place. */
  await processScanEvents({ shipment, events: [event] });

  return event;
}

async function assignDelivery({ awb, deliveryBoyId }) {
  const shipment = await loadShipment(awb);
  const hubId = deliveryHubId(shipment);
  if (!hubId || normalizeId(shipment.currentHub) !== hubId) {
    throw new HttpError(
      400,
      `${shipment.awb} is not at the delivery hub yet, so it cannot go out for delivery.`,
    );
  }
  const closedLabel = CLOSED_STATUS_LABELS[shipment.currentStatus];
  if (closedLabel) {
    throw new HttpError(400, `${shipment.awb} is already ${closedLabel}.`);
  }

  const otp = generateOtp();
  const scannedAt = new Date();
  const event = await insertEvent({
    shipment,
    hubId,
    eventCode: EVENT_CODE.OUT_FOR_DELIVERY,
    message: "Your item is out for delivery",
    scannedBy: deliveryBoyId,
    scannedAt,
  });

  const updated = await Shipment.findOneAndUpdate(
    { _id: shipment._id },
    {
      $set: {
        currentStatus: EVENT_CODE.OUT_FOR_DELIVERY,
        currentHub: hubId,
        otp,
      },
    },
    { returnDocument: "after" },
  ).lean();

  /* The OTP is returned so the demo app can show it to the customer; a real
     deployment would deliver it by SMS only. */
  return { shipment: updated, event, otp };
}

async function completeDelivery({ awb, otp, codCollected, scannedBy }) {
  const shipment = await loadShipment(awb);
  if (!shipment.otp) {
    throw new HttpError(
      400,
      `${shipment.awb} is not out for delivery. Assign a delivery partner first.`,
    );
  }
  if (String(otp || "").trim() !== shipment.otp) {
    throw new HttpError(400, "The delivery OTP is incorrect.");
  }
  if (shipment.paymentType === PAYMENT_TYPE.COD && codCollected !== true) {
    throw new HttpError(
      400,
      `${shipment.awb} is a COD shipment. Confirm that the cash was collected.`,
    );
  }

  const hubId = hubForEvent(shipment);
  const event = await insertEvent({
    shipment,
    hubId,
    eventCode: EVENT_CODE.DELIVERED,
    message: "Your item has been delivered",
    scannedBy,
  });

  const updated = await Shipment.findOneAndUpdate(
    { _id: shipment._id },
    { $set: { currentStatus: EVENT_CODE.DELIVERED, currentHub: hubId, otp: "" } },
    { returnDocument: "after" },
  ).lean();

  return { shipment: updated, event };
}

async function failDelivery({ awb, reason, scannedBy }) {
  const shipment = await loadShipment(awb);
  if (!shipment.otp) {
    throw new HttpError(
      400,
      `No delivery attempt is in progress for ${shipment.awb}. Assign a delivery partner first.`,
    );
  }

  const hubId = hubForEvent(shipment);
  const scannedAt = new Date();
  const attemptsEvent = await insertEvent({
    shipment,
    hubId,
    eventCode: EVENT_CODE.DELIVERY_ATTEMPTED,
    message: `Delivery attempted: ${reason}`,
    scannedBy,
    scannedAt,
  });

  const updated = await Shipment.findOneAndUpdate(
    { _id: shipment._id },
    {
      $inc: { failedAttempts: 1 },
      $set: {
        currentStatus: EVENT_CODE.DELIVERY_ATTEMPTED,
        currentHub: hubId,
        otp: "",
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (updated.failedAttempts < MAX_DELIVERY_ATTEMPTS) {
    return { shipment: updated, event: attemptsEvent, events: [attemptsEvent] };
  }

  const rtoEvent = await insertEvent({
    shipment,
    hubId,
    eventCode: EVENT_CODE.RTO_INITIATED,
    message:
      "Your item could not be delivered and is being sent back to the seller",
    scannedBy,
    scannedAt,
  });
  const finalized = await Shipment.findOneAndUpdate(
    { _id: shipment._id },
    { $set: { currentStatus: EVENT_CODE.RTO_INITIATED } },
    { returnDocument: "after" },
  ).lean();

  return {
    shipment: finalized,
    event: attemptsEvent,
    events: [attemptsEvent, rtoEvent],
  };
}

module.exports = {
  assignDelivery,
  completeDelivery,
  failDelivery,
  generateOtp,
};
