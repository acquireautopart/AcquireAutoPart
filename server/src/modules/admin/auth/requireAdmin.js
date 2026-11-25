const jwt = require("jsonwebtoken");

function requireAdmin(req, res, next) {
  const token = req.cookies?.admin_session;
  if (!token)
    return res
      .status(401)
      .json({ message: "Sign in to the admin console to continue." });
  try {
    const claims = jwt.verify(token, req.app.locals.jwtSecret);
    if (
      claims.role !== "superadmin" ||
      claims.sub !== process.env.ADMIN_EMAIL?.trim().toLowerCase()
    )
      throw new Error("Invalid administrator claim.");
    req.admin = {
      email: claims.sub,
      name: process.env.ADMIN_NAME || "Marketplace administrator",
      role: "Super admin",
    };
    return next();
  } catch {
    return res
      .status(401)
      .json({ message: "Your admin session expired. Please sign in again." });
  }
}

module.exports = requireAdmin;
