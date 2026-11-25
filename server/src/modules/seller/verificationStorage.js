const { randomUUID } = require("crypto");
const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const HttpError = require("../../utils/HttpError");

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Map([
  [
    "image/jpeg",
    {
      extension: "jpg",
      matches: (data) =>
        data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
    },
  ],
  [
    "image/png",
    {
      extension: "png",
      matches: (data) =>
        data
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    },
  ],
  [
    "image/webp",
    {
      extension: "webp",
      matches: (data) =>
        data.toString("ascii", 0, 4) === "RIFF" &&
        data.toString("ascii", 8, 12) === "WEBP",
    },
  ],
  [
    "application/pdf",
    {
      extension: "pdf",
      matches: (data) => data.toString("ascii", 0, 5) === "%PDF-",
    },
  ],
]);

let client;

function getStorage() {
  const bucket = process.env.KYC_S3_BUCKET?.trim();
  if (!bucket) {
    throw new HttpError(
      503,
      "Seller ID uploads are unavailable: set KYC_S3_BUCKET to a private S3 bucket, configure AWS_REGION and AWS credentials or an instance role in server/.env, then restart the API.",
    );
  }
  if (!client) {
    client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      ...(process.env.S3_ENDPOINT
        ? {
            endpoint: process.env.S3_ENDPOINT,
            forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
          }
        : {}),
    });
  }
  return { client, bucket };
}

function validateDocument(file) {
  if (
    !Buffer.isBuffer(file?.body) ||
    !file.body.length ||
    file.body.length > MAX_DOCUMENT_BYTES
  ) {
    throw new HttpError(
      400,
      "Upload a non-empty ID image or PDF no larger than 5 MB.",
    );
  }
  const type = allowedTypes.get(file.contentType);
  if (!type || !type.matches(file.body)) {
    throw new HttpError(
      400,
      "Upload a valid JPEG, PNG, WebP, or PDF identity document.",
    );
  }
  return type;
}

function getStorageUploadError(error) {
  const code = error?.Code || error?.code || error?.name || "";
  const normalizedCode = String(code).toLowerCase();

  if (normalizedCode.includes("credential")) {
    return new HttpError(
      503,
      "AWS credentials were not found. Configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in server/.env, or run the API with an AWS IAM role, then restart it.",
    );
  }
  if (
    ["invalidaccesskeyid", "signaturedoesnotmatch"].includes(normalizedCode)
  ) {
    return new HttpError(
      503,
      "AWS rejected the configured credentials. Check the access key and secret key in server/.env, then restart the API.",
    );
  }
  if (normalizedCode === "nosuchbucket") {
    return new HttpError(
      503,
      "AWS could not find the configured KYC_S3_BUCKET. Check the exact bucket name and AWS_REGION in server/.env.",
    );
  }
  if (["accessdenied", "allaccessdisabled"].includes(normalizedCode)) {
    return new HttpError(
      503,
      "AWS denied the seller ID upload. Grant the API identity s3:PutObject access to the configured private bucket.",
    );
  }
  if (
    [
      "permanentredirect",
      "authorizationheadermalformed",
      "incorrectendpoint",
    ].includes(normalizedCode)
  ) {
    return new HttpError(
      503,
      "The configured AWS_REGION does not match the S3 bucket region. Check the bucket's AWS region in server/.env.",
    );
  }

  return new HttpError(
    502,
    "Could not upload the seller ID document to S3. Check the API log for the S3 error code and request ID.",
  );
}

async function storeDocument(sellerId, file, namespace = "seller-verification") {
  const type = validateDocument(file);
  const { client: s3, bucket } = getStorage();
  const key = `${namespace}/${sellerId}/${randomUUID()}.${type.extension}`;
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.body,
        ContentLength: file.body.length,
        ContentType: file.contentType,
        CacheControl: "private, no-store",
        ServerSideEncryption: "AES256",
      }),
    );
  } catch (error) {
    console.error("Seller ID document S3 upload failed:", {
      code: error?.Code || error?.code || error?.name || "UnknownError",
      statusCode: error?.$metadata?.httpStatusCode || null,
      requestId: error?.$metadata?.requestId || null,
    });
    throw getStorageUploadError(error);
  }
  return key;
}

async function createReviewUrl(key) {
  if (!key)
    throw new HttpError(404, "No identity document has been submitted.");
  const { client: s3, bucket } = getStorage();
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: 300,
  });
}

async function deleteDocument(key) {
  if (!key) return;
  const { client: s3, bucket } = getStorage();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

module.exports = {
  createReviewUrl,
  deleteDocument,
  getStorageUploadError,
  storeDocument,
  validateDocument,
};
