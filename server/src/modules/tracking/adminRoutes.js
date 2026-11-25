const { Router } = require("express");
const controller = require("./controllers/adminController");
const requireApiKey = require("./middleware/requireApiKey");
const {
  adminShipmentsQuerySchema,
  adminStuckQuerySchema,
  adminListQuerySchema,
  registerWebhookSchema,
  validateBody,
  validateQuery,
} = require("./validation");

/**
 * Operations endpoints for the tracking network. Mounted at /api/admin before
 * the marketplace admin router, so the whole surface is guarded by the staff
 * x-api-key instead of an admin session.
 */
const trackingAdminRouter = Router();

/* Scoped to /tracking so the router passes every other /api/admin path (for
   example /api/admin/sellers) straight through to the marketplace admin
   router instead of rejecting it. */
trackingAdminRouter.use("/tracking", requireApiKey);

trackingAdminRouter.get(
  "/tracking/shipments",
  validateQuery(adminShipmentsQuerySchema),
  controller.listShipments,
);
trackingAdminRouter.get(
  "/tracking/stuck",
  validateQuery(adminStuckQuerySchema),
  controller.stuckShipments,
);
trackingAdminRouter.get("/tracking/hub-load", controller.hubLoad);
trackingAdminRouter.get(
  "/tracking/notifications",
  validateQuery(adminListQuerySchema),
  controller.listNotifications,
);
trackingAdminRouter.get("/tracking/webhooks", controller.getWebhooks);
trackingAdminRouter.post(
  "/tracking/webhooks",
  validateBody(registerWebhookSchema),
  controller.createWebhook,
);

module.exports = { trackingAdminRouter };
