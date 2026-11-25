/**
 * Seeds the demo tracking network. Safe to run many times: every write is an
 * upsert keyed on the hub code / route leg pair, so nothing is duplicated.
 *
 * Usage: npm run seed
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Hub = require("../src/modules/tracking/models/Hub");
const RouteLeg = require("../src/modules/tracking/models/RouteLeg");
const { HUB_TYPE, ROUTE_MODE } = require("../src/modules/tracking/constants");

const HUBS = [
  {
    code: "DEL-PKP",
    name: "Delhi Pickup Hub",
    city: "Delhi",
    district: "New Delhi",
    state: "Delhi",
    hubType: HUB_TYPE.PICKUP,
    servedPincodes: [],
  },
  {
    code: "DEL-SC",
    name: "Delhi Sort Center",
    city: "Delhi",
    district: "New Delhi",
    state: "Delhi",
    hubType: HUB_TYPE.SORT_CENTER,
    servedPincodes: [],
  },
  {
    code: "LKO-MH",
    name: "Lucknow Mother Hub",
    city: "Lucknow",
    district: "Lucknow",
    state: "Uttar Pradesh",
    hubType: HUB_TYPE.MOTHER_HUB,
    servedPincodes: [],
  },
  {
    code: "GKP-HUB",
    name: "Gorakhpur Hub",
    city: "Gorakhpur",
    district: "Gorakhpur",
    state: "Uttar Pradesh",
    hubType: HUB_TYPE.SORT_CENTER,
    servedPincodes: [],
  },
  {
    code: "SLP-DH",
    name: "Salempur Delivery Hub",
    city: "Salempur",
    district: "Deoria",
    state: "Uttar Pradesh",
    hubType: HUB_TYPE.DELIVERY_HUB,
    servedPincodes: ["274701"],
  },
];

/** [fromCode, toCode, avgHours] for each consecutive hub pair. */
const ROUTE_LEGS = [
  ["DEL-PKP", "DEL-SC", 3],
  ["DEL-SC", "LKO-MH", 9],
  ["LKO-MH", "GKP-HUB", 9],
  ["GKP-HUB", "SLP-DH", 5],
];

async function seed() {
  if (!process.env.MONGODB_URI?.trim()) {
    throw new Error("Set MONGODB_URI in server/.env.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await Hub.init();

    for (const hub of HUBS) {
      await Hub.updateOne({ code: hub.code }, { $set: hub }, { upsert: true });
    }

    const storedHubs = await Hub.find({
      code: { $in: HUBS.map((hub) => hub.code) },
    })
      .select("code")
      .lean();
    const hubIdsByCode = new Map(
      storedHubs.map((hub) => [hub.code, hub._id]),
    );

    for (const [fromCode, toCode, avgHours] of ROUTE_LEGS) {
      const fromHub = hubIdsByCode.get(fromCode);
      const toHub = hubIdsByCode.get(toCode);
      if (!fromHub || !toHub) {
        throw new Error(`Missing hub for route leg ${fromCode} -> ${toCode}.`);
      }
      await RouteLeg.updateOne(
        { fromHub, toHub },
        { $set: { mode: ROUTE_MODE.TRUCK, avgHours } },
        { upsert: true },
      );
    }

    console.log(
      `Seeded ${HUBS.length} hubs and ${ROUTE_LEGS.length} route legs.`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error("Tracking seed failed:", error.message);
  process.exitCode = 1;
});
