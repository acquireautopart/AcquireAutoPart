const assert = require("node:assert/strict");
const { test } = require("node:test");
const HttpError = require("../src/utils/HttpError");
const verificationStorage = require("../src/modules/seller/verificationStorage");

test("seller ID upload reports the required private S3 configuration when no bucket is set", async () => {
  const previousBucket = process.env.KYC_S3_BUCKET;
  delete process.env.KYC_S3_BUCKET;

  try {
    await assert.rejects(
      verificationStorage.storeDocument("seller-id", {
        body: Buffer.from([0xff, 0xd8, 0xff]),
        contentType: "image/jpeg",
      }),
      (error) => {
        assert.ok(error instanceof HttpError);
        assert.equal(error.statusCode, 503);
        assert.match(error.message, /KYC_S3_BUCKET/);
        assert.match(error.message, /restart the API/);
        return true;
      },
    );
  } finally {
    if (previousBucket === undefined) delete process.env.KYC_S3_BUCKET;
    else process.env.KYC_S3_BUCKET = previousBucket;
  }
});

test("seller ID upload explains when local AWS credentials are missing", () => {
  const error = verificationStorage.getStorageUploadError({
    name: "CredentialsProviderError",
    message: "Could not load credentials from any providers",
  });

  assert.ok(error instanceof HttpError);
  assert.equal(error.statusCode, 503);
  assert.match(error.message, /AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY/);
});

test("seller ID upload distinguishes bucket access and region configuration errors", () => {
  const bucketError = verificationStorage.getStorageUploadError({
    name: "NoSuchBucket",
  });
  const permissionError = verificationStorage.getStorageUploadError({
    name: "AccessDenied",
  });
  const regionError = verificationStorage.getStorageUploadError({
    name: "PermanentRedirect",
  });

  assert.match(bucketError.message, /KYC_S3_BUCKET/);
  assert.match(permissionError.message, /s3:PutObject/);
  assert.match(regionError.message, /AWS_REGION/);
});
