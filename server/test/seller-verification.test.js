const assert = require("node:assert/strict");
const { mock, test } = require("node:test");
const Seller = require("../src/modules/seller/models/Seller");
const verificationStorage = require("../src/modules/seller/verificationStorage");
const sellerService = require("../src/modules/seller/service");

test("identity document submission succeeds when old-document cleanup is denied", async () => {
  const seller = {
    _id: "seller-id",
    country: "IN",
    settings: { currency: "INR" },
    identityVerification: {
      documentKey: "old-document",
      toObject: () => ({ documentKey: "old-document" }),
    },
    save: async () => {},
  };
  const originalSecret = process.env.JWT_SECRET;
  const originalError = console.error;
  process.env.JWT_SECRET = "test-only-signing-secret-with-at-least-32-bytes";
  console.error = () => {};
  mock.method(Seller, "findById", () => ({
    select: async () => seller,
  }));
  mock.method(verificationStorage, "storeDocument", async () => "new-document");
  mock.method(verificationStorage, "deleteDocument", async () => {
    throw Object.assign(new Error("Access denied"), { Code: "AccessDenied" });
  });

  try {
    const result = await sellerService.submitIdentityDocument(
      "seller-id",
      {
        country: "IN",
        documentType: "Passport",
        documentNumber: "A1234567",
      },
      { body: Buffer.from("test"), contentType: "application/pdf" },
    );

    assert.equal(result.status, "Pending");
    assert.equal(seller.identityVerification.documentKey, "new-document");
  } finally {
    mock.restoreAll();
    console.error = originalError;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});
