const profileService = require("./service");
const Customer = require("../models/Customer");
const {
  parsePagination,
  serializeCustomer,
  serializePreferences,
  serializeWallet,
  serializeWalletTransaction,
  serializeLedgerEntry,
  serializeWishlistItem,
  serializeVehicle,
  serializeAddress,
  serializePayment,
  serializeKyc,
  serializeReturn,
  serializeTicket,
} = require("./helpers");
const {
  getProfileUpdate,
  getPreferencesUpdate,
  getPasswordChange,
  getWishlistItem,
  getWishlistQuery,
  getProductAlertInput,
  getVehicleInput,
  getAddressInput,
  getPaymentInput,
  getAmount,
  getKycSubmission,
  getReturnInput,
  getContactInput,
} = require("./validators");

function reject(res, result) {
  return res.status(400).json({ message: result.error });
}

/* --------------------------------------------------------------- overview -- */

async function getOverview(req, res) {
  const overview = await profileService.getOverview(req.customer);
  return res.json({
    customer: serializeCustomer(overview.customer),
    preferences: serializePreferences(overview.customer),
    wallet: serializeWallet(overview.wallet),
    kyc: serializeKyc(overview.kyc),
    counts: overview.counts,
  });
}

/* ----------------------------------------------------------------- wallet -- */

async function getWallet(req, res) {
  const { wallet, entries, totals } = await profileService.getWallet(
    req.customer._id,
  );
  return res.json({
    wallet: serializeWallet(wallet),
    totals,
    transactions: entries.map(serializeWalletTransaction),
  });
}

async function topUpWallet(req, res) {
  const parsed = getAmount(req.body, {
    min: 1,
    max: 50000,
    label: "Top-up amount",
  });
  if (parsed.error) {
    return reject(res, parsed);
  }

  const { wallet, entry } = await profileService.topUpWallet(
    req.customer._id,
    parsed.amount,
  );
  return res.status(201).json({
    wallet: serializeWallet(wallet),
    transaction: serializeWalletTransaction(entry),
  });
}

async function withdrawFromWallet(req, res) {
  const parsed = getAmount(req.body, {
    min: 1,
    max: 50000,
    label: "Withdrawal amount",
  });
  if (parsed.error) {
    return reject(res, parsed);
  }

  const { wallet, entry } = await profileService.withdrawFromWallet(
    req.customer._id,
    parsed.amount,
  );
  return res.status(201).json({
    wallet: serializeWallet(wallet),
    transaction: serializeWalletTransaction(entry),
  });
}

/* ------------------------------------------------------------------ ledger -- */

async function getLedger(req, res) {
  const { page, limit, skip } = parsePagination(req.query);
  const type = ["credit", "debit"].includes(req.query?.type)
    ? req.query.type
    : "all";

  const result = await profileService.getLedger(req.customer._id, {
    type,
    page,
    limit,
    skip,
  });

  return res.json({
    entries: result.entries.map(serializeLedgerEntry),
    totals: result.totals,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: Math.max(1, Math.ceil(result.total / result.limit)),
    },
  });
}

/* ---------------------------------------------------------------- wishlist -- */

async function getWishlist(req, res) {
  const { term, sort } = getWishlistQuery(req.query);
  const { items, savings } = await profileService.getWishlist(
    req.customer._id,
    { term, sort },
  );

  return res.json({
    items: items.map(serializeWishlistItem),
    savings,
    count: items.length,
  });
}

async function getWishlistIds(req, res) {
  const productIds = await profileService.getWishlistProductIds(
    req.customer._id,
  );
  return res.json({ productIds });
}

async function addWishlistItem(req, res) {
  const parsed = getWishlistItem(req.body);
  if (parsed.error) {
    return reject(res, parsed);
  }

  const item = await profileService.addWishlistItem(req.customer._id, parsed);
  return res.status(201).json({ item: serializeWishlistItem(item) });
}

async function removeWishlistItem(req, res) {
  await profileService.removeWishlistItem(req.customer._id, req.params.id);
  return res.json({ message: "Removed from your wishlist." });
}

async function clearWishlist(req, res) {
  const removed = await profileService.clearWishlist(req.customer._id);
  return res.json({ removed, message: "Your wishlist is now empty." });
}

async function getProductAlerts(req, res) {
  const alerts = await profileService.getProductAlerts(req.customer._id, req.query.productId);
  return res.json({ alerts });
}

async function createProductAlert(req, res) {
  const parsed = getProductAlertInput(req.body);
  if (parsed.error) return reject(res, parsed);
  const alert = await profileService.createProductAlert(req.customer._id, parsed);
  return res.status(201).json({ alert: { id: alert._id.toString(), active: alert.active, targetPrice: alert.targetPrice } });
}

async function removeProductAlert(req, res) {
  await profileService.removeProductAlert(req.customer._id, req.params.id);
  return res.json({ message: "Product alert removed." });
}

/* ---------------------------------------------------------------- vehicles -- */

async function getVehicles(req, res) {
  const vehicles = await profileService.getVehicles(req.customer._id);
  return res.json({ vehicles: vehicles.map(serializeVehicle) });
}

async function createVehicle(req, res) {
  const parsed = getVehicleInput(req.body);
  if (parsed.error) {
    return reject(res, parsed);
  }

  const vehicle = await profileService.createVehicle(req.customer._id, parsed);
  return res.status(201).json({ vehicle: serializeVehicle(vehicle) });
}

async function setPrimaryVehicle(req, res) {
  const vehicle = await profileService.setPrimaryVehicle(
    req.customer._id,
    req.params.id,
  );
  return res.json({ vehicle: serializeVehicle(vehicle) });
}

async function removeVehicle(req, res) {
  await profileService.removeVehicle(req.customer._id, req.params.id);
  return res.json({ message: "Vehicle removed from your garage." });
}

/* --------------------------------------------------------------- addresses -- */

async function getAddresses(req, res) {
  const addresses = await profileService.getAddresses(req.customer._id);
  return res.json({ addresses: addresses.map(serializeAddress) });
}

async function createAddress(req, res) {
  const parsed = getAddressInput(req.body);
  if (parsed.error) {
    return reject(res, parsed);
  }

  const address = await profileService.createAddress(req.customer._id, parsed);
  return res.status(201).json({ address: serializeAddress(address) });
}

async function updateAddress(req, res) {
  const parsed = getAddressInput(req.body);
  if (parsed.error) {
    return reject(res, parsed);
  }

  const address = await profileService.updateAddress(
    req.customer._id,
    req.params.id,
    parsed,
  );
  return res.json({ address: serializeAddress(address) });
}

async function setDefaultAddress(req, res) {
  const address = await profileService.setDefaultAddress(
    req.customer._id,
    req.params.id,
  );
  return res.json({ address: serializeAddress(address) });
}

async function removeAddress(req, res) {
  await profileService.removeAddress(req.customer._id, req.params.id);
  return res.json({ message: "Address removed." });
}

/* ---------------------------------------------------------------- payments -- */

async function getPayments(req, res) {
  const payments = await profileService.getPayments(req.customer._id);
  return res.json({ payments: payments.map(serializePayment) });
}

async function createPayment(req, res) {
  const parsed = getPaymentInput(req.body);
  if (parsed.error) {
    return reject(res, parsed);
  }

  /*
   * Only masked details reach the service. A one-way fingerprint of those
   * masked details is derived here so the same card cannot be saved twice.
   */
  const fingerprintSource = [
    parsed.brand,
    parsed.type,
    parsed.last4,
    (parsed.holder || "").toLowerCase(),
    parsed.expiresMonth || "",
    parsed.expiresYear || "",
  ].join("|");

  const payment = await profileService.createPayment(
    req.customer._id,
    { ...parsed, fingerprintSource },
    req.app.locals.jwtSecret,
  );
  return res.status(201).json({ payment: serializePayment(payment) });
}

async function setDefaultPayment(req, res) {
  const payment = await profileService.setDefaultPayment(
    req.customer._id,
    req.params.id,
  );
  return res.json({ payment: serializePayment(payment) });
}

async function removePayment(req, res) {
  await profileService.removePayment(req.customer._id, req.params.id);
  return res.json({ message: "Payment method removed." });
}

/* --------------------------------------------------------------------- kyc -- */

async function getKyc(req, res) {
  const kyc = await profileService.getKyc(req.customer);
  return res.json({ kyc: serializeKyc(kyc) });
}

async function submitKycStep(req, res) {
  /* Email and phone steps are verified straight from the account profile. */
  const requireDocument = !["email", "phone"].includes(req.params.key);
  const parsed = getKycSubmission(req.body, { requireDocument });
  if (parsed.error) {
    return reject(res, parsed);
  }

  const kyc = await profileService.submitKycStep(
    req.customer,
    req.params.key,
    parsed,
    req.app.locals.jwtSecret,
  );
  return res.json({ kyc: serializeKyc(kyc) });
}

/* ----------------------------------------------------------------- returns -- */

async function getReturns(req, res) {
  const status =
    typeof req.query?.status === "string" && req.query.status
      ? req.query.status
      : "all";

  const { entries, summary } = await profileService.getReturns(
    req.customer._id,
    { status },
  );
  return res.json({ returns: entries.map(serializeReturn), summary });
}

async function createReturn(req, res) {
  const parsed = getReturnInput(req.body);
  if (parsed.error) {
    return reject(res, parsed);
  }

  const entry = await profileService.createReturn(req.customer._id, parsed);
  return res.status(201).json({ return: serializeReturn(entry) });
}

async function cancelReturn(req, res) {
  const entry = await profileService.cancelReturn(
    req.customer._id,
    req.params.id,
  );
  return res.json({ return: serializeReturn(entry) });
}

/* ---------------------------------------------------------------- contact -- */

async function getTickets(req, res) {
  const tickets = await profileService.getTickets(req.customer._id);
  return res.json({ tickets: tickets.map(serializeTicket) });
}

async function createTicket(req, res) {
  const parsed = getContactInput(req.body);
  if (parsed.error) {
    return reject(res, parsed);
  }

  const ticket = await profileService.createTicket(req.customer._id, parsed);
  return res.status(201).json({ ticket: serializeTicket(ticket) });
}

/* --------------------------------------------------------------- settings -- */

async function updateProfile(req, res) {
  const parsed = getProfileUpdate(req.body);
  if (parsed.error) {
    return reject(res, parsed);
  }

  const customer = await profileService.updateProfile(req.customer._id, parsed);
  return res.json({
    customer: serializeCustomer(customer),
    preferences: serializePreferences(customer),
  });
}

async function updateProfilePhoto(req, res) {
  const mime = req.headers["content-type"];
  const data = req.body;
  const signatures = {
    "image/jpeg": data?.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
    "image/png": data?.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/webp": data?.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP",
  };
  if (!Buffer.isBuffer(data) || !signatures[mime]) {
    return res.status(400).json({ message: "Choose a valid JPEG, PNG, or WebP photo." });
  }
  const customer = await Customer.findByIdAndUpdate(
    req.customer._id,
    { $set: { profilePhoto: `data:${mime};base64,${data.toString("base64")}` } },
    { new: true, runValidators: true },
  );
  return res.json({ customer: serializeCustomer(customer) });
}

async function updatePreferences(req, res) {
  const parsed = getPreferencesUpdate(req.body);
  if (parsed.error) {
    return reject(res, parsed);
  }

  const customer = await profileService.updatePreferences(
    req.customer._id,
    parsed,
  );
  return res.json({ preferences: serializePreferences(customer) });
}

async function changePassword(req, res) {
  const parsed = getPasswordChange(req.body);
  if (parsed.error) {
    return reject(res, parsed);
  }

  await profileService.changePassword(req.customer._id, parsed);
  return res.json({ message: "Your password has been updated." });
}

module.exports = {
  getOverview,
  getWallet,
  topUpWallet,
  withdrawFromWallet,
  getLedger,
  getWishlist,
  getWishlistIds,
  addWishlistItem,
  removeWishlistItem,
  clearWishlist,
  getProductAlerts,
  createProductAlert,
  removeProductAlert,
  getVehicles,
  createVehicle,
  setPrimaryVehicle,
  removeVehicle,
  getAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  removeAddress,
  getPayments,
  createPayment,
  setDefaultPayment,
  removePayment,
  getKyc,
  submitKycStep,
  getReturns,
  createReturn,
  cancelReturn,
  getTickets,
  createTicket,
  updateProfile,
  updateProfilePhoto,
  updatePreferences,
  changePassword,
};
