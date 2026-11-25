const assert = require("node:assert/strict");
const { test } = require("node:test");
const errorHandler = require("../src/middleware/errorHandler");

test("duplicate product SKUs return a helpful validation message", () => {
  let statusCode;
  let body;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };

  errorHandler(
    { code: 11000, keyPattern: { seller: 1, sku: 1 } },
    {},
    response,
    () => {},
  );

  assert.equal(statusCode, 409);
  assert.match(body.message, /SKU is already used/);
});
