const { Router } = require("express");
const express = require("express");
const controller = require("./controller");
const requireSeller = require("./auth/requireSeller");
const authRateLimiter = require("../customer/auth/rateLimiter");
const {
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
} = require("./auth/passwordResetRateLimiters");

const sellerRouter = Router();
sellerRouter.post("/auth/register", authRateLimiter, controller.register);
sellerRouter.post("/auth/login", authRateLimiter, controller.login);
sellerRouter.post(
  "/auth/forgot-password",
  forgotPasswordRateLimiter,
  controller.forgotPassword,
);
sellerRouter.post(
  "/auth/reset-password",
  resetPasswordRateLimiter,
  controller.resetPassword,
);
sellerRouter.post("/auth/logout", controller.logout);
sellerRouter.get("/auth/me", requireSeller, controller.me);
sellerRouter.use(requireSeller);
sellerRouter.post(
  "/products/images",
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp"],
    limit: "5mb",
  }),
  controller.uploadProductImage,
);
sellerRouter.get("/connect/status", controller.stripeConnectStatus);
sellerRouter.post("/connect/account-link", controller.createStripeConnectLink);
sellerRouter.get("/notifications", controller.notifications);
sellerRouter.patch("/notifications/:id/read", controller.readNotification);
sellerRouter.get("/hubs", controller.hubs);
sellerRouter.put(
  "/verification/document",
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    limit: "5mb",
  }),
  controller.submitIdentityDocument,
);
sellerRouter.put(
  "/verification/signature",
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    limit: "5mb",
  }),
  controller.submitSignatureDocument,
);
sellerRouter.get("/dashboard", controller.dashboard);
sellerRouter.get("/categories", controller.categories);
sellerRouter.get("/products", controller.products);
sellerRouter.post(
  "/products/import/preview",
  express.raw({
    type: [
      "application/vnd.acquireauto.products+json",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    limit: "5mb",
  }),
  controller.previewProductImport,
);
sellerRouter.post(
  "/products/import",
  express.raw({
    type: [
      "application/vnd.acquireauto.products+json",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    limit: "5mb",
  }),
  controller.importProducts,
);
sellerRouter.post("/products", controller.createProduct);
sellerRouter.patch("/products/:id", controller.updateProduct);
sellerRouter.delete("/products", controller.deleteProducts);
sellerRouter.delete("/products/:id", controller.deleteProduct);
sellerRouter.patch("/products/:id/stock", controller.adjustStock);
sellerRouter.get("/orders", controller.orders);
sellerRouter.post("/orders/scan", controller.scanOrder);
sellerRouter.patch("/orders/:id", controller.updateOrder);
sellerRouter.get("/returns", controller.returns);
sellerRouter.patch("/returns/:id", controller.updateReturn);
sellerRouter.get("/discounts", controller.discounts);
sellerRouter.post("/discounts", controller.createDiscount);
sellerRouter.patch("/discounts/:id", controller.updateDiscount);
sellerRouter.delete("/discounts/:id", controller.deleteDiscount);
sellerRouter.get("/payouts", controller.payouts);
sellerRouter.patch("/settings", controller.settings);

module.exports = { sellerRouter };
