const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const mongoose = require("mongoose");
const morgan = require("morgan");
const { authRouter } = require("./modules/customer/auth/routes");
const requireCustomer = require("./modules/customer/auth/requireCustomer");
const { profileRouter } = require("./modules/customer/profile/routes");
const { cartRouter, ordersRouter } = require("./modules/customer/shop/routes");
const { sellerRouter } = require("./modules/seller/routes");
const { adminRouter } = require("./modules/admin/routes");
const { deliveryRouter } = require("./modules/delivery/routes");
const { trackingRouter } = require("./modules/tracking/routes");
const {
  trackingAdminRouter,
} = require("./modules/tracking/adminRoutes");
const productReviewController = require("./modules/customer/reviews/controller");
const maintenanceMode = require("./middleware/maintenanceMode");
const errorHandler = require("./middleware/errorHandler");
const { getMarketContext } = require("./modules/market/service");
const { getCountryOptions } = require("./modules/market/countries");
const stripeWebhookController = require("./modules/payments/stripe/controller");

const DB_CONNECTION_STATES = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

function createApp(config) {
  const app = express();

  app.disable("x-powered-by");
  app.locals.jwtSecret = config.jwtSecret;
  app.locals.isProduction = config.isProduction;
  app.locals.objectStorage = {
    bucket: config.s3Bucket,
    region: config.awsRegion,
  };
  app.locals.cloudinary = config.cloudinary;
  app.locals.resend = config.resend || null;
  app.locals.staffApiKey = config.staffApiKey || "";
  app.locals.frontendOrigins = config.frontendOrigins || [];
  app.set("trust proxy", config.trustProxyHops);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.frontendOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(
          new Error("This origin is not allowed to access the customer API."),
        );
      },
      credentials: true,
    }),
  );
  app.post(
    "/api/payments/stripe/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhookController.webhook,
  );
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());
  app.use(morgan(config.isProduction ? "combined" : "dev"));

  app.get("/api/health", (_req, res) =>
    res.json({
      status: "ok",
      db: DB_CONNECTION_STATES[mongoose.connection.readyState] || "unknown",
    }),
  );
  app.get("/api/market/context", async (req, res) => {
    return res.json(await getMarketContext(req.headers, req.query.country));
  });
  app.get("/api/market/countries", (_req, res) => {
    return res.json({ countries: getCountryOptions() });
  });
  app.use(
    [
      "/api/auth",
      "/api/profile",
      "/api/cart",
      "/api/orders",
      "/api/catalog/products",
    ],
    maintenanceMode,
  );
  app.use("/api/auth", authRouter);
  app.use("/api/profile", requireCustomer, profileRouter);
  app.use("/api/cart", requireCustomer, cartRouter);
  app.use("/api/orders", requireCustomer, ordersRouter);
  const sellerController = require("./modules/seller/controller");
  app.get("/api/catalog/products", sellerController.publicCatalog);
  app.get(
    "/api/catalog/products/:productId/reviews/eligibility",
    requireCustomer,
    productReviewController.getReviewEligibility,
  );
  app.get(
    "/api/catalog/products/:productId/reviews",
    productReviewController.listReviews,
  );
  app.post(
    "/api/catalog/products/:productId/reviews",
    requireCustomer,
    productReviewController.createReview,
  );
  app.get("/api/catalog/products/:id", sellerController.publicProduct);
  app.use("/api/seller", sellerRouter);
  /* Mounted before the marketplace admin router: /api/admin/tracking/* is
     guarded by the staff x-api-key, while everything else under /api/admin
     keeps its admin session guard. */
  app.use("/api/admin", trackingAdminRouter);
  app.use("/api/admin", adminRouter);
  /* Mounted before the delivery-agent router: the public last-mile tracking
     endpoints share the /api/delivery prefix and must not be caught by that
     router's authentication guard. */
  app.use("/api", trackingRouter);
  app.use("/api/delivery", deliveryRouter);
  app.use((req, res) => {
    res
      .status(404)
      .json({ success: false, message: "API endpoint not found." });
  });
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
