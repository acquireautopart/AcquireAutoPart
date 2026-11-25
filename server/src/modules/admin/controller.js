const jwt = require("jsonwebtoken");
const service = require("./service");

const COOKIE = "admin_session";
const COOKIE_AGE = 8 * 60 * 60 * 1000;
function cookieOptions(res) {
  return {
    httpOnly: true,
    secure: res.app.locals.isProduction,
    sameSite: res.app.locals.isProduction ? "none" : "lax",
    maxAge: COOKIE_AGE,
    path: "/",
  };
}
function setSession(res, admin) {
  const token = jwt.sign(
    { sub: admin.email, role: "superadmin" },
    res.app.locals.jwtSecret,
    { expiresIn: "8h" },
  );
  res.cookie(COOKIE, token, cookieOptions(res));
}
async function login(req, res) {
  const admin = await service.login(req.body || {});
  if (!admin)
    return res.status(401).json({ message: "Email or password is incorrect." });
  setSession(res, admin);
  return res.json({ admin });
}
function me(req, res) {
  return res.json({ admin: req.admin });
}
function logout(_req, res) {
  res.clearCookie(COOKIE, { ...cookieOptions(res), maxAge: undefined });
  return res.json({ message: "You have been signed out." });
}
async function dashboard(req, res) {
  return res.json(await service.dashboard({ days: req.query.days }));
}
async function sellers(req, res) {
  return res.json(await service.listSellers(req.query));
}
async function updateSeller(req, res) {
  return res.json({
    seller: await service.updateSeller(
      req.admin,
      req.params.id,
      req.body?.status,
    ),
  });
}
async function sellerVerification(req, res) {
  return res.json(
    await service.getSellerVerification(req.admin, req.params.id),
  );
}
async function reviewSellerVerification(req, res) {
  return res.json({
    seller: await service.reviewSellerVerification(
      req.admin,
      req.params.id,
      req.body?.status,
      req.body?.note,
    ),
  });
}
async function products(req, res) {
  return res.json(await service.listProducts(req.query));
}
async function moderateProduct(req, res) {
  return res.json({
    product: await service.moderateProduct(
      req.admin,
      req.params.id,
      req.body?.action,
    ),
  });
}
async function customers(req, res) {
  return res.json(await service.listCustomers(req.query));
}
async function orders(req, res) {
  return res.json(await service.listOrders(req.query));
}
async function returns(req, res) {
  return res.json(await service.listReturns());
}
async function updateReturn(req, res) {
  return res.json({
    returnRequest: await service.updateReturn(
      req.admin,
      req.params.id,
      req.body?.status,
    ),
  });
}
async function tickets(req, res) {
  return res.json(await service.listTickets());
}
async function updateTicket(req, res) {
  return res.json({
    ticket: await service.updateTicket(
      req.admin,
      req.params.id,
      req.body?.status,
    ),
  });
}
async function settings(req, res) {
  return res.json({ settings: await service.getSettings() });
}
async function publicContent(_req, res) {
  return res.json(await service.getPublicContent());
}
async function updateSettings(req, res) {
  return res.json({
    settings: await service.updateSettings(req.admin, req.body || {}),
  });
}
async function categories(_req, res) {
  return res.json(await service.listCategories());
}
async function createCategory(req, res) {
  return res.status(201).json({
    category: await service.createCategory(req.admin, req.body || {}),
  });
}
async function updateCategory(req, res) {
  return res.json({
    category: await service.updateCategory(
      req.admin,
      req.params.id,
      req.body || {},
    ),
  });
}
async function deleteCategory(req, res) {
  return res.json({
    category: await service.deleteCategory(req.admin, req.params.id),
  });
}
async function audit(req, res) {
  return res.json(await service.getAuditLog());
}
async function payments(req, res) {
  return res.json(await service.getPayments());
}
async function recordCodCollection(req, res) {
  return res.json({
    order: await service.recordCodCollection(
      req.admin,
      req.params.id,
      req.body || {},
    ),
  });
}

async function deliveryAgents(req, res) {
  return res.json(await service.listDeliveryAgents(req.query));
}

async function createHubStaff(req, res) {
  return res.status(201).json({
    agent: await service.createHubStaff(req.admin, req.body || {}),
  });
}

async function updateDeliveryAgent(req, res) {
  return res.json({
    agent: await service.updateDeliveryAgent(
      req.admin,
      req.params.id,
      req.body?.isActive,
    ),
  });
}

async function deliveryAgentApplication(req, res) {
  return res.json({
    application: await service.getDeliveryAgentApplication(
      req.params.id,
      req.app.locals.jwtSecret,
    ),
  });
}

async function reviewDeliveryAgent(req, res) {
  return res.json({
    agent: await service.reviewDeliveryAgent(
      req.admin,
      req.params.id,
      req.body || {},
    ),
  });
}

async function deliveryShipments(req, res) {
  return res.json(await service.listDeliveryShipments());
}

async function assignDeliveryShipment(req, res) {
  return res.json({
    shipment: await service.assignDeliveryShipment(
      req.admin,
      req.params.orderId,
      req.body || {},
    ),
  });
}

module.exports = {
  login,
  me,
  logout,
  dashboard,
  sellers,
  updateSeller,
  sellerVerification,
  reviewSellerVerification,
  products,
  moderateProduct,
  customers,
  orders,
  returns,
  updateReturn,
  tickets,
  updateTicket,
  settings,
  publicContent,
  updateSettings,
  categories,
  createCategory,
  updateCategory,
  deleteCategory,
  audit,
  payments,
  recordCodCollection,
  deliveryAgents,
  createHubStaff,
  updateDeliveryAgent,
  deliveryAgentApplication,
  reviewDeliveryAgent,
  deliveryShipments,
  assignDeliveryShipment,
};
