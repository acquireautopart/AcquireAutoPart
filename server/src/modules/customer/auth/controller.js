const jwt = require("jsonwebtoken");
const authService = require("./service");
const { getCredentials, getLoginCredentials } = require("./validators");
const { resolveCountry } = require("../../market/service");

const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

function setSessionCookie(res, customerId) {
  const token = jwt.sign(
    { sub: customerId.toString() },
    res.app.locals.jwtSecret,
    { expiresIn: "7d" },
  );

  res.cookie("customer_session", token, {
    httpOnly: true,
    secure: res.app.locals.isProduction,
    sameSite: res.app.locals.isProduction ? "none" : "lax",
    maxAge: sessionDurationMs,
    path: "/",
  });
}

function serializeCustomer(customer) {
  return {
    id: customer._id.toString(),
    name: customer.name,
    email: customer.email,
    profilePhoto: customer.profilePhoto || "",
    role: customer.role || "customer",
    country: customer.marketCountry || "US",
    createdAt: customer.createdAt,
  };
}

async function register(req, res) {
  const credentials = getCredentials(req.body);
  if (credentials.error) {
    return res.status(400).json({ message: credentials.error });
  }

  const country = resolveCountry(req.headers, req.body?.country);
  const customer = await authService.registerCustomer({
    ...credentials,
    marketCountry: country.code,
  });
  setSessionCookie(res, customer._id);
  return res.status(201).json({ customer: serializeCustomer(customer) });
}

async function login(req, res) {
  const credentials = getLoginCredentials(req.body);
  if (credentials.error) {
    return res.status(400).json({ message: credentials.error });
  }

  const country = resolveCountry(req.headers, req.body?.country);
  const customer = await authService.authenticateCustomer({
    ...credentials,
    marketCountry: country.code,
  });
  if (!customer) {
    return res.status(401).json({ message: "Email or password is incorrect." });
  }

  setSessionCookie(res, customer._id);
  return res.json({ customer: serializeCustomer(customer) });
}

function getCurrentCustomer(req, res) {
  return res.json({ customer: serializeCustomer(req.customer) });
}

function logout(req, res) {
  res.clearCookie("customer_session", {
    httpOnly: true,
    secure: res.app.locals.isProduction,
    sameSite: res.app.locals.isProduction ? "none" : "lax",
    path: "/",
  });
  return res.json({ message: "You have been signed out." });
}

module.exports = { register, login, getCurrentCustomer, logout };
