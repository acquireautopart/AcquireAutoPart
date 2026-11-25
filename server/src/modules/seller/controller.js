const jwt = require("jsonwebtoken");
const service = require("./service");
const productImport = require("./productImport");
const HttpError = require("../../utils/HttpError");
const imageStorage = require("./imageStorage");
const sellerNotifications = require("./notifications");
const { resolveCountry } = require("../market/service");

const COOKIE = "seller_session";
const COOKIE_AGE = 7 * 24 * 60 * 60 * 1000;
function cookieOptions(res) {
  return {
    httpOnly: true,
    secure: res.app.locals.isProduction,
    sameSite: res.app.locals.isProduction ? "none" : "lax",
    maxAge: COOKIE_AGE,
    path: "/",
  };
}
function publicSeller(seller) {
  return {
    id: seller._id.toString(),
    name: seller.name,
    email: seller.email,
    phone: seller.phone || "",
    storeName: seller.storeName,
    address: seller.address || "",
    taxId: seller.taxId || "",
    sellCategories: seller.sellCategories || [],
    country: seller.country || "",
    verified: seller.verified,
    verificationStatus: seller.identityVerification?.status || "Not submitted",
    signatureStatus: seller.identityVerification?.signatureStatus || "Not submitted",
    settings: seller.settings,
  };
}
function setSession(res, seller) {
  const token = jwt.sign(
    {
      sub: seller._id.toString(),
      role: "seller",
      authVersion: seller.authVersion || 0,
    },
    res.app.locals.jwtSecret,
    { expiresIn: "7d" },
  );
  res.cookie(COOKIE, token, cookieOptions(res));
}
async function register(req, res) {
  const seller = await service.register(req.body || {});
  setSession(res, seller);
  return res.status(201).json({ seller: publicSeller(seller) });
}
async function login(req, res) {
  const seller = await service.login(req.body || {});
  if (!seller)
    return res.status(401).json({ message: "Email or password is incorrect." });
  setSession(res, seller);
  return res.json({ seller: publicSeller(seller) });
}
async function forgotPassword(req, res) {
  const frontendUrl =
    req.app.locals.frontendOrigins?.[0] || "http://localhost:3000";
  await service.requestPasswordReset({
    email: req.body?.email,
    resend: req.app.locals.resend,
    frontendUrl,
  });
  return res.json({
    message:
      "If a seller account exists for that email, a password reset link has been sent.",
  });
}
async function resetPassword(req, res) {
  await service.resetPassword(req.body || {});
  res.clearCookie(COOKIE, {
    httpOnly: true,
    secure: res.app.locals.isProduction,
    sameSite: res.app.locals.isProduction ? "none" : "lax",
    path: "/",
  });
  return res.json({ message: "Your password has been reset. Please sign in." });
}
function me(req, res) {
  return res.json({ seller: req.seller });
}
function logout(_req, res) {
  res.clearCookie(COOKIE, { ...cookieOptions(res), maxAge: undefined });
  return res.json({ message: "You have been signed out." });
}
async function dashboard(req, res) {
  const offset = Number(req.query.timezoneOffset);
  return res.json(
    await service.getDashboard(
      req.seller,
      Number.isFinite(offset) && Math.abs(offset) <= 840 ? offset : 0,
    ),
  );
}
async function products(req, res) {
  return res.json(await service.listProducts(req.seller._id, req.query));
}
async function categories(_req, res) {
  const categoryService = require("../admin/categoryService");
  return res.json({
    categories: await categoryService.listCategories({ activeOnly: true }),
  });
}
function getProductImportFile(req) {
  let fileName = req.get("x-file-name") || "";
  try {
    fileName = decodeURIComponent(fileName);
  } catch {
    throw new HttpError(400, "The uploaded file name is invalid.");
  }
  return { body: req.body, fileName };
}
async function previewProductImport(req, res) {
  const result = await productImport.validateProductImport(
    req.seller._id,
    getProductImportFile(req),
  );
  return res.json({
    valid: result.issues.length === 0,
    totalRows: result.products.length,
    validRows: result.issues.length ? 0 : result.products.length,
    issues: result.issues,
    preview: result.issues.length ? [] : result.products.slice(0, 10),
  });
}
async function importProducts(req, res) {
  try {
    const result = await productImport.importProducts(
      req.seller._id,
      getProductImportFile(req),
    );
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof productImport.ProductImportValidationError) {
      return res.status(422).json({
        message: error.message,
        issues: error.issues,
      });
    }
    throw error;
  }
}
async function notifications(req, res) {
  return res.json(await sellerNotifications.listNotifications(req.seller._id));
}
async function readNotification(req, res) {
  return res.json(
    await sellerNotifications.markNotificationRead(
      req.seller._id,
      req.params.id,
    ),
  );
}
async function createProduct(req, res) {
  return res.status(201).json({
    product: await service.createProduct(req.seller._id, req.body || {}),
  });
}
async function uploadProductImage(req, res) {
  const image = await imageStorage.storeProductImage(
    { body: req.body, contentType: req.get("content-type") },
    req.app.locals.cloudinary,
  );
  return res.status(201).json({ image });
}
async function updateProduct(req, res) {
  return res.json({
    product: await service.updateProduct(
      req.seller._id,
      req.params.id,
      req.body || {},
    ),
  });
}
async function deleteProduct(req, res) {
  return res.json(await service.deleteProduct(req.seller._id, req.params.id));
}
async function adjustStock(req, res) {
  return res.json({
    product: await service.adjustStock(
      req.seller._id,
      req.params.id,
      req.body || {},
    ),
  });
}
async function orders(req, res) {
  return res.json(await service.listOrders(req.seller._id, req.query));
}
async function scanOrder(req, res) {
  return res.json({
    order: await service.scanOrder(
      req.seller._id,
      req.body?.scanToken,
      req.body?.location,
    ),
  });
}
async function updateOrder(req, res) {
  return res.json({
    order: await service.updateOrder(
      req.seller._id,
      req.params.id,
      req.body?.fulfillment,
      req.body?.tracking,
      "seller_manual",
      req.body?.carrier,
      req.body?.trackingUrl,
      req.body?.location,
    ),
  });
}
async function returns(req, res) {
  return res.json(await service.listReturns(req.seller._id));
}
async function updateReturn(req, res) {
  return res.json({
    returnRequest: await service.updateReturn(
      req.seller._id,
      req.params.id,
      req.body?.status,
    ),
  });
}
async function discounts(req, res) {
  return res.json(await service.listDiscounts(req.seller._id));
}
async function createDiscount(req, res) {
  return res.status(201).json({
    discount: await service.createDiscount(req.seller._id, req.body || {}),
  });
}
async function updateDiscount(req, res) {
  return res.json({
    discount: await service.updateDiscount(
      req.seller._id,
      req.params.id,
      req.body || {},
    ),
  });
}
async function deleteDiscount(req, res) {
  return res.json(await service.deleteDiscount(req.seller._id, req.params.id));
}
async function settings(req, res) {
  return res.json({
    seller: await service.updateSettings(req.seller._id, req.body || {}),
  });
}
async function payouts(req, res) {
  return res.json({
    currency: req.seller.settings?.currency || "USD",
    ...(await service.getPayoutSummary(req.seller._id)),
  });
}
async function stripeConnectStatus(req, res) {
  return res.json(await service.getStripeConnectStatus(req.seller._id));
}
async function createStripeConnectLink(req, res) {
  return res.json(
    await service.createStripeConnectLink(req.seller._id, req.get("origin")),
  );
}
async function submitIdentityDocument(req, res) {
  const verification = await service.submitIdentityDocument(
    req.seller._id,
    {
      documentType: req.get("x-identity-document-type"),
      documentNumber: req.get("x-identity-document-number"),
      country: req.get("x-identity-country"),
    },
    { body: req.body, contentType: req.get("content-type") },
  );
  return res.json({ verification });
}
async function submitSignatureDocument(req, res) {
  const verification = await service.submitSignatureDocument(req.seller._id, {
    body: req.body,
    contentType: req.get("content-type"),
  });
  return res.json({ verification });
}
async function publicCatalog(req, res) {
  const country = resolveCountry(req.headers, req.query.country);
  return res.json(
    await service.publicCatalog({
      ...req.query,
      country: country.code,
    }),
  );
}
async function publicProduct(req, res) {
  const country = resolveCountry(req.headers, req.query.country);
  const product = await service.publicProduct(req.params.id, country.code);
  return product
    ? res.json({ product })
    : res.status(404).json({ message: "Product not found." });
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  me,
  logout,
  dashboard,
  products,
  categories,
  previewProductImport,
  importProducts,
  notifications,
  readNotification,
  createProduct,
  uploadProductImage,
  updateProduct,
  deleteProduct,
  adjustStock,
  orders,
  scanOrder,
  updateOrder,
  returns,
  updateReturn,
  discounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  settings,
  payouts,
  stripeConnectStatus,
  createStripeConnectLink,
  submitIdentityDocument,
  submitSignatureDocument,
  publicCatalog,
  publicProduct,
};
