const { planRoute } = require("../services/routePlanner");
const Hub = require("../models/Hub");
const { createShipment, getShipmentByAwb } = require("../services/shipmentService");
const { recordScan } = require("../services/scanService");
const {
  assignDelivery,
  completeDelivery,
  failDelivery,
} = require("../services/lastMileService");
const { trackShipment } = require("../services/trackService");

function publicHub(hub) {
  return {
    id: String(hub._id),
    code: hub.code,
    name: hub.name,
    city: hub.city,
    district: hub.district,
    state: hub.state,
    hubType: hub.hubType,
  };
}

function publicStep(step) {
  return {
    ...publicHub(step.hub),
    cumulativeHours: step.cumulativeHours,
    expectedArrival: step.expectedArrival,
  };
}

async function routePreview(req, res) {
  const { origin, pincode } = req.validated.query;
  const steps = await planRoute(origin, pincode);
  return res.json({
    origin: origin.toUpperCase(),
    destinationPincode: pincode,
    totalHours: steps[steps.length - 1].cumulativeHours,
    route: steps.map(publicStep),
  });
}

async function createShipmentHandler(req, res) {
  const { shipment, route } = await createShipment(req.validated.body);
  return res.status(201).json({
    shipment,
    route: route.map(publicStep),
  });
}

async function getShipmentHandler(req, res) {
  const shipment = await getShipmentByAwb(req.params.awb);
  return res.json({ shipment });
}

async function recordScanHandler(req, res) {
  const result = await recordScan(req.validated.body);
  return res.status(result.duplicate ? 200 : 201).json({
    event: result.event,
    events: result.events,
    shipment: result.shipment,
    duplicate: result.duplicate,
  });
}

async function assignDeliveryHandler(req, res) {
  const result = await assignDelivery(req.validated.body);
  return res.status(201).json({
    shipment: result.shipment,
    event: result.event,
    events: [result.event],
    otp: result.otp,
  });
}

async function completeDeliveryHandler(req, res) {
  const result = await completeDelivery(req.validated.body);
  return res.status(201).json({
    shipment: result.shipment,
    event: result.event,
    events: [result.event],
  });
}

async function failDeliveryHandler(req, res) {
  const result = await failDelivery(req.validated.body);
  return res.status(201).json({
    shipment: result.shipment,
    event: result.event,
    events: result.events,
  });
}

async function trackHandler(req, res) {
  const tracking = await trackShipment(req.params.awb);
  return res.json(tracking);
}

/** Every hub, for the scanner's "current hub" dropdown. */
async function listHubsHandler(_req, res) {
  const hubs = await Hub.find().sort({ code: 1 }).lean();
  return res.json({ hubs: hubs.map(publicHub) });
}

module.exports = {
  routePreview,
  createShipment: createShipmentHandler,
  getShipment: getShipmentHandler,
  recordScan: recordScanHandler,
  assignDelivery: assignDeliveryHandler,
  completeDelivery: completeDeliveryHandler,
  failDelivery: failDeliveryHandler,
  track: trackHandler,
  listHubs: listHubsHandler,
};
