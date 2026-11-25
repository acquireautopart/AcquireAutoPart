const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");

async function requireCustomer(req, res, next) {
  const token = req.cookies?.customer_session;

  if (!token) {
    return res.status(401).json({ message: "Please sign in to continue." });
  }

  let claims;
  try {
    claims = jwt.verify(token, req.app.locals.jwtSecret);
  } catch {
    return res
      .status(401)
      .json({ message: "Your session has expired. Please sign in again." });
  }

  if (typeof claims !== "object" || typeof claims.sub !== "string") {
    return res
      .status(401)
      .json({ message: "Your session is invalid. Please sign in again." });
  }

  const customer = await Customer.findById(claims.sub)
    .select("_id name email phone profilePhoto preferences role createdAt")
    .lean();
  if (!customer) {
    return res
      .status(401)
      .json({ message: "Your account could not be found. Please sign in." });
  }

  req.customer = customer;
  return next();
}

module.exports = requireCustomer;
