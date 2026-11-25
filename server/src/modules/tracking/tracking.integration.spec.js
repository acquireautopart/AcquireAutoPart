/**
 * Integration tests for the tracking module.
 *
 * These run the real Express app (`createApp`) through `supertest` against a
 * throwaway MongoDB started by `mongodb-memory-server`, so the HTTP layer,
 * validation, Mongoose models and services are all exercised together.
 *
 * Covered flows:
 *   1. route planning            — hub-by-hub shortest path + ETA
 *   2. scan order validation     — INBOUND before OUTBOUND, wrong hub rejected
 *   3. duplicate scan handling   — a repeat within the window is ignored
 *   4. last-mile delivery        — OTP handover and 3 failures -> RTO
 *   5. tracking API output shape — summary / timeline / groups / progress
 */
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.JWT_SECRET =
  "test-only-signing-secret-with-at-least-32-bytes-long";

const { createApp } = require("../../app");
const Hub = require("./models/Hub");
const RouteLeg = require("./models/RouteLeg");
const Shipment = require("./models/Shipment");
const ScanEvent = require("./models/ScanEvent");
const Notification = require("./models/Notification");
const Webhook = require("./models/Webhook");
const { EVENT_CODE } = require("./constants");

const STAFF_API_KEY = "test-staff-api-key";

/** The demo network the seed script creates, kept identical here. */
const HUBS = [
  {
    code: "DEL-PKP",
    name: "Delhi Pickup Hub",
    city: "Delhi",
    district: "New Delhi",
    state: "Delhi",
    hubType: "PICKUP",
    servedPincodes: [],
  },
  {
    code: "DEL-SC",
    name: "Delhi Sort Center",
    city: "Delhi",
    district: "New Delhi",
    state: "Delhi",
    hubType: "SORT_CENTER",
    servedPincodes: [],
  },
  {
    code: "LKO-MH",
    name: "Lucknow Mother Hub",
    city: "Lucknow",
    district: "Lucknow",
    state: "Uttar Pradesh",
    hubType: "MOTHER_HUB",
    servedPincodes: [],
  },
  {
    code: "GKP-HUB",
    name: "Gorakhpur Hub",
    city: "Gorakhpur",
    district: "Gorakhpur",
    state: "Uttar Pradesh",
    hubType: "SORT_CENTER",
    servedPincodes: [],
  },
  {
    code: "SLP-DH",
    name: "Salempur Delivery Hub",
    city: "Salempur",
    district: "Deoria",
    state: "Uttar Pradesh",
    hubType: "DELIVERY_HUB",
    servedPincodes: ["274701"],
  },
];

/** [fromCode, toCode, avgHours] for each consecutive hub pair. */
const LEGS = [
  ["DEL-PKP", "DEL-SC", 3],
  ["DEL-SC", "LKO-MH", 9],
  ["LKO-MH", "GKP-HUB", 9],
  ["GKP-HUB", "SLP-DH", 5],
];

const ROUTE_CODES = ["DEL-PKP", "DEL-SC", "LKO-MH", "GKP-HUB", "SLP-DH"];
const CUMULATIVE_HOURS = [0, 3, 12, 21, 26];

let mongod;
let app;

function staff(path) {
  return request(app).post(path).set("x-api-key", STAFF_API_KEY);
}

function createShipment(overrides = {}) {
  return request(app)
    .post("/api/shipments")
    .send({
      orderId: "ORD-TEST-1001",
      originCity: "Delhi",
      destinationPincode: "274701",
      destinationCity: "Salempur",
      paymentType: "PREPAID",
      originHubCode: "DEL-PKP",
      ...overrides,
    });
}

async function newShipment(overrides = {}) {
  const res = await createShipment(overrides);
  expect(res.status).toBe(201);
  return res.body.shipment.awb;
}

function scan(body) {
  return staff("/api/scan").send(body);
}

function assign(awb, deliveryBoyId = "boy-1") {
  return staff("/api/delivery/assign").send({ awb, deliveryBoyId });
}

function complete(body) {
  return staff("/api/delivery/complete").send(body);
}

function fail(awb, reason = "Customer unavailable") {
  return staff("/api/delivery/fail").send({ awb, reason });
}

/** Walks a parcel to the delivery hub: INBOUND + OUTBOUND at each hop. */
async function sendToDeliveryHub(awb) {
  for (const code of ROUTE_CODES.slice(0, -1)) {
    const inbound = await scan({ awb, hubCode: code, scanType: "INBOUND" });
    expect(inbound.status).toBe(201);
    const outbound = await scan({ awb, hubCode: code, scanType: "OUTBOUND" });
    expect(outbound.status).toBe(201);
  }
  const arrived = await scan({
    awb,
    hubCode: "SLP-DH",
    scanType: "INBOUND",
  });
  expect(arrived.status).toBe(201);
}

beforeAll(async () => {
  /* `mongodb-memory-server` v11 defaults to MongoDB 8.2, which validates the
     handshake's client-metadata document and rejects the Mongoose 9 driver
     ("Missing required sub-document 'driver'"). Pinning to 7.0 keeps the
     in-memory server compatible with the driver this project ships. */
  mongod = await MongoMemoryServer.create({
    binary: { version: process.env.MONGOMS_VERSION || "7.0.14" },
  });
  await mongoose.connect(mongod.getUri("tracking_test"));

  const hubs = await Hub.create(HUBS);
  const idByCode = new Map(hubs.map((hub) => [hub.code, hub._id]));
  await RouteLeg.create(
    LEGS.map(([from, to, avgHours]) => ({
      fromHub: idByCode.get(from),
      toHub: idByCode.get(to),
      mode: "TRUCK",
      avgHours,
    })),
  );

  app = createApp({
    jwtSecret: process.env.JWT_SECRET,
    isProduction: false,
    s3Bucket: "",
    awsRegion: "us-east-1",
    cloudinary: null,
    resend: null,
    staffApiKey: STAFF_API_KEY,
    frontendOrigins: [],
    trustProxyHops: 0,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  /* Hubs and route legs are seeded once and stay put; the transactional
     collections are wiped between tests. Raw `.collection` access bypasses the
     append-only guard on ScanEvent. */
  await Promise.all([
    Shipment.collection.deleteMany({}),
    ScanEvent.collection.deleteMany({}),
    Notification.collection.deleteMany({}),
    Webhook.collection.deleteMany({}),
  ]);
});

describe("route planning", () => {
  it("returns the hub-by-hub route with cumulative ETAs", async () => {
    const res = await request(app).get(
      "/api/route-preview?origin=DEL-PKP&pincode=274701",
    );

    expect(res.status).toBe(200);
    expect(res.body.origin).toBe("DEL-PKP");
    expect(res.body.destinationPincode).toBe("274701");
    expect(res.body.totalHours).toBe(26);
    expect(res.body.route.map((step) => step.code)).toEqual(ROUTE_CODES);
    expect(res.body.route.map((step) => step.cumulativeHours)).toEqual(
      CUMULATIVE_HOURS,
    );
    for (const step of res.body.route) {
      expect(Number.isNaN(new Date(step.expectedArrival).getTime())).toBe(false);
    }
  });

  it("rejects a pincode no delivery hub serves", async () => {
    const res = await request(app).get(
      "/api/route-preview?origin=DEL-PKP&pincode=999999",
    );

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/No delivery hub serves pincode 999999/);
  });

  it("plans the same route and allocates an AWB when a shipment is created", async () => {
    const res = await createShipment();

    expect(res.status).toBe(201);
    expect(res.body.shipment.awb).toMatch(/^FMPP\d{10}$/);
    expect(res.body.route.map((step) => step.code)).toEqual(ROUTE_CODES);
    expect(res.body.shipment.plannedRoute).toHaveLength(ROUTE_CODES.length);

    const detail = await request(app).get(
      `/api/shipments/${res.body.shipment.awb}`,
    );
    expect(detail.status).toBe(200);
    expect(detail.body.shipment.plannedRoute.map((hub) => hub.code)).toEqual(
      ROUTE_CODES,
    );
  });
});

describe("scan order validation", () => {
  it("rejects an OUTBOUND scan before the parcel has arrived anywhere", async () => {
    const awb = await newShipment();

    const res = await scan({ awb, hubCode: "DEL-PKP", scanType: "OUTBOUND" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Cannot record an OUTBOUND scan/);
  });

  it("rejects an INBOUND scan at a hub that is not the next planned hop", async () => {
    const awb = await newShipment();

    const res = await scan({ awb, hubCode: "LKO-MH", scanType: "INBOUND" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Unexpected hub scan/);
    /* The error names the hub that was actually expected next. */
    expect(res.body.message).toMatch(/DEL-SC/);
  });

  it("accepts INBOUND before OUTBOUND and advances the shipment status", async () => {
    const awb = await newShipment();

    const inbound = await scan({ awb, hubCode: "DEL-PKP", scanType: "INBOUND" });
    expect(inbound.status).toBe(201);
    expect(inbound.body.duplicate).toBe(false);
    expect(inbound.body.event.eventCode).toBe(EVENT_CODE.ARRIVED_AT_HUB);
    expect(inbound.body.events.map((e) => e.eventCode)).toEqual([
      EVENT_CODE.ARRIVED_AT_HUB,
      EVENT_CODE.SHIPPED,
    ]);
    expect(inbound.body.shipment.currentStatus).toBe(EVENT_CODE.SHIPPED);

    const outbound = await scan({
      awb,
      hubCode: "DEL-PKP",
      scanType: "OUTBOUND",
    });
    expect(outbound.status).toBe(201);
    expect(outbound.body.event.eventCode).toBe(EVENT_CODE.DISPATCHED_FROM_HUB);
    expect(outbound.body.shipment.currentStatus).toBe(
      EVENT_CODE.DISPATCHED_FROM_HUB,
    );
  });

  it("rejects an OUTBOUND scan from a hub the parcel never reached", async () => {
    const awb = await newShipment();
    await scan({ awb, hubCode: "DEL-PKP", scanType: "INBOUND" });

    const res = await scan({ awb, hubCode: "DEL-SC", scanType: "OUTBOUND" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Cannot record an OUTBOUND scan/);
    expect(res.body.message).toMatch(/DEL-SC/);
  });

  it("requires the staff API key for scan endpoints", async () => {
    const awb = await newShipment();

    const res = await request(app)
      .post("/api/scan")
      .send({ awb, hubCode: "DEL-PKP", scanType: "INBOUND" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/x-api-key/);
  });
});

describe("duplicate scan handling", () => {
  it("ignores a repeated scan at the same hub within the duplicate window", async () => {
    const awb = await newShipment();
    const scannedAt = new Date().toISOString();
    const body = { awb, hubCode: "DEL-PKP", scanType: "INBOUND", scannedAt };

    const first = await scan(body);
    expect(first.status).toBe(201);
    expect(first.body.duplicate).toBe(false);

    const second = await scan(body);
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);
    expect(second.body.events).toHaveLength(1);

    /* Only one ARRIVED_AT_HUB event exists for that hub, and SHIPPED fired once. */
    const arrivals = await ScanEvent.collection.countDocuments({
      eventCode: EVENT_CODE.ARRIVED_AT_HUB,
    });
    const shipped = await ScanEvent.collection.countDocuments({
      eventCode: EVENT_CODE.SHIPPED,
    });
    expect(arrivals).toBe(1);
    expect(shipped).toBe(1);
  });
});

describe("last-mile delivery: OTP handover", () => {
  it("only allows assignment once the parcel is at its delivery hub", async () => {
    const awb = await newShipment();

    const tooEarly = await assign(awb);
    expect(tooEarly.status).toBe(400);
    expect(tooEarly.body.message).toMatch(/not at the delivery hub yet/);
  });

  it("returns a 4-digit OTP and marks the parcel out for delivery", async () => {
    const awb = await newShipment();
    await sendToDeliveryHub(awb);

    const res = await assign(awb);
    expect(res.status).toBe(201);
    expect(res.body.otp).toMatch(/^\d{4}$/);
    expect(res.body.event.eventCode).toBe(EVENT_CODE.OUT_FOR_DELIVERY);
    expect(res.body.shipment.currentStatus).toBe(EVENT_CODE.OUT_FOR_DELIVERY);
  });

  it("rejects a wrong OTP and accepts the correct one", async () => {
    const awb = await newShipment();
    await sendToDeliveryHub(awb);
    const { body: assigned } = await assign(awb);
    const otp = assigned.otp;

    const wrongOtp = otp === "0000" ? "1111" : "0000";
    const rejected = await complete({ awb, otp: wrongOtp });
    expect(rejected.status).toBe(400);
    expect(rejected.body.message).toMatch(/delivery OTP is incorrect/);

    const delivered = await complete({ awb, otp });
    expect(delivered.status).toBe(201);
    expect(delivered.body.event.eventCode).toBe(EVENT_CODE.DELIVERED);
    expect(delivered.body.shipment.currentStatus).toBe(EVENT_CODE.DELIVERED);
    expect(delivered.body.shipment.otp).toBe("");
  });

  it("requires codCollected for a COD shipment", async () => {
    const awb = await newShipment({ paymentType: "COD" });
    await sendToDeliveryHub(awb);
    const { body: assigned } = await assign(awb);

    const missingCod = await complete({ awb, otp: assigned.otp });
    expect(missingCod.status).toBe(400);
    expect(missingCod.body.message).toMatch(/cash was collected/);

    const delivered = await complete({
      awb,
      otp: assigned.otp,
      codCollected: true,
    });
    expect(delivered.status).toBe(201);
    expect(delivered.body.shipment.currentStatus).toBe(EVENT_CODE.DELIVERED);
  });

  it("rejects completing a delivery that was never assigned", async () => {
    const awb = await newShipment();
    await sendToDeliveryHub(awb);

    const res = await complete({ awb, otp: "1234" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not out for delivery/);
  });
});

describe("last-mile delivery: three failures initiate RTO", () => {
  it("counts each failed attempt and returns the parcel to the seller on the third", async () => {
    const awb = await newShipment();
    await sendToDeliveryHub(awb);

    let last;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const assigned = await assign(awb);
      expect(assigned.status).toBe(201);

      last = await fail(awb);
      expect(last.status).toBe(201);
      expect(last.body.shipment.failedAttempts).toBe(attempt);
      expect(last.body.event.eventCode).toBe(EVENT_CODE.DELIVERY_ATTEMPTED);
    }

    /* The third failure records RTO_INITIATED and closes the shipment. */
    expect(last.body.events.map((event) => event.eventCode)).toEqual([
      EVENT_CODE.DELIVERY_ATTEMPTED,
      EVENT_CODE.RTO_INITIATED,
    ]);
    expect(last.body.shipment.currentStatus).toBe(EVENT_CODE.RTO_INITIATED);

    const afterRto = await assign(awb);
    expect(afterRto.status).toBe(400);
    expect(afterRto.body.message).toMatch(/on its way back to the seller/);
  });

  it("rejects a failure with no delivery attempt in progress", async () => {
    const awb = await newShipment();
    await sendToDeliveryHub(awb);

    const res = await fail(awb);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/No delivery attempt is in progress/);
  });
});

describe("tracking API output shape", () => {
  it("returns summary, timeline, groupedStatus, progress and an ETA", async () => {
    const awb = await newShipment({ orderId: "ORD-SHAPE-1" });
    await scan({ awb, hubCode: "DEL-PKP", scanType: "INBOUND" });

    const res = await request(app).get(`/api/track/${awb}`);
    expect(res.status).toBe(200);

    const { summary, timeline, groupedStatus, progress, estimatedDeliveryDate } =
      res.body;

    expect(summary).toEqual({
      awb,
      orderId: "ORD-SHAPE-1",
      paymentType: "PREPAID",
      destinationCity: "Salempur",
      currentStatus: EVENT_CODE.SHIPPED,
    });

    expect(Array.isArray(timeline)).toBe(true);
    for (const entry of timeline) {
      expect(Object.keys(entry).sort()).toEqual(
        ["eventCode", "hubCity", "hubName", "message", "scannedAt"].sort(),
      );
      expect(Number.isNaN(new Date(entry.scannedAt).getTime())).toBe(false);
    }
    expect(timeline.map((entry) => entry.eventCode)).toEqual(
      expect.arrayContaining([
        EVENT_CODE.ORDER_PLACED,
        EVENT_CODE.SELLER_PROCESSED,
        EVENT_CODE.PICKED_UP,
        EVENT_CODE.ARRIVED_AT_HUB,
        EVENT_CODE.SHIPPED,
      ]),
    );

    expect(groupedStatus.map((group) => group.group)).toEqual([
      "Order Confirmed",
      "Shipped",
      "In Transit",
      "Out For Delivery",
      "Delivered",
    ]);
    const groupByName = new Map(
      groupedStatus.map((group) => [group.group, group.events]),
    );
    expect(groupByName.get("Shipped").map((e) => e.eventCode)).toEqual([
      EVENT_CODE.PICKED_UP,
      EVENT_CODE.SHIPPED,
    ]);
    expect(groupByName.get("In Transit").map((e) => e.eventCode)).toEqual([
      EVENT_CODE.ARRIVED_AT_HUB,
    ]);

    expect(progress.map((step) => step.code)).toEqual(ROUTE_CODES);
    expect(progress.map((step) => step.status)).toEqual([
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);

    expect(Number.isNaN(new Date(estimatedDeliveryDate).getTime())).toBe(false);
  });

  it("marks visited hubs as the parcel moves through the network", async () => {
    const awb = await newShipment();
    for (const code of ["DEL-PKP", "DEL-SC"]) {
      await scan({ awb, hubCode: code, scanType: "INBOUND" });
      await scan({ awb, hubCode: code, scanType: "OUTBOUND" });
    }

    const res = await request(app).get(`/api/track/${awb}`);
    expect(res.status).toBe(200);
    expect(res.body.progress.map((step) => step.status)).toEqual([
      "visited",
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
  });

  it("returns 404 for an unknown AWB", async () => {
    const res = await request(app).get("/api/track/FMPP0000000000");
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/No shipment found/);
  });

  it("lists hubs for the scanner dropdown", async () => {
    const res = await request(app).get("/api/hubs");
    expect(res.status).toBe(200);
    expect(res.body.hubs.map((hub) => hub.code)).toEqual(
      [...ROUTE_CODES].sort(),
    );
  });
});
