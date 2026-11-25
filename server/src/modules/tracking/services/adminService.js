const Shipment = require("../models/Shipment");
const Notification = require("../models/Notification");
const { EVENT_CODE } = require("../constants");

const HOUR_IN_MS = 60 * 60 * 1000;

/** Delivered and returned parcels no longer move, so they are never "stuck". */
const CLOSED_STATUSES = [EVENT_CODE.DELIVERED, EVENT_CODE.RTO_INITIATED];

function normalizeId(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return value._id ? value._id.toString() : value.toString();
}

function publicHub(hub) {
  if (!hub || !hub._id) return null;
  return {
    id: normalizeId(hub._id),
    code: hub.code,
    name: hub.name,
    city: hub.city,
  };
}

function publicShipment(row) {
  return {
    awb: row.awb,
    orderId: row.orderId,
    originCity: row.originCity,
    destinationCity: row.destinationCity,
    destinationPincode: row.destinationPincode,
    paymentType: row.paymentType,
    status: row.currentStatus,
    currentHub: publicHub(row.currentHub),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Paginated shipment table with optional status and created-date filters. */
async function listShipments({ page, limit, status, from, to }) {
  const filter = {};
  if (status) filter.currentStatus = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  const [total, rows] = await Promise.all([
    Shipment.countDocuments(filter),
    Shipment.find(filter)
      .populate("currentHub", "code name city")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return {
    shipments: rows.map(publicShipment),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

/**
 * Parcels whose last scan is older than `hours` (or which never got a scan
 * after creation). Aggregation: join the scan events, take the newest
 * `scannedAt`, and compare it against the cutoff.
 */
async function listStuckShipments({ hours, limit }) {
  const cutoff = new Date(Date.now() - hours * HOUR_IN_MS);

  const rows = await Shipment.aggregate([
    { $match: { currentStatus: { $nin: CLOSED_STATUSES } } },
    {
      $lookup: {
        from: "scanevents",
        localField: "_id",
        foreignField: "shipment",
        as: "events",
      },
    },
    { $addFields: { lastScanAt: { $max: "$events.scannedAt" } } },
    {
      $addFields: {
        lastActivityAt: { $ifNull: ["$lastScanAt", "$createdAt"] },
      },
    },
    { $match: { lastActivityAt: { $lt: cutoff } } },
    { $sort: { lastActivityAt: 1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "hubs",
        localField: "currentHub",
        foreignField: "_id",
        as: "hub",
      },
    },
    { $unwind: { path: "$hub", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        awb: 1,
        orderId: 1,
        destinationCity: 1,
        destinationPincode: 1,
        paymentType: 1,
        currentStatus: 1,
        createdAt: 1,
        lastActivityAt: 1,
        hubCode: "$hub.code",
        hubName: "$hub.name",
        hubCity: "$hub.city",
      },
    },
  ]);

  const now = Date.now();
  return rows.map((row) => ({
    awb: row.awb,
    orderId: row.orderId,
    destinationCity: row.destinationCity,
    destinationPincode: row.destinationPincode,
    paymentType: row.paymentType,
    status: row.currentStatus,
    currentHub: row.hubName
      ? { code: row.hubCode, name: row.hubName, city: row.hubCity }
      : null,
    lastActivityAt: row.lastActivityAt,
    hoursIdle:
      Math.round(((now - new Date(row.lastActivityAt).getTime()) / HOUR_IN_MS) * 10) / 10,
  }));
}

/** How many in-transit parcels each hub is currently holding. */
async function hubLoad() {
  return Shipment.aggregate([
    {
      $match: {
        currentHub: { $ne: null },
        currentStatus: { $nin: CLOSED_STATUSES },
      },
    },
    { $group: { _id: "$currentHub", parcels: { $sum: 1 } } },
    {
      $lookup: {
        from: "hubs",
        localField: "_id",
        foreignField: "_id",
        as: "hub",
      },
    },
    { $unwind: "$hub" },
    {
      $project: {
        _id: 0,
        hubId: { $toString: "$_id" },
        code: "$hub.code",
        name: "$hub.name",
        city: "$hub.city",
        hubType: "$hub.hubType",
        parcels: 1,
      },
    },
    { $sort: { parcels: -1, code: 1 } },
  ]);
}

async function listNotifications({ limit }) {
  const rows = await Notification.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return rows.map((row) => ({
    id: normalizeId(row._id),
    awb: row.awb,
    eventCode: row.eventCode,
    channel: row.channel,
    subject: row.subject,
    text: row.text,
    status: row.status,
    createdAt: row.createdAt,
  }));
}

module.exports = {
  listShipments,
  listStuckShipments,
  hubLoad,
  listNotifications,
  publicShipment,
};
