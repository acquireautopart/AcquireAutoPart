const crypto = require("crypto");
const Hub = require("../models/Hub");
const Shipment = require("../models/Shipment");
const ScanEvent = require("../models/ScanEvent");
const HttpError = require("../../../utils/HttpError");
const {
  AWB_DIGITS,
  AWB_MAX_ATTEMPTS,
  AWB_PREFIX,
  EVENT_CODE,
  HUB_TYPE,
} = require("../constants");
const { planRoute } = require("./routePlanner");

/** Every new shipment starts with these three customer-facing events. */
const INITIAL_EVENTS = [
  {
    eventCode: EVENT_CODE.ORDER_PLACED,
    message: "Your order has been placed",
  },
  {
    eventCode: EVENT_CODE.SELLER_PROCESSED,
    message: "Seller has processed your order",
  },
  {
    eventCode: EVENT_CODE.PICKED_UP,
    message: "Your item has been picked up by delivery partner",
  },
];

function generateAwb() {
  const digits = Array.from({ length: AWB_DIGITS }, () =>
    crypto.randomInt(0, 10),
  ).join("");
  return `${AWB_PREFIX}${digits}`;
}

async function resolveOriginHub(originHubCode) {
  if (originHubCode) {
    const hub = await Hub.findOne({
      code: String(originHubCode).trim().toUpperCase(),
    }).lean();
    if (!hub) {
      throw new HttpError(404, `No hub found with code ${originHubCode}.`);
    }
    return hub;
  }
  const hub = await Hub.findOne({ hubType: HUB_TYPE.PICKUP })
    .sort({ code: 1 })
    .lean();
  if (!hub) {
    throw new HttpError(
      422,
      "No pickup hub is configured yet. Run \"npm run seed\" to create the demo network.",
    );
  }
  return hub;
}

/**
 * Inserts the shipment with a fresh AWB and retries with a new number whenever
 * MongoDB reports a duplicate key for the `awb` index.
 */
async function insertWithUniqueAwb(fields) {
  for (let attempt = 0; attempt < AWB_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await Shipment.create({ ...fields, awb: generateAwb() });
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }
  throw new HttpError(
    500,
    "Could not allocate a unique AWB. Please try creating the shipment again.",
  );
}

async function createShipment({
  orderId,
  originCity,
  destinationPincode,
  destinationCity,
  paymentType,
  originHubCode,
}) {
  const originHub = await resolveOriginHub(originHubCode);
  const steps = await planRoute(originHub.code, destinationPincode);

  const shipment = await insertWithUniqueAwb({
    orderId,
    originCity,
    destinationPincode,
    destinationCity,
    paymentType,
    plannedRoute: steps.map((step) => step.hub._id),
  });

  const scannedAt = new Date();
  await ScanEvent.insertMany(
    INITIAL_EVENTS.map((event) => ({
      shipment: shipment._id,
      hub: null,
      eventCode: event.eventCode,
      message: event.message,
      scannedBy: "system",
      scannedAt,
    })),
  );

  return { shipment, route: steps };
}

async function getShipmentByAwb(awb) {
  const normalized = String(awb || "")
    .trim()
    .toUpperCase();
  const shipment = await Shipment.findOne({ awb: normalized })
    .populate("plannedRoute")
    .lean();
  if (!shipment) {
    throw new HttpError(404, `No shipment found for AWB ${normalized}.`);
  }
  return shipment;
}

module.exports = {
  createShipment,
  getShipmentByAwb,
  generateAwb,
};
