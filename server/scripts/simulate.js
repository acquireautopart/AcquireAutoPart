/**
 * Replays one complete Delhi -> Salempur shipment through the tracking network:
 * an inbound and an outbound scan at every hub, then a delivery-boy assignment,
 * an out-for-delivery scan and a successful delivery with the OTP.
 *
 *   npm run simulate
 *   npm run simulate -- --speed=2000
 *
 * The timeline is written past-to-present: the first scan is stamped before the
 * run starts and the delivery lands around "now". Real time is compressed by
 * --speed (simulated seconds per real second); without it the whole journey is
 * replayed in about a minute.
 */
require("dotenv").config();

const mongoose = require("mongoose");
const Hub = require("../src/modules/tracking/models/Hub");
const ScanEvent = require("../src/modules/tracking/models/ScanEvent");
const {
  HUB_TYPE,
  PAYMENT_TYPE,
  SCAN_TYPE,
} = require("../src/modules/tracking/constants");
const { planRoute } = require("../src/modules/tracking/services/routePlanner");
const {
  createShipment,
} = require("../src/modules/tracking/services/shipmentService");
const { recordScan } = require("../src/modules/tracking/services/scanService");
const {
  assignDelivery,
  completeDelivery,
} = require("../src/modules/tracking/services/lastMileService");

const ORIGIN_CITY = "Delhi";
const DESTINATION_CITY = "Salempur";
const DESTINATION_PINCODE = "274701";
const DELIVERY_BOY_ID = "DB-SIM-01";
const TRACKING_BASE =
  process.env.DELIVERY_FRONTEND_URL?.trim() || "http://localhost:3003";

const MINUTE_MS = 60 * 1000;
/** Simulated minutes, [min, max]. */
const PICKUP_DELAY = [20, 45];
const HUB_DWELL = [30, 120];
/** Random +/- variation applied to each planned leg time. */
const LEG_JITTER = 0.2;
/** Target wall-clock length of the replay when --speed is not given. */
const TARGET_RUN_MINUTES = 1;
const FINAL_MILE_DELAY_MINUTES = 90;

function randomBetween([min, max]) {
  return min + Math.random() * (max - min);
}

function argValue(argv, name) {
  const flag = argv.find(
    (value) => value === `--${name}` || value.startsWith(`--${name}=`),
  );
  if (!flag) return null;
  if (flag.includes("=")) return flag.split("=").slice(1).join("=");
  return argv[argv.indexOf(flag) + 1] ?? "";
}

function readSpeed(argv) {
  const raw = argValue(argv, "speed");
  if (raw === null) return null;
  const speed = Number(raw);
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new Error(
      "--speed must be a positive number, for example --speed=2000 (or --speed 2000).",
    );
  }
  return speed;
}

/** "Sat, 7 Nov 26, 7:40 am" */
function stamp(date) {
  return new Date(date).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function print(at, scope, eventCode, message) {
  console.log(
    `${stamp(at).padEnd(24)} | ${scope.padEnd(14)} | ${String(eventCode).padEnd(20)} | ${message}`,
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(ms, 0)));
}

/**
 * Turns the planned route into a list of timed hub scans: reach the hub, dwell,
 * dispatch. Travel time between hubs is the planned leg time with jitter.
 */
function buildSchedule(steps) {
  let cursor = 0;
  const schedule = [];

  steps.forEach((step, index) => {
    if (index === 0) {
      cursor += randomBetween(PICKUP_DELAY) * MINUTE_MS;
    } else {
      const plannedHours = Math.max(
        step.cumulativeHours - steps[index - 1].cumulativeHours,
        0.25,
      );
      const jitter = 1 + (Math.random() * 2 - 1) * LEG_JITTER;
      cursor += plannedHours * 60 * MINUTE_MS * jitter;
    }

    schedule.push({
      atMs: cursor,
      kind: SCAN_TYPE.INBOUND,
      code: step.hub.code,
    });

    cursor += randomBetween(HUB_DWELL) * MINUTE_MS;
    schedule.push({
      atMs: cursor,
      kind: SCAN_TYPE.OUTBOUND,
      code: step.hub.code,
    });
  });

  return schedule;
}

async function main() {
  const speedArg = readSpeed(process.argv.slice(2));

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  try {
    const origin = await Hub.findOne({
      hubType: HUB_TYPE.PICKUP,
      city: ORIGIN_CITY,
    }).lean();
    if (!origin) {
      throw new Error(
        `No pickup hub found in ${ORIGIN_CITY}. Run "npm run seed" first.`,
      );
    }

    const steps = await planRoute(origin.code, DESTINATION_PINCODE);
    const schedule = buildSchedule(steps);
    const totalSimMs = schedule[schedule.length - 1].atMs;
    const speed =
      speedArg ?? Math.max(1, totalSimMs / (TARGET_RUN_MINUTES * 60 * 1000));
    const start = new Date(Date.now() - totalSimMs);
    for (const entry of schedule) {
      entry.at = new Date(start.getTime() + entry.atMs);
    }

    console.log(`Route     : ${steps.map((step) => step.hub.code).join(" -> ")}`);
    console.log(
      `Simulated : ${(totalSimMs / 3600000).toFixed(1)} h, ${stamp(start)} -> ${stamp(new Date(start.getTime() + totalSimMs))}`,
    );
    console.log(
      `Replaying : ${(totalSimMs / speed / 1000).toFixed(0)} s of real time (--speed=${Math.round(speed)})`,
    );
    console.log("");

    const { shipment } = await createShipment({
      orderId: `SIM-${Date.now()}`,
      originCity: ORIGIN_CITY,
      destinationPincode: DESTINATION_PINCODE,
      destinationCity: DESTINATION_CITY,
      paymentType: PAYMENT_TYPE.COD,
      originHubCode: origin.code,
    });

    /* Anchor the three opening events at the start of the replay window so the
       customer timeline reads past-to-present. ScanEvent is append-only, so this
       one-off backdate goes through the raw collection. */
    await ScanEvent.collection.updateMany(
      { shipment: shipment._id, hub: null },
      { $set: { scannedAt: start } },
    );

    console.log(`AWB       : ${shipment.awb}`);
    print(start, "system", "ORDER_PLACED", "Your order has been placed");
    print(start, "system", "SELLER_PROCESSED", "Seller has processed your order");
    print(start, "system", "PICKED_UP", "Your item has been picked up by delivery partner");
    console.log("");

    let previousMs = 0;
    for (const entry of schedule) {
      await sleep((entry.atMs - previousMs) / speed);
      previousMs = entry.atMs;

      const result = await recordScan({
        awb: shipment.awb,
        hubCode: entry.code,
        scanType: entry.kind,
        scannedBy: "simulator",
        scannedAt: entry.at,
      });

      for (const event of result.events) {
        print(entry.at, `${entry.kind} ${entry.code}`, event.eventCode, event.message);
      }
    }

    console.log("");
    await sleep(randomBetween(HUB_DWELL) * MINUTE_MS / speed);

    const assigned = await assignDelivery({
      awb: shipment.awb,
      deliveryBoyId: DELIVERY_BOY_ID,
    });
    print(
      assigned.event.scannedAt,
      `ASSIGN ${DELIVERY_BOY_ID}`,
      assigned.event.eventCode,
      assigned.event.message,
    );
    console.log(`OTP       : ${assigned.otp} (would be sent to the customer by SMS)`);

    await sleep((FINAL_MILE_DELAY_MINUTES * MINUTE_MS) / speed);

    const completed = await completeDelivery({
      awb: shipment.awb,
      otp: assigned.otp,
      codCollected: true,
      scannedBy: DELIVERY_BOY_ID,
    });
    print(
      completed.event.scannedAt,
      "DELIVERY",
      completed.event.eventCode,
      `${completed.event.message} (COD collected)`,
    );

    console.log("");
    console.log(`Status    : ${completed.shipment.currentStatus}`);
    console.log(`Track it  : ${TRACKING_BASE}/track/${shipment.awb}`);
    console.log(`API view  : http://localhost:${process.env.PORT || 5000}/api/track/${shipment.awb}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("Simulation failed:", error.message);
  process.exitCode = 1;
});
