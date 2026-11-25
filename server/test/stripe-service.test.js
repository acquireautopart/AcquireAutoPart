const test = require("node:test");
const assert = require("node:assert/strict");
const stripeService = require("../src/modules/payments/stripe/service");
const {
  calculateNetPayout,
  calculatePlatformFee,
} = require("../src/modules/seller/finance");

test("Stripe amounts use the currency's minor unit exponent", () => {
  assert.equal(stripeService.toMinorUnits(12.34, "usd"), 1234);
  assert.equal(stripeService.toMinorUnits(1234, "jpy"), 1234);
});

test("seller transfers deduct coupon discounts before the platform fee", () => {
  assert.equal(calculateNetPayout(100, 10, 15), 76.5);
  assert.equal(calculateNetPayout(5, 10, 15), 0);
});

test("global platform fee is percentage-based and rounded to cents", () => {
  assert.equal(calculatePlatformFee(100, 10), 10);
  assert.equal(calculatePlatformFee(99.99, 12.5), 12.5);
  assert.equal(calculatePlatformFee(100, 0), 0);
  assert.equal(calculateNetPayout(100, 0, 10), 90);
});
