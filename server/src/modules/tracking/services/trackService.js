const RouteLeg = require("../models/RouteLeg");
const Shipment = require("../models/Shipment");
const ScanEvent = require("../models/ScanEvent");
const HttpError = require("../../../utils/HttpError");
const { TIMELINE_GROUPS } = require("../constants");

const HOUR_IN_MS = 60 * 60 * 1000;

const TIMELINE_GROUP_BY_EVENT = new Map(
  TIMELINE_GROUPS.flatMap((group) =>
    group.eventCodes.map((eventCode) => [eventCode, group.name]),
  ),
);

function normalizeId(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return value._id ? value._id.toString() : value.toString();
}

function legKey(fromId, toId) {
  return `${fromId}->${toId}`;
}

function buildTimeline(events) {
  return events.map((event) => ({
    eventCode: event.eventCode,
    message: event.message,
    hubName: event.hub?.name || null,
    hubCity: event.hub?.city || null,
    scannedAt: new Date(event.scannedAt).toISOString(),
  }));
}

/** Buckets the timeline into the five customer-facing groups, in fixed order. */
function buildTimelineGroups(timeline) {
  const groups = TIMELINE_GROUPS.map((group) => ({
    group: group.name,
    events: [],
  }));
  const groupsByName = new Map(groups.map((entry) => [entry.group, entry]));
  for (const event of timeline) {
    const entry = groupsByName.get(
      TIMELINE_GROUP_BY_EVENT.get(event.eventCode),
    );
    if (entry) entry.events.push(event);
  }
  return groups;
}

/** Position of the furthest hub the shipment has already reached, or -1. */
function lastReachedIndex(routeIds, reachedHubIds) {
  let index = -1;
  routeIds.forEach((routeId, position) => {
    if (reachedHubIds.has(routeId)) index = position;
  });
  return index;
}

/** Sums the seeded avgHours of the legs still ahead of the shipment. */
function sumRemainingHours({ routeIds, fromIndex, legHours }) {
  let hours = 0;
  for (
    let index = Math.max(fromIndex, 0);
    index < routeIds.length - 1;
    index += 1
  ) {
    hours += legHours.get(legKey(routeIds[index], routeIds[index + 1])) || 0;
  }
  return hours;
}

async function trackShipment(awb) {
  const normalized = String(awb || "")
    .trim()
    .toUpperCase();

  const shipment = await Shipment.findOne({ awb: normalized })
    .populate("plannedRoute")
    .populate("currentHub")
    .lean();
  if (!shipment) {
    throw new HttpError(404, `No shipment found for AWB ${normalized}.`);
  }

  const events = await ScanEvent.find({ shipment: shipment._id })
    .sort({ scannedAt: 1, _id: 1 })
    .populate("hub", "name city")
    .lean();

  const timeline = buildTimeline(events);
  const route = shipment.plannedRoute || [];
  const routeIds = route.map((hub) => normalizeId(hub._id));
  const reachedHubIds = new Set(
    events
      .filter((event) => event.hub)
      .map((event) => normalizeId(event.hub._id)),
  );
  const currentHubId = normalizeId(shipment.currentHub);

  const progress = route.map((hub) => {
    const hubId = normalizeId(hub._id);
    let status = "upcoming";
    if (hubId === currentHubId) status = "current";
    else if (reachedHubIds.has(hubId)) status = "visited";
    return {
      code: hub.code,
      name: hub.name,
      city: hub.city,
      hubType: hub.hubType,
      status,
    };
  });

  const legs =
    routeIds.length > 1
      ? await RouteLeg.find({
          fromHub: { $in: routeIds },
          toHub: { $in: routeIds },
        })
          .select("fromHub toHub avgHours")
          .lean()
      : [];
  const legHours = new Map(
    legs.map((leg) => [
      legKey(normalizeId(leg.fromHub), normalizeId(leg.toHub)),
      Number(leg.avgHours) || 0,
    ]),
  );
  const remainingHours = sumRemainingHours({
    routeIds,
    fromIndex: lastReachedIndex(routeIds, reachedHubIds),
    legHours,
  });

  return {
    summary: {
      awb: shipment.awb,
      orderId: shipment.orderId,
      paymentType: shipment.paymentType,
      destinationCity: shipment.destinationCity,
      currentStatus: shipment.currentStatus,
    },
    timeline,
    groupedStatus: buildTimelineGroups(timeline),
    progress,
    estimatedDeliveryDate: new Date(
      Date.now() + remainingHours * HOUR_IN_MS,
    ).toISOString(),
  };
}

module.exports = {
  trackShipment,
  buildTimeline,
  buildTimelineGroups,
  lastReachedIndex,
  sumRemainingHours,
};
