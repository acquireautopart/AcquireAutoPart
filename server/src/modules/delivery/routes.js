const express = require("express");
const { Router } = require("express");
const authRateLimiter = require("../customer/auth/rateLimiter");
const controller = require("./controller");
const requireDeliveryAgent = require("./auth/requireDeliveryAgent");
const { requireStaffRole } = require("./auth/requireDeliveryAgent");

const deliveryRouter = Router();

deliveryRouter.post("/auth/login", authRateLimiter, controller.login);
deliveryRouter.post(
  "/auth/applications",
  authRateLimiter,
  controller.createApplication,
);
deliveryRouter.put(
  "/auth/applications/files",
  authRateLimiter,
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    limit: "5mb",
  }),
  controller.uploadApplicationFile,
);
deliveryRouter.post("/auth/logout", controller.logout);
deliveryRouter.get("/auth/me", requireDeliveryAgent, controller.me);
deliveryRouter.use(requireDeliveryAgent);
deliveryRouter.patch("/auth/password", controller.changePassword);
deliveryRouter.get(
  "/tasks",
  requireStaffRole("delivery_agent"),
  controller.tasks,
);
deliveryRouter.post(
  "/tasks/:orderId/events",
  requireStaffRole("delivery_agent"),
  controller.addTaskEvent,
);
deliveryRouter.post(
  "/reverse-tasks/:id/events",
  requireStaffRole("delivery_agent"),
  controller.addReverseTaskEvent,
);
deliveryRouter.get(
  "/hub/tasks",
  requireStaffRole("hub_staff"),
  controller.hubTasks,
);
deliveryRouter.post(
  "/hub/tasks/:orderId/events",
  requireStaffRole("hub_staff"),
  controller.addHubTaskEvent,
);
deliveryRouter.post(
  "/hub/reverse-tasks/:id/events",
  requireStaffRole("hub_staff"),
  controller.addHubReverseTaskEvent,
);
deliveryRouter.patch(
  "/auth/availability",
  requireStaffRole("delivery_agent"),
  controller.setAvailability,
);

module.exports = { deliveryRouter };
