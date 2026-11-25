const { Router } = require("express");
const controller = require("./controller");
const requireAdmin = require("./auth/requireAdmin");
const authRateLimiter = require("../customer/auth/rateLimiter");

const adminRouter = Router();
adminRouter.post("/auth/login", authRateLimiter, controller.login);
adminRouter.post("/auth/logout", controller.logout);
adminRouter.get("/public/content", controller.publicContent);
adminRouter.get("/auth/me", requireAdmin, controller.me);
adminRouter.use(requireAdmin);
adminRouter.get("/dashboard", controller.dashboard);
adminRouter.get("/categories", controller.categories);
adminRouter.post("/categories", controller.createCategory);
adminRouter.patch("/categories/:id", controller.updateCategory);
adminRouter.delete("/categories/:id", controller.deleteCategory);
adminRouter.get("/sellers", controller.sellers);
adminRouter.get("/sellers/:id/verification", controller.sellerVerification);
adminRouter.patch(
  "/sellers/:id/verification",
  controller.reviewSellerVerification,
);
adminRouter.patch("/sellers/:id", controller.updateSeller);
adminRouter.get("/products", controller.products);
adminRouter.patch("/products/:id/moderation", controller.moderateProduct);
adminRouter.get("/customers", controller.customers);
adminRouter.get("/orders", controller.orders);
adminRouter.get("/returns", controller.returns);
adminRouter.patch("/returns/:id", controller.updateReturn);
adminRouter.get("/tickets", controller.tickets);
adminRouter.patch("/tickets/:id", controller.updateTicket);
adminRouter.get("/payments", controller.payments);
adminRouter.post("/payments/:id/cod-collected", controller.recordCodCollection);
adminRouter.get("/delivery/agents", controller.deliveryAgents);
adminRouter.post("/delivery/hub-staff", controller.createHubStaff);
adminRouter.get(
  "/delivery/agents/:id/application",
  controller.deliveryAgentApplication,
);
adminRouter.patch(
  "/delivery/agents/:id/application",
  controller.reviewDeliveryAgent,
);
adminRouter.patch("/delivery/agents/:id", controller.updateDeliveryAgent);
adminRouter.get("/delivery/shipments", controller.deliveryShipments);
adminRouter.post(
  "/delivery/shipments/:orderId/assign",
  controller.assignDeliveryShipment,
);
adminRouter.get("/settings", controller.settings);
adminRouter.patch("/settings", controller.updateSettings);
adminRouter.get("/audit", controller.audit);

module.exports = { adminRouter };
