const jwt = require("jsonwebtoken");
const DeliveryAgent = require("../models/DeliveryAgent");

async function requireDeliveryAgent(req, res, next) {
  const token = req.cookies?.delivery_session;
  if (!token) {
    return res
      .status(401)
      .json({ message: "Sign in to your delivery account to continue." });
  }
  let claims;
  try {
    claims = jwt.verify(token, req.app.locals.jwtSecret);
  } catch {
    return res
      .status(401)
      .json({
        message: "Your delivery session expired. Please sign in again.",
      });
  }
  if (
    !(
      (claims?.role === "delivery_staff" &&
        ["delivery_agent", "hub_staff"].includes(claims.staffRole)) ||
      (claims?.role === "delivery_agent" && claims.staffRole === undefined)
    ) ||
    typeof claims.sub !== "string"
  ) {
    return res
      .status(401)
      .json({ message: "Your delivery session is invalid." });
  }
  const agent = await DeliveryAgent.findById(claims.sub).select(
    "-passwordHash",
  );
  if (
    !agent ||
    !agent.isActive ||
    agent.role !== (claims.staffRole || "delivery_agent") ||
    (claims.authVersion || 0) !== agent.authVersion
  ) {
    return res
      .status(401)
      .json({
        message: "Your delivery account is inactive. Contact an administrator.",
      });
  }
  req.deliveryAgent = agent;
  return next();
}

function requireStaffRole(role) {
  return (req, res, next) => {
    if (req.deliveryAgent?.role !== role) {
      return res.status(403).json({
        message:
          role === "hub_staff"
            ? "Sign in with a hub staff account to scan facility shipments."
            : "Sign in with a delivery partner account to update deliveries.",
      });
    }
    return next();
  };
}

module.exports = requireDeliveryAgent;
module.exports.requireStaffRole = requireStaffRole;
