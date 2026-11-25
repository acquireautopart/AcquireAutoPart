const Hub = require("../models/Hub");
const Shipment = require("../models/Shipment");
const ScanEvent = require("../models/ScanEvent");
const HttpError = require("../../../utils/HttpError");
const {
  DUPLICATE_SCAN_WINDOW_MS,
  EVENT_CODE,
  SCAN_TYPE,
} = require("../constants");
const { processScanEvents } = require("./notificationService");

/** The hub scan that each scan type records. */
const SCAN_EVENT_CODE = {
  [SCAN_TYPE.INBOUND]: EVENT_CODE.ARRIVED_AT_HUB,
  [SCAN_TYPE.OUTBOUND]: EVENT_CODE.DISPATCHED_FROM_HUB,
};

function normalizeId(value) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : value.toString();
}

function describeHub(hub) {
  return hub ? `${hub.code} (${hub.name})` : "the next planned hub";
}

/** How many hubs from the start of the planned route have already been reached. */
function reachedCount(plannedRouteIds, reachedHubIds) {
  let count = 0;
  while (
    count < plannedRouteIds.length &&
    reachedHubIds.has(plannedRouteIds[count])
  ) {
    count += 1;
  }
  return count;
}

async function findDuplicateScan({ shipmentId, hubId, eventCode, scannedAt }) {
  const windowMs = DUPLICATE_SCAN_WINDOW_MS;
  return ScanEvent.findOne({
    shipment: shipmentId,
    hub: hubId,
    eventCode,
    scannedAt: {
      $gte: new Date(scannedAt.getTime() - windowMs),
      $lte: new Date(scannedAt.getTime() + windowMs),
    },
  })
    .sort({ scannedAt: -1 })
    .lean();
}

/**
 * Records one INBOUND/OUTBOUND hub scan.
 *
 * Returns `{ event, events, shipment, duplicate }` where `event` is the primary
 * event for this scan (the one that represents the scan itself).
 */
async function recordScan({ awb, hubCode, scanType, scannedBy, scannedAt }) {
  const normalizedAwb = String(awb || "")
    .trim()
    .toUpperCase();
  const normalizedHubCode = String(hubCode || "")
    .trim()
    .toUpperCase();

  const [shipment, hub] = await Promise.all([
    Shipment.findOne({ awb: normalizedAwb }).lean(),
    Hub.findOne({ code: normalizedHubCode }).lean(),
  ]);
  if (!shipment) {
    throw new HttpError(404, `No shipment found for AWB ${normalizedAwb}.`);
  }
  if (!hub) {
    throw new HttpError(404, `No hub found with code ${normalizedHubCode}.`);
  }

  const eventCode = SCAN_EVENT_CODE[scanType];
  const scannedAtDate = scannedAt ? new Date(scannedAt) : new Date();

  const duplicate = await findDuplicateScan({
    shipmentId: shipment._id,
    hubId: hub._id,
    eventCode,
    scannedAt: scannedAtDate,
  });
  if (duplicate) {
    return { event: duplicate, events: [duplicate], duplicate: true };
  }

  const plannedRouteIds = (shipment.plannedRoute || []).map(normalizeId);
  const arrivalEvents = await ScanEvent.find({
    shipment: shipment._id,
    eventCode: EVENT_CODE.ARRIVED_AT_HUB,
  })
    .select("hub")
    .lean();
  const reachedHubs = new Set(arrivalEvents.map((event) => normalizeId(event.hub)));

  const reached = reachedCount(plannedRouteIds, reachedHubs);
  const nextExpectedId = plannedRouteIds[reached];
  const currentHubId = reached > 0 ? plannedRouteIds[reached - 1] : null;
  const hubId = normalizeId(hub._id);
  const deliveryHubId = plannedRouteIds[plannedRouteIds.length - 1];

  if (scanType === SCAN_TYPE.INBOUND) {
    if (!nextExpectedId) {
      throw new HttpError(
        400,
        `${shipment.awb} has already completed its planned route, so it cannot arrive at ${describeHub(hub)} again.`,
      );
    }
    if (nextExpectedId !== hubId) {
      const expectedHub = await Hub.findById(nextExpectedId)
        .select("code name")
        .lean();
      throw new HttpError(
        400,
        `Unexpected hub scan. The next planned hub for ${shipment.awb} is ${describeHub(expectedHub)}.`,
      );
    }
  } else if (!currentHubId || currentHubId !== hubId) {
    throw new HttpError(
      400,
      `Cannot record an OUTBOUND scan at ${describeHub(hub)}. Only the hub ${shipment.awb} has already arrived at can dispatch it.`,
    );
  }

  const pendingEvents = [];
  if (scanType === SCAN_TYPE.INBOUND) {
    pendingEvents.push({
      eventCode: EVENT_CODE.ARRIVED_AT_HUB,
      message: `Arrived at ${hub.name}`,
    });
    if (reached === 0) {
      pendingEvents.push({
        eventCode: EVENT_CODE.SHIPPED,
        message: "Your item has been shipped",
      });
    }
    if (hubId === deliveryHubId) {
      pendingEvents.push({
        eventCode: EVENT_CODE.REACHED_DELIVERY_HUB,
        message: "Your item has been received in the hub nearest to you",
      });
    }
  } else {
    pendingEvents.push({
      eventCode: EVENT_CODE.DISPATCHED_FROM_HUB,
      message: `Dispatched from ${hub.name}`,
    });
  }

  const created = await ScanEvent.insertMany(
    pendingEvents.map((event) => ({
      shipment: shipment._id,
      hub: hub._id,
      eventCode: event.eventCode,
      message: event.message,
      scannedBy: scannedBy || "",
      scannedAt: scannedAtDate,
    })),
  );

  const currentStatus = created[created.length - 1].eventCode;
  const updated = await Shipment.findOneAndUpdate(
    { _id: shipment._id },
    { $set: { currentStatus, currentHub: hub._id } },
    { returnDocument: "after" },
  ).lean();

  /* A SHIPPED scan stores the customer notification; every scan is delivered
     to the seller webhooks. */
  await processScanEvents({ shipment, events: created });

  return {
    event: created[0],
    events: created,
    shipment: updated,
    duplicate: false,
  };
}

module.exports = {
  recordScan,
  reachedCount,
  SCAN_EVENT_CODE,
};
