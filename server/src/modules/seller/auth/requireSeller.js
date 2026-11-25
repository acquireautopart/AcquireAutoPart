const jwt = require("jsonwebtoken");
const Seller = require("../models/Seller");

async function requireSeller(req, res, next) {
  const token = req.cookies?.seller_session;
  if (!token)
    return res
      .status(401)
      .json({ message: "Sign in to your seller account to continue." });
  let claims;
  try {
    claims = jwt.verify(token, req.app.locals.jwtSecret);
  } catch {
    return res
      .status(401)
      .json({ message: "Your seller session expired. Please sign in again." });
  }
  if (!claims || claims.role !== "seller" || typeof claims.sub !== "string")
    return res.status(401).json({ message: "Your seller session is invalid." });
  const seller = await Seller.findById(claims.sub)
    .select("-passwordHash")
    .lean();
  if (!seller)
    return res
      .status(401)
      .json({ message: "Seller account not found. Please sign in again." });
  if ((claims.authVersion || 0) !== (seller.authVersion || 0))
    return res
      .status(401)
      .json({ message: "Your seller session expired. Please sign in again." });
  req.seller = seller;
  return next();
}

module.exports = requireSeller;
