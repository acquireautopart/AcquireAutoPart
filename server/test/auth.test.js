const { mock, test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { loadEnvironment } = require("../src/config/environment");
const Customer = require("../src/modules/customer/models/Customer");
const { registerCustomer } = require("../src/modules/customer/auth/service");
const {
  getCredentials,
  getLoginCredentials,
} = require("../src/modules/customer/auth/validators");

test("registration uses the unique email index instead of a preflight query", async () => {
  const email = "customer@example.com";
  let createdCustomer;
  mock.method(Customer, "exists", () => {
    throw new Error("Registration should not issue a preflight query.");
  });
  mock.method(bcrypt, "hash", async () => "hashed-password");
  mock.method(Customer, "create", async (customer) => {
    createdCustomer = customer;
    return customer;
  });

  try {
    const customer = await registerCustomer({
      name: "Customer",
      email,
      password: "safe-pass-123",
    });

    assert.equal(customer, createdCustomer);
    assert.deepEqual(createdCustomer, {
      name: "Customer",
      email,
      passwordHash: "hashed-password",
    });
    assert.equal(Customer.exists.mock.callCount(), 0);
    assert.equal(Customer.create.mock.callCount(), 1);
  } finally {
    mock.restoreAll();
  }
});

test("registration maps unique-index conflicts to HTTP 409", async () => {
  mock.method(bcrypt, "hash", async () => "hashed-password");
  mock.method(Customer, "create", async () => {
    const error = new Error("duplicate key");
    error.code = 11000;
    throw error;
  });

  try {
    await assert.rejects(
      registerCustomer({
        name: "Customer",
        email: "customer@example.com",
        password: "safe-pass-123",
      }),
      (error) => {
        assert.equal(error.statusCode, 409);
        assert.match(error.message, /already exists/);
        return true;
      },
    );
  } finally {
    mock.restoreAll();
  }
});

test("registration credentials are trimmed and email addresses normalized", () => {
  assert.deepEqual(
    getCredentials({
      name: "  Dheeraj Kumar ",
      email: "  CUSTOMER@EXAMPLE.COM ",
      password: "safe-pass-123",
    }),
    {
      name: "Dheeraj Kumar",
      email: "customer@example.com",
      password: "safe-pass-123",
    },
  );
});

test("registration rejects short passwords and bcrypt-overflow passwords", () => {
  assert.match(
    getCredentials({
      name: "Customer",
      email: "customer@example.com",
      password: "short",
    }).error,
    /at least 8 characters/,
  );

  assert.match(
    getCredentials({
      name: "Customer",
      email: "customer@example.com",
      password: "a".repeat(73),
    }).error,
    /72 bytes/,
  );
});

test("registration validates names and email addresses", () => {
  assert.match(
    getCredentials({
      name: "A",
      email: "customer@example.com",
      password: "safe-pass-123",
    }).error,
    /Name/,
  );
  assert.match(
    getCredentials({
      name: "Customer",
      email: "not-an-email",
      password: "safe-pass-123",
    }).error,
    /email/,
  );
});

test("login normalizes email and rejects malformed credentials", () => {
  assert.deepEqual(
    getLoginCredentials({
      email: " CUSTOMER@EXAMPLE.COM ",
      password: "safe-pass-123",
    }),
    { email: "customer@example.com", password: "safe-pass-123" },
  );
  assert.match(
    getLoginCredentials({ email: "invalid", password: "" }).error,
    /valid email/,
  );
});

test("customers cannot choose a privileged role during registration or login", () => {
  const registration = getCredentials({
    name: "Customer",
    email: "customer@example.com",
    password: "safe-pass-123",
    role: "admin",
  });
  const login = getLoginCredentials({
    email: "customer@example.com",
    password: "safe-pass-123",
    role: "seller",
  });

  assert.equal(registration.error, undefined);
  assert.equal("role" in registration, false);
  assert.equal("role" in login, false);
  assert.equal(Customer.schema.path("role").defaultValue, "customer");
  assert.deepEqual(Customer.schema.path("role").enumValues, ["customer"]);
  assert.equal(Customer.schema.path("role").options.immutable, true);
});

test("server configuration requires MongoDB and a strong JWT secret", () => {
  assert.throws(() => loadEnvironment({}), /MONGODB_URI is required/);
  assert.throws(
    () =>
      loadEnvironment({
        MONGODB_URI: "mongodb://localhost/test",
        JWT_SECRET: "too-short",
      }),
    /at least 32 bytes/,
  );
});

test("production configuration requires an explicit frontend origin", () => {
  assert.throws(
    () =>
      loadEnvironment({
        NODE_ENV: "production",
        MONGODB_URI: "mongodb://localhost/test",
        JWT_SECRET: "a".repeat(32),
      }),
    /FRONTEND_URL is required/,
  );
});

test("proxy trust must be configured with a non-negative integer", () => {
  assert.throws(
    () =>
      loadEnvironment({
        MONGODB_URI: "mongodb://localhost/test",
        JWT_SECRET: "a".repeat(32),
        TRUST_PROXY_HOPS: "all",
      }),
    /TRUST_PROXY_HOPS must be a non-negative integer/,
  );
});

test("customer passwords are excluded from normal database queries", () => {
  assert.equal(Customer.schema.path("passwordHash").options.select, false);
  assert.equal(Customer.schema.path("email").options.unique, true);
  assert.equal(Customer.schema.options.timestamps, true);
});
