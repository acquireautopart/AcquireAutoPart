const Hub = require("../models/Hub");
const RouteLeg = require("../models/RouteLeg");
const HttpError = require("../../../utils/HttpError");
const { HUB_TYPE } = require("../constants");

const HOUR_IN_MS = 60 * 60 * 1000;

function normalizeId(value) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : value.toString();
}

/** Directed adjacency map: hub id -> [{ to, hours }]. */
function buildAdjacency(legs) {
  const adjacency = new Map();
  for (const leg of legs) {
    const from = normalizeId(leg.fromHub);
    const to = normalizeId(leg.toHub);
    const hours = Number(leg.avgHours);
    if (!from || !to || !Number.isFinite(hours) || hours < 0) continue;
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push({ to, hours });
  }
  return adjacency;
}

/**
 * Dijkstra over avgHours. Returns `{ path, hours }`, where `path` is the ordered
 * list of hub ids and `hours` maps every hub id to its cumulative travel time,
 * or null when the destination cannot be reached.
 */
function shortestPath(adjacency, originId, destinationId) {
  const start = normalizeId(originId);
  const target = normalizeId(destinationId);
  if (!start || !target) return null;

  const nodeIds = new Set([start, target]);
  for (const [from, edges] of adjacency) {
    nodeIds.add(from);
    for (const edge of edges) nodeIds.add(edge.to);
  }

  const hours = new Map();
  for (const id of nodeIds) hours.set(id, Infinity);
  hours.set(start, 0);

  const previous = new Map();
  const settled = new Set();

  while (settled.size < nodeIds.size) {
    let current = null;
    let best = Infinity;
    for (const [id, value] of hours) {
      if (!settled.has(id) && value < best) {
        best = value;
        current = id;
      }
    }
    if (current === null || current === target) break;
    settled.add(current);
    for (const edge of adjacency.get(current) || []) {
      const candidate = best + edge.hours;
      if (candidate < hours.get(edge.to)) {
        hours.set(edge.to, candidate);
        previous.set(edge.to, current);
      }
    }
  }

  if (!Number.isFinite(hours.get(target))) return null;

  const path = [target];
  let cursor = target;
  while (cursor !== start) {
    cursor = previous.get(cursor);
    if (cursor === undefined) return null;
    path.unshift(cursor);
  }
  return { path, hours };
}

/** Turns the shortest path into ordered steps with a cumulative ETA per hub. */
function planFromData({
  hubs,
  legs,
  originHubId,
  deliveryHubId,
  now = new Date(),
}) {
  const hubById = new Map(hubs.map((hub) => [normalizeId(hub._id), hub]));
  const result = shortestPath(buildAdjacency(legs), originHubId, deliveryHubId);
  if (!result) return null;

  return result.path.map((hubId) => {
    const hub = hubById.get(hubId);
    if (!hub) {
      throw new HttpError(
        500,
        `A route leg points at hub ${hubId}, which no longer exists. Run "npm run seed" again.`,
      );
    }
    const cumulativeHours = result.hours.get(hubId);
    return {
      hub,
      cumulativeHours,
      expectedArrival: new Date(now.getTime() + cumulativeHours * HOUR_IN_MS),
    };
  });
}

async function findHubByCode(code) {
  const normalized = String(code || "")
    .trim()
    .toUpperCase();
  if (!normalized) throw new HttpError(400, "An origin hub code is required.");
  const hub = await Hub.findOne({ code: normalized }).lean();
  if (!hub) throw new HttpError(404, `No hub found with code ${normalized}.`);
  return hub;
}

async function findDeliveryHubForPincode(pincode) {
  const normalized = String(pincode || "").trim();
  if (!normalized) throw new HttpError(400, "A destination pincode is required.");
  const hub = await Hub.findOne({
    hubType: HUB_TYPE.DELIVERY_HUB,
    servedPincodes: normalized,
  }).lean();
  if (!hub) {
    throw new HttpError(
      404,
      `No delivery hub serves pincode ${normalized}. Add the pincode to a DELIVERY_HUB first.`,
    );
  }
  return hub;
}

/**
 * Plans the hub-by-hub route from an origin hub to the delivery hub that serves
 * `destinationPincode`, using avgHours as the edge weight.
 *
 * Returns an ordered array of `{ hub, cumulativeHours, expectedArrival }`.
 */
async function planRoute(originHubCode, destinationPincode) {
  const [originHub, deliveryHub] = await Promise.all([
    findHubByCode(originHubCode),
    findDeliveryHubForPincode(destinationPincode),
  ]);

  const [hubs, legs] = await Promise.all([
    Hub.find({}).lean(),
    RouteLeg.find({}).lean(),
  ]);

  const steps = planFromData({
    hubs,
    legs,
    originHubId: originHub._id,
    deliveryHubId: deliveryHub._id,
  });

  if (!steps) {
    throw new HttpError(
      422,
      `No route connects ${originHub.code} to ${deliveryHub.code}. Add the missing route legs first.`,
    );
  }
  return steps;
}

module.exports = {
  planRoute,
  planFromData,
  shortestPath,
  buildAdjacency,
  findHubByCode,
  findDeliveryHubForPincode,
};
