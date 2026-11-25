const assert = require("node:assert/strict");
const { mock, test } = require("node:test");
const AuditLog = require("../src/modules/admin/models/AuditLog");
const AdminSetting = require("../src/modules/admin/models/AdminSetting");
const adminService = require("../src/modules/admin/service");

const admin = { email: "admin@example.com" };

function rule(overrides = {}) {
  return {
    country: "IN",
    city: "Mumbai",
    minWeightGrams: 1,
    maxWeightGrams: 500,
    deliveryAgentRate: 20,
    hubGrossRate: 30,
    ...overrides,
  };
}

test("admin payout rules store the country's currency and reject invalid hub margins", async () => {
  let savedSettings;
  mock.method(AdminSetting, "findOneAndUpdate", (_filter, update) => {
    savedSettings = update.$set;
    return { lean: async () => savedSettings };
  });
  mock.method(AuditLog, "create", async () => ({}));

  try {
    const saved = await adminService.updateSettings(admin, {
      deliveryPayoutRates: [rule()],
    });
    assert.equal(saved.deliveryPayoutRates[0].currency, "INR");
    assert.equal(saved.deliveryPayoutRates[0].deliveryAgentRate, 20);
    await assert.rejects(
      () =>
        adminService.updateSettings(admin, {
          deliveryPayoutRates: [rule({ hubGrossRate: 19 })],
        }),
      { statusCode: 400, message: /gross payout/i },
    );
  } finally {
    mock.restoreAll();
  }
});

test("admin payout rules reject overlapping weight bands for the same city", async () => {
  const first = rule();
  const second = rule({
    city: "mumbai",
    minWeightGrams: 500,
    maxWeightGrams: 1000,
  });
  await assert.rejects(
    () =>
      adminService.updateSettings(admin, {
        deliveryPayoutRates: [first, second],
      }),
    { statusCode: 400, message: /overlap/i },
  );
});
