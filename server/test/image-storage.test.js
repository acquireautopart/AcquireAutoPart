const assert = require("node:assert/strict");
const { test } = require("node:test");
const HttpError = require("../src/utils/HttpError");
const imageStorage = require("../src/modules/seller/imageStorage");
const { loadEnvironment } = require("../src/config/environment");

const validJpeg = {
  body: Buffer.from([0xff, 0xd8, 0xff]),
  contentType: "image/jpeg",
};

test("product image upload validates image type and byte signature", () => {
  assert.doesNotThrow(() => imageStorage.validateImage(validJpeg));
  assert.throws(
    () =>
      imageStorage.validateImage({
        body: Buffer.from("<script>"),
        contentType: "image/jpeg",
      }),
    (error) => error instanceof HttpError && error.statusCode === 400,
  );
  assert.throws(
    () =>
      imageStorage.validateImage({
        body: Buffer.from("data"),
        contentType: "text/plain",
      }),
    (error) => error instanceof HttpError && error.statusCode === 400,
  );
});

test("product image upload reports missing Cloudinary settings", async () => {
  await assert.rejects(
    imageStorage.storeProductImage(validJpeg, null),
    (error) =>
      error instanceof HttpError &&
      error.statusCode === 503 &&
      /CLOUDINARY_CLOUD_NAME/.test(error.message),
  );
});

test("Cloudinary configuration must be complete when any value is set", () => {
  const env = {
    MONGODB_URI: "mongodb://localhost/acquireauto",
    JWT_SECRET: "a".repeat(32),
    CLOUDINARY_CLOUD_NAME: "test-cloud",
  };
  assert.throws(() => loadEnvironment(env), /set.*CLOUDINARY_CLOUD_NAME/i);
});
