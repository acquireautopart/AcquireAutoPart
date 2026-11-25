const { mock, test } = require("node:test");
const assert = require("node:assert/strict");
const hubService = require("../src/modules/delivery/hubService");
const Hub = require("../src/modules/tracking/models/Hub");
const Order = require("../src/modules/customer/models/Order");

const validApplication = {
  code: "hub-del-01",
  name: "Delhi Pickup Hub",
  city: "Delhi",
  district: "New Delhi",
  state: "Delhi",
  country: "in",
  address: "12 Main Road, Sector 5",
  postalCode: "110001",
  pickupPincodes: ["110001", "110002"],
  inChargeName: "Rohan Kumar",
  inChargeEmail: "ROHAN@example.com",
  inChargePhone: "+91 9876543210",
  password: "a-secure-password",
};

test("hub applications normalize identity and pickup PINs", () => {
  const input = hubService.getHubApplicationInput(validApplication);

  assert.equal(input.code, "HUB-DEL-01");
  assert.equal(input.country, "IN");
  assert.equal(input.inChargeEmail, "rohan@example.com");
  assert.deepEqual(input.pickupPincodes, ["110001", "110002"]);
  assert.throws(
    () =>
      hubService.getHubApplicationInput({
        ...validApplication,
        pickupPincodes: [],
      }),
    { statusCode: 400 },
  );
});

test("pickup routing requires an active approved hub serving the exact seller PIN", async () => {
  let query;
  mock.method(Hub, "findOne", (filter) => {
    query = filter;
    return {
      sort: () => ({
        lean: async () => ({ _id: "64f000000000000000000020" }),
      }),
    };
  });

  try {
    await hubService.findPickupHub("IN", "110001");
    assert.deepEqual(query, {
      country: "IN",
      applicationStatus: "Approved",
      isActive: true,
      hubType: "PICKUP",
      pickupPincodes: "110001",
    });
    await assert.rejects(
      () => hubService.findPickupHub("IN", ""),
      { statusCode: 409, message: /postal code/i },
    );
  } finally {
    mock.restoreAll();
  }
});

test("seller fulfillment records a hub assignment and pickup state", () => {
  const fulfillmentSchema = Order.schema.path("sellerFulfillments").schema;
  assert.equal(fulfillmentSchema.path("assignedHub").options.ref, "Hub");
  assert.deepEqual(
    fulfillmentSchema.path("hubPickupStatus").enumValues,
    ["", "Pending", "Picked Up", "Cancelled"],
  );
});
