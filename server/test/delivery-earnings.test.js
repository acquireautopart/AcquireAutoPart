const assert = require("node:assert/strict");
const { mock, test } = require("node:test");
const AdminSetting = require("../src/modules/admin/models/AdminSetting");
const Order = require("../src/modules/customer/models/Order");
const deliveryService = require("../src/modules/delivery/service");

const deliveredAt = new Date("2026-03-16T08:30:00.000Z");
const payoutRate = {
  country: "IN",
  city: "Mumbai",
  currency: "INR",
  minWeightGrams: 1,
  maxWeightGrams: 500,
  deliveryAgentRate: 20,
  hubGrossRate: 30,
};

test("delivery payout rules match country, city, and inclusive package-weight bands", () => {
  const rates = [payoutRate];
  assert.equal(
    deliveryService.findPayoutRate(
      rates,
      { country: "India", city: " mUmBaI " },
      500,
    ),
    payoutRate,
  );
  assert.equal(
    deliveryService.findPayoutRate(
      rates,
      { country: "IN", city: "Pune" },
      250,
    ),
    null,
  );
  assert.equal(
    deliveryService.findPayoutRate(
      rates,
      { country: "US", city: "Mumbai" },
      250,
    ),
    null,
  );
  assert.equal(
    deliveryService.findPayoutRate(
      rates,
      { country: "IN", city: "Mumbai" },
      501,
    ),
    null,
  );
});

test("earnings use verified delivery snapshots and isolate agent and hub totals", async () => {
  const agentId = "agent-1";
  const hubId = "hub-1";
  const otherAgentId = "agent-2";
  const state = {
    status: "Delivered",
    assignedDeliveryAgent: agentId,
    assignedHub: hubId,
    packageWeightGrams: 400,
    payoutRateConfigured: true,
    deliveryEarningAmount: 18,
    deliveryEarningCurrency: "INR",
    hubGrossEarningAmount: 30,
    hubEarningAmount: 12,
    hubEarningCurrency: "INR",
    events: [
      { status: "Delivered", source: "delivery_agent", occurredAt: deliveredAt },
      { status: "Delivered", source: "delivery_agent", occurredAt: deliveredAt },
    ],
  };
  const unrelatedState = {
    ...state,
    assignedDeliveryAgent: otherAgentId,
    assignedHub: "hub-2",
    deliveryEarningAmount: 99,
  };
  const document = { address: { country: "India", city: "Mumbai" }, sellerFulfillments: [state, unrelatedState] };
  const filters = [];
  mock.method(Order, "find", (filter) => {
    filters.push(filter);
    return {
      select() {
        return this;
      },
      lean: async () => [document],
    };
  });
  mock.method(AdminSetting, "findOne", () => ({
    select() {
      return this;
    },
    lean: async () => ({ deliveryPayoutRates: [payoutRate] }),
  }));
  const query = {
    from: "2026-03-16T00:00:00.000Z",
    to: "2026-03-17T00:00:00.000Z",
    timeZone: "Asia/Kolkata",
  };

  try {
    const agentReport = await deliveryService.getEarnings(
      { _id: agentId, role: "delivery_agent" },
      query,
    );
    assert.deepEqual(filters[0].sellerFulfillments.$elemMatch.assignedDeliveryAgent, agentId);
    assert.equal(agentReport.summary.completedDeliveries, 1);
    assert.deepEqual(agentReport.summary.currencies, [
      { currency: "INR", amount: 18, grossAmount: 30, riderShareAmount: 18 },
    ]);

    const hubReport = await deliveryService.getEarnings(
      { _id: agentId, role: "hub_staff", hub: hubId },
      query,
    );
    assert.deepEqual(filters[1].sellerFulfillments.$elemMatch.assignedHub, hubId);
    assert.equal(hubReport.summary.completedDeliveries, 1);
    assert.deepEqual(hubReport.summary.currencies, [
      { currency: "INR", amount: 12, grossAmount: 30, riderShareAmount: 18 },
    ]);
    assert.equal(hubReport.days[0].date, "2026-03-16");

    state.payoutRateConfigured = false;
    const unconfiguredReport = await deliveryService.getEarnings(
      { _id: agentId, role: "delivery_agent" },
      query,
    );
    assert.equal(unconfiguredReport.summary.unconfiguredCount, 1);
    assert.equal(unconfiguredReport.summary.currencies[0].amount, 0);
  } finally {
    mock.restoreAll();
  }
});

test("earnings require valid date ranges and time zones", async () => {
  const agent = { _id: "agent-1", role: "delivery_agent" };
  await assert.rejects(
    () => deliveryService.getEarnings(agent, { from: "invalid", to: "invalid" }),
    { statusCode: 400, message: /date range/i },
  );
  await assert.rejects(
    () =>
      deliveryService.getEarnings(agent, {
        from: "2026-03-16T00:00:00.000Z",
        to: "2026-03-17T00:00:00.000Z",
        timeZone: "Not/A_Timezone",
      }),
    { statusCode: 400, message: /time zone/i },
  );
});
