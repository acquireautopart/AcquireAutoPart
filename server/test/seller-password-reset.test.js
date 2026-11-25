const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { after, before, mock, test } = require("node:test");
const bcrypt = require("bcryptjs");
const { Resend } = require("resend");
const { loadEnvironment } = require("../src/config/environment");
const { createApp } = require("../src/app");
const PasswordReset = require("../src/modules/seller/models/PasswordReset");
const Seller = require("../src/modules/seller/models/Seller");
const sellerService = require("../src/modules/seller/service");

const resendConfig = {
  apiKey: "re_test_key",
  from: "AcquireAuto <seller@example.com>",
};

test("Resend email settings are loaded without exposing credentials", () => {
  const required = {
    MONGODB_URI: "mongodb://localhost/acquireauto",
    JWT_SECRET: "a".repeat(32),
  };
  assert.deepEqual(
    loadEnvironment({
      ...required,
      RESEND_API_KEY: resendConfig.apiKey,
      RESEND_FROM: resendConfig.from,
    }).resend,
    resendConfig,
  );
  assert.equal(loadEnvironment(required).resend, null);
});

test("password reset tokens are unique and automatically expire", () => {
  assert.equal(PasswordReset.schema.path("seller").options.unique, true);
  assert.equal(PasswordReset.schema.path("tokenHash").options.unique, true);
  assert.ok(
    PasswordReset.schema.indexes().some(
      ([index, options]) => index.expiresAt === 1 && options.expireAfterSeconds === 0,
    ),
  );
});

test("password reset requests reject malformed emails before database access", async () => {
  await assert.rejects(
    sellerService.requestPasswordReset({
      email: "not-an-email",
      resend: resendConfig,
      frontendUrl: "http://localhost:3000",
    }),
    (error) => error.statusCode === 400,
  );
});

test("password reset rejects invalid tokens and weak passwords", async () => {
  await assert.rejects(
    sellerService.resetPassword({ token: "invalid", password: "long-enough-password" }),
    (error) => error.statusCode === 400,
  );
  await assert.rejects(
    sellerService.resetPassword({
      token: "a".repeat(64),
      password: "short",
    }),
    (error) => error.statusCode === 400,
  );
  await assert.rejects(
    sellerService.resetPassword({
      token: "a".repeat(64),
      password: "😀".repeat(19),
    }),
    (error) => error.statusCode === 400,
  );
});

test("password reset emails contain one-time tokens while only the token hash is stored", async () => {
  const seller = { _id: "seller-id", email: "seller@example.com" };
  let savedReset;
  let sentMessage;
  mock.method(Seller, "findOne", () => ({
    select: async () => seller,
  }));
  mock.method(PasswordReset, "findOne", () => ({
    lean: async () => null,
  }));
  mock.method(PasswordReset, "findOneAndUpdate", async (_filter, update) => {
    savedReset = update.$set;
  });
  mock.method(global, "fetch", async (url, options) => {
    sentMessage = { url: String(url), options, message: JSON.parse(options.body) };
    return new Response(JSON.stringify({ id: "email-id" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  try {
    await sellerService.requestPasswordReset({
      email: seller.email,
      resend: resendConfig,
      frontendUrl: "http://localhost:3000",
    });

    const resetUrl = new URL(sentMessage.message.text.match(/https?:\/\/\S+/)[0]);
    const token = resetUrl.searchParams.get("token");
    assert.equal(resetUrl.origin, "http://localhost:3000");
    assert.equal(resetUrl.pathname, "/seller/reset-password");
    assert.match(token, /^[a-f\d]{64}$/);
    assert.equal(savedReset.tokenHash, crypto.createHash("sha256").update(token).digest("hex"));
    assert.ok(!JSON.stringify(savedReset).includes(token));
    assert.equal(sentMessage.url, "https://api.resend.com/emails");
    assert.deepEqual(sentMessage.message.to, [seller.email]);
    assert.equal(sentMessage.message.from, resendConfig.from);
    assert.match(new Headers(sentMessage.options.headers).get("authorization"), /^Bearer /);
  } finally {
    mock.restoreAll();
  }
});

test("Resend sender and recipient restrictions return an actionable error", async () => {
  const seller = { _id: "seller-id", email: "seller@example.com" };
  mock.method(Seller, "findOne", () => ({
    select: async () => seller,
  }));
  mock.method(PasswordReset, "findOne", () => ({
    lean: async () => null,
  }));
  mock.method(PasswordReset, "findOneAndUpdate", async () => ({}));
  mock.method(PasswordReset, "deleteOne", async () => ({ deletedCount: 1 }));
  mock.method(global, "fetch", async () =>
    new Response(JSON.stringify({
      name: "validation_error",
      message: "The sender domain is not verified.",
      statusCode: 403,
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }),
  );
  const originalError = console.error;
  console.error = () => {};

  try {
    await assert.rejects(
      sellerService.requestPasswordReset({
        email: seller.email,
        resend: resendConfig,
        frontendUrl: "http://localhost:3000",
      }),
      (error) => {
        assert.equal(error.statusCode, 503);
        assert.match(error.message, /Verify a sending domain in Resend/);
        assert.match(error.message, /RESEND_FROM/);
        return true;
      },
    );
    assert.equal(PasswordReset.deleteOne.mock.callCount(), 1);
  } finally {
    console.error = originalError;
    mock.restoreAll();
  }
});

test("password reset consumes its token and increments the seller session version", async () => {
  const token = "b".repeat(64);
  const reset = { seller: "seller-id" };
  let update;
  mock.method(bcrypt, "hash", async () => "new-password-hash");
  mock.method(PasswordReset, "findOneAndDelete", async (filter) => {
    assert.equal(
      filter.tokenHash,
      crypto.createHash("sha256").update(token).digest("hex"),
    );
    return reset;
  });
  mock.method(Seller, "findByIdAndUpdate", async (sellerId, fields) => {
    assert.equal(sellerId, reset.seller);
    update = fields;
    return { _id: sellerId };
  });
  mock.method(PasswordReset, "deleteMany", async () => ({ deletedCount: 0 }));

  try {
    await sellerService.resetPassword({
      token,
      password: "correct-horse-battery",
    });
    assert.equal(update.$set.passwordHash, "new-password-hash");
    assert.equal(update.$inc.authVersion, 1);
  } finally {
    mock.restoreAll();
  }
});

test("seller reset endpoints reject invalid data and require Resend configuration", async () => {
  const app = createApp({
    jwtSecret: "test-only-signing-secret-with-at-least-32-bytes",
    isProduction: false,
    trustProxyHops: 0,
    frontendOrigins: [],
    resend: null,
  });
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/seller/auth`;

  try {
    const forgotResponse = await fetch(`${baseUrl}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "seller@example.com" }),
    });
    assert.equal(forgotResponse.status, 503);
    assert.match((await forgotResponse.json()).message, /RESEND_API_KEY/);

    const resetResponse = await fetch(`${baseUrl}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "invalid", password: "correct-horse-battery" }),
    });
    assert.equal(resetResponse.status, 400);
    assert.match((await resetResponse.json()).message, /invalid or has expired/);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
