const { mock, test } = require("node:test");
const assert = require("node:assert/strict");
const adminService = require("../src/modules/admin/service");
const AuditLog = require("../src/modules/admin/models/AuditLog");
const DeliveryAgent = require("../src/modules/delivery/models/DeliveryAgent");
const Hub = require("../src/modules/tracking/models/Hub");
const Seller = require("../src/modules/seller/models/Seller");
const verificationStorage = require("../src/modules/seller/verificationStorage");
const { encryptValue } = require("../src/utils/encryption");

const admin = { email: "admin@example.com" };
const secret = "test-only-private-profile-secret";

test("admin seller detail view returns profile and document links without credentials", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  const sellerId = "64f000000000000000000030";
  const seller = {
    _id: { toString: () => sellerId },
    passwordHash: "must-not-be-returned",
    authVersion: 7,
    role: "seller",
    name: "Rohan Kumar",
    email: "rohan@example.com",
    phone: "+91 9876543210",
    storeName: "Delhi Auto Parts",
    address: "12 Main Road, Delhi",
    pickupPostalCode: "110001",
    taxId: "TAX-123",
    sellCategories: ["Brakes"],
    country: "IN",
    verified: true,
    adminStatus: "Approved",
    stripeAccountId: "acct_test",
    settings: { currency: "INR", shippingDays: 3 },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-02-01T00:00:00.000Z"),
    identityVerification: {
      status: "Approved",
      documentType: "Government ID",
      documentNumberEncrypted: encryptValue("ID-123456", secret),
      documentKey: "seller/id.pdf",
      signatureKey: "seller/signature.pdf",
      signatureStatus: "Approved",
    },
  };
  mock.method(Seller, "findById", () => ({
    select: () => ({ lean: async () => seller }),
  }));
  mock.method(verificationStorage, "createReviewUrl", async (key) => `signed:${key}`);
  mock.method(AuditLog, "create", async () => ({}));

  try {
    const result = await adminService.getSellerDetails(admin, sellerId);
    assert.equal(result.seller.phone, seller.phone);
    assert.equal(result.seller.address, seller.address);
    assert.equal(result.seller.identityVerification.documentNumber, "ID-123456");
    assert.equal(result.seller.identityVerification.documentUrl, "signed:seller/id.pdf");
    assert.equal(
      result.seller.identityVerification.signatureUrl,
      "signed:seller/signature.pdf",
    );
    assert.equal("passwordHash" in result.seller, false);
    assert.equal("password" in result.seller, false);
    assert.equal("authVersion" in result.seller, false);
  } finally {
    mock.restoreAll();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("admin hub detail view returns linked staff identity records without credentials", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  const hubId = "64f000000000000000000031";
  const agentId = "64f000000000000000000032";
  const hub = {
    _id: { toString: () => hubId },
    code: "HUB-DEL-01",
    name: "Delhi Pickup Hub",
    city: "Delhi",
    district: "New Delhi",
    state: "Delhi",
    country: "IN",
    address: "12 Main Road, Delhi",
    postalCode: "110001",
    pickupPincodes: ["110001"],
    inChargeName: "Rohan Kumar",
    inChargeEmail: "rohan@example.com",
    inChargePhone: "+91 9876543210",
    hubType: "PICKUP",
    applicationStatus: "Approved",
    isActive: true,
  };
  const staff = [{
    _id: { toString: () => agentId },
    passwordHash: "must-not-be-returned",
    authVersion: 3,
    name: "Rohan Kumar",
    email: "rohan@example.com",
    phone: "+91 9876543210",
    role: "hub_staff",
    isActive: true,
    applicationStatus: "Approved",
    address: "12 Main Road, Delhi",
    country: "IN",
    state: "Delhi",
    district: "New Delhi",
    postalCode: "110001",
    identityDocumentType: "Government ID",
    identityDocumentNumberEncrypted: encryptValue("HUB-ID-9876", secret),
    profilePhotoKey: "hub/photo.jpg",
    identityDocumentKey: "hub/id.pdf",
  }];
  mock.method(Hub, "findById", () => ({ lean: async () => hub }));
  mock.method(DeliveryAgent, "find", () => ({
    select: () => ({ lean: async () => staff }),
  }));
  mock.method(verificationStorage, "createReviewUrl", async (key) => `signed:${key}`);
  mock.method(AuditLog, "create", async () => ({}));

  try {
    const result = await adminService.getDeliveryHubDetails(admin, hubId);
    assert.equal(result.hub.inCharge.phone, hub.inChargePhone);
    assert.equal(result.staff[0].documentNumber, "HUB-ID-9876");
    assert.equal(result.staff[0].photoUrl, "signed:hub/photo.jpg");
    assert.equal(result.staff[0].documentUrl, "signed:hub/id.pdf");
    assert.equal("passwordHash" in result.staff[0], false);
    assert.equal("password" in result.staff[0], false);
    assert.equal("authVersion" in result.staff[0], false);
  } finally {
    mock.restoreAll();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
