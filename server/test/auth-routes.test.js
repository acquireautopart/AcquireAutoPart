const assert = require("node:assert/strict");
const { after, before, mock, test } = require("node:test");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");
const AdminSetting = require("../src/modules/admin/models/AdminSetting");
const Customer = require("../src/modules/customer/models/Customer");

const jwtSecret = "test-only-signing-secret-with-at-least-32-bytes";
const app = createApp({
  jwtSecret,
  isProduction: false,
  trustProxyHops: 0,
  frontendOrigins: [],
});

let server;
let apiUrl;
let baseUrl;

before(async () => {
  mock.method(AdminSetting, "findOne", () => ({
    select() {
      return this;
    },
    lean() {
      return Promise.resolve(null);
    },
  }));
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  apiUrl = `http://127.0.0.1:${server.address().port}/api`;
  baseUrl = `${apiUrl}/auth`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  mock.restoreAll();
});

test("health route is available through the configured application", async () => {
  const response = await fetch(`${apiUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    db: "disconnected",
  });
});

test("register rejects invalid input without accessing the database", async () => {
  const response = await fetch(`${baseUrl}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "A",
      email: "not-an-email",
      password: "short",
    }),
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Name/);
});

test("login rejects malformed credentials without accessing the database", async () => {
  const response = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "bad", password: "" }),
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /valid email/);
});

test("customer session route requires a signed-in customer", async () => {
  const response = await fetch(`${baseUrl}/me`);

  assert.equal(response.status, 401);
  assert.match((await response.json()).message, /sign in/);
});

test("customer session route returns the saved profile photo", async () => {
  const id = "507f1f77bcf86cd799439011";
  const profilePhoto = "data:image/jpeg;base64,/9j/2Q==";
  mock.method(Customer, "findById", (customerId) => {
    assert.equal(customerId, id);
    return {
      select(fields) {
        assert.match(fields, /\bprofilePhoto\b/);
        return this;
      },
      lean() {
        return Promise.resolve({
          _id: { toString: () => id },
          name: "Customer",
          email: "customer@example.com",
          profilePhoto,
          role: "customer",
        });
      },
    };
  });

  const response = await fetch(`${baseUrl}/me`, {
    headers: {
      Cookie: `customer_session=${jwt.sign({ sub: id }, jwtSecret)}`,
    },
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).customer.profilePhoto, profilePhoto);
});

test("delivery partner applications are accepted without a delivery session", async () => {
  const response = await fetch(`${apiUrl}/delivery/auth/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "invalid" }),
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /full name/i);
});

test("delivery application uploads require the temporary application token", async () => {
  const response = await fetch(`${apiUrl}/delivery/auth/applications/files`, {
    method: "PUT",
    headers: {
      "Content-Type": "image/jpeg",
      "X-Application-File-Kind": "photo",
    },
    body: Buffer.from([0xff, 0xd8, 0xff]),
  });

  assert.equal(response.status, 401);
  assert.match((await response.json()).message, /invalid or expired/i);
});

test("delivery tasks require a delivery-agent session", async () => {
  const response = await fetch(`${apiUrl}/delivery/tasks`);
  const availabilityResponse = await fetch(
    `${apiUrl}/delivery/auth/availability`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOnline: true }),
    },
  );

  assert.equal(response.status, 401);
  assert.match((await response.json()).message, /delivery account/);
  assert.equal(availabilityResponse.status, 401);
});

test("delivery-agent provisioning requires an admin session", async () => {
  const response = await fetch(`${apiUrl}/admin/delivery/agents`);

  assert.equal(response.status, 401);
  assert.match((await response.json()).message, /admin console/);
});

test("logout clears the customer session cookie", async () => {
  const response = await fetch(`${baseUrl}/logout`, { method: "POST" });

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("set-cookie"),
    /customer_session=;.*Expires=Thu, 01 Jan 1970/,
  );
});
