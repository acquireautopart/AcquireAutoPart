const AdminSetting = require("../modules/admin/models/AdminSetting");

let cachedUntil = 0;
let cachedMode = false;
let pendingRead = null;

async function maintenanceMode(req, res, next) {
  try {
    if (Date.now() >= cachedUntil) {
      pendingRead ||= AdminSetting.findOne({ key: "marketplace" })
        .select("maintenanceMode")
        .lean()
        .then((settings) => {
          cachedMode = Boolean(settings?.maintenanceMode);
          cachedUntil = Date.now() + 10000;
          return cachedMode;
        })
        .finally(() => {
          pendingRead = null;
        });
      await pendingRead;
    }
    const isPublicCatalogRead =
      req.method === "GET" &&
      /^\/api\/catalog\/products(?:\/|$)/.test(req.originalUrl.split("?")[0]);
    const isCustomerSessionRead =
      req.method === "GET" && req.originalUrl.split("?")[0] === "/api/auth/me";
    if (cachedMode && !isPublicCatalogRead && !isCustomerSessionRead)
      return res.status(503).json({
        message:
          "The marketplace is temporarily in maintenance mode. Please try again soon.",
      });
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = maintenanceMode;
