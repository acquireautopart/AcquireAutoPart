const { Router } = require("express");
const controller = require("./controllers/trackingController");
const requireApiKey = require("./middleware/requireApiKey");
const {
  createShipmentSchema,
  recordScanSchema,
  routePreviewQuerySchema,
  assignDeliverySchema,
  completeDeliverySchema,
  failDeliverySchema,
  validateBody,
  validateQuery,
} = require("./validation");

const trackingRouter = Router();

trackingRouter.get(
  "/route-preview",
  validateQuery(routePreviewQuerySchema),
  controller.routePreview,
);
trackingRouter.post(
  "/shipments",
  validateBody(createShipmentSchema),
  controller.createShipment,
);
trackingRouter.get("/shipments/:awb", controller.getShipment);
trackingRouter.get("/hubs", controller.listHubs);

/* Staff-only from here on: every call must carry the x-api-key header. */
trackingRouter.post(
  "/scan",
  requireApiKey,
  validateBody(recordScanSchema),
  controller.recordScan,
);
trackingRouter.post(
  "/delivery/assign",
  requireApiKey,
  validateBody(assignDeliverySchema),
  controller.assignDelivery,
);
trackingRouter.post(
  "/delivery/complete",
  requireApiKey,
  validateBody(completeDeliverySchema),
  controller.completeDelivery,
);
trackingRouter.post(
  "/delivery/fail",
  requireApiKey,
  validateBody(failDeliverySchema),
  controller.failDelivery,
);

/* Customer tracking view. */
trackingRouter.get("/track/:awb", controller.track);

module.exports = { trackingRouter };
