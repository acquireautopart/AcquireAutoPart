const { mock, test } = require("node:test");
const assert = require("node:assert/strict");
const { serializeOrder } = require("../src/modules/customer/shop/helpers");
const {
  nextScannedFulfillment,
  updateOrder,
} = require("../src/modules/seller/service");
const { encryptValue } = require("../src/utils/encryption");
const Product = require("../src/modules/seller/models/Product");
const Order = require("../src/modules/customer/models/Order");

test("package scans advance through packed, shipped, and delivered once each", () => {
  assert.equal(nextScannedFulfillment("New"), "Packed");
  assert.equal(nextScannedFulfillment("Packed"), "Shipped");
  assert.equal(nextScannedFulfillment("Shipped"), null);
  assert.equal(nextScannedFulfillment("Delivered"), null);
  assert.equal(nextScannedFulfillment("Cancelled"), null);
});

test("seller actions cannot confirm delivery without a verified delivery agent", async () => {
  await assert.rejects(
    () => updateOrder("seller-id", "order-id", "Delivered"),
    { statusCode: 403 },
  );
});

test("seller must provide a valid packed parcel weight before packing", async () => {
  const sellerId = "64f000000000000000000012";
  mock.method(Product, "find", () => ({
    select() {
      return this;
    },
    lean: async () => [],
  }));
  mock.method(Order, "findOne", async () => ({
    status: "Processing",
    sellerFulfillment: "New",
    sellerFulfillments: [{ seller: sellerId, status: "New" }],
    payment: { method: "Cash on delivery", paid: false },
    items: [],
  }));

  try {
    for (const weight of [undefined, 0, 100000.5, 100001]) {
      await assert.rejects(
        () =>
          updateOrder(
            sellerId,
            "64f000000000000000000013",
            "Packed",
            undefined,
            "seller_manual",
            undefined,
            undefined,
            { latitude: 19.076, longitude: 72.8777 },
            weight,
          ),
        { statusCode: 400, message: /weight in grams/i },
      );
    }
  } finally {
    mock.restoreAll();
  }
});

test("seller order updates require real GPS coordinates", async () => {
  for (const location of [
    undefined,
    { latitude: null, longitude: null },
    { latitude: "19.076", longitude: "72.8777" },
  ]) {
    await assert.rejects(
      () =>
        updateOrder(
          "seller-id",
          "order-id",
          "Packed",
          undefined,
          "seller_manual",
          undefined,
          undefined,
          location,
        ),
      { statusCode: 400, message: /location/i },
    );
  }
});

test("seller manual and QR actions cannot bypass a pending hub pickup scan", async () => {
  const sellerId = "64f000000000000000000010";
  const orderId = "64f000000000000000000011";
  const sellerState = {
    seller: sellerId,
    status: "Packed",
    hubPickupStatus: "Pending",
  };
  mock.method(Product, "find", () => ({
    select: () => ({ lean: async () => [] }),
  }));
  mock.method(Order, "findOne", async () => ({
    _id: orderId,
    status: "Processing",
    payment: { method: "Cash on delivery", paid: false },
    sellerFulfillments: [sellerState],
    items: [],
  }));

  try {
    for (const source of ["seller_manual", "seller_scan"]) {
      await assert.rejects(
        () =>
          updateOrder(
            sellerId,
            orderId,
            "Shipped",
            undefined,
            source,
            undefined,
            undefined,
            { latitude: 19.076, longitude: 72.8777 },
          ),
        { statusCode: 409, message: /hub must scan/i },
      );
    }
  } finally {
    mock.restoreAll();
  }
});

test("customer order serialization exposes shipment history but not scan tokens", () => {
  const order = serializeOrder({
    _id: "64f000000000000000000001",
    code: "ORD-2026-1234",
    status: "Shipped",
    placedAt: new Date("2026-11-10T00:00:00.000Z"),
    items: [],
    address: {},
    payment: {},
    totals: {},
    sellerFulfillments: [
      {
        status: "Shipped",
        scanToken: "private-token",
        carrier: "FedEx",
        tracking: "12345",
        trackingUrl: "https://example.com/track/12345",
        events: [
          {
            status: "Packed",
            source: "seller_scan",
            occurredAt: new Date("2026-11-10T01:00:00.000Z"),
            location: {
              latitude: 19.076,
              longitude: 72.8777,
              label: "Mumbai",
            },
          },
        ],
      },
    ],
  });

  assert.equal(order.shipments[0].status, "Shipped");
  assert.equal(order.shipments[0].tracking, "12345");
  assert.equal(order.shipments[0].events[0].status, "Packed");
  assert.equal(order.shipments[0].events[0].location.label, "Mumbai");
  assert.equal("scanToken" in order.shipments[0], false);
});

test("customer order details expose only a live delivery OTP", () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-only-signing-secret-with-at-least-32-bytes";
  try {
    const encryptedOtp = encryptValue("123456");
    const active = serializeOrder({
      _id: "64f000000000000000000001",
      code: "ORD-OTP",
      items: [],
      address: {},
      payment: {},
      totals: {},
      sellerFulfillments: [{
        status: "Shipped",
        trackingStatus: "Out for Delivery",
        deliveryOtpEncrypted: encryptedOtp,
        deliveryOtpExpiresAt: new Date(Date.now() + 60_000),
        events: [],
      }],
    });
    const expired = serializeOrder({
      _id: "64f000000000000000000002",
      code: "ORD-OLD-OTP",
      items: [],
      address: {},
      payment: {},
      totals: {},
      sellerFulfillments: [{
        status: "Shipped",
        trackingStatus: "Out for Delivery",
        deliveryOtpEncrypted: encryptedOtp,
        deliveryOtpExpiresAt: new Date(Date.now() - 60_000),
        events: [],
      }],
    });

    assert.equal(active.shipments[0].deliveryOtp, "123456");
    assert.equal(expired.shipments[0].deliveryOtp, "");
    assert.equal("deliveryOtpEncrypted" in active.shipments[0], false);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
