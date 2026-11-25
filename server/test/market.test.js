const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  getCountry,
  getIdentityDocumentTypes,
} = require("../src/modules/market/countries");
const {
  resolveCountry,
  resolveCountryWithListings,
} = require("../src/modules/market/service");

test("market selection accepts an explicit ISO country code", () => {
  assert.equal(resolveCountry({}, "in").code, "IN");
});

test("market selection reads trusted proxy country headers", () => {
  assert.equal(resolveCountry({ "cf-ipcountry": "gb" }).code, "GB");
  assert.equal(resolveCountry({ "x-vercel-ip-country": "CA" }).code, "CA");
});

test("market selection falls back to the US for missing or invalid values", () => {
  assert.equal(resolveCountry({}).code, "US");
  assert.equal(resolveCountry({}, "not-a-country").code, "US");
});

test("unsaved market defaults to a country with active approved seller listings", () => {
  const markets = [
    { _id: "IN", productCount: 42 },
    { _id: "US", productCount: 0 },
  ];
  assert.equal(resolveCountryWithListings({}, "", markets).code, "IN");
  assert.equal(resolveCountryWithListings({}, "US", markets).code, "US");
  assert.equal(resolveCountryWithListings({}, "", []).code, "US");
});

test("country metadata includes local currency and country-specific seller document choices", () => {
  assert.equal(getCountry("IN").currency, "INR");
  assert.ok(getIdentityDocumentTypes("IN").includes("Aadhaar card"));
  assert.ok(getIdentityDocumentTypes("US").includes("US passport"));
});
