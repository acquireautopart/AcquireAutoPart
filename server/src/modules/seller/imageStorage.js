const { randomUUID } = require("crypto");
const { v2: cloudinary } = require("cloudinary");
const HttpError = require("../../utils/HttpError");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Map([
  [
    "image/jpeg",
    (data) => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
  ],
  [
    "image/png",
    (data) =>
      data
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  ],
  [
    "image/webp",
    (data) =>
      data.toString("ascii", 0, 4) === "RIFF" &&
      data.toString("ascii", 8, 12) === "WEBP",
  ],
]);

function validateImage(file) {
  const matches = allowedTypes.get(file?.contentType);
  if (
    !Buffer.isBuffer(file?.body) ||
    !file.body.length ||
    file.body.length > MAX_IMAGE_BYTES ||
    !matches ||
    !matches(file.body)
  ) {
    throw new HttpError(
      400,
      "Upload a valid JPEG, PNG, or WebP product image no larger than 5 MB.",
    );
  }
}

function getCloudinaryUploadError(error) {
  console.error("Product image Cloudinary upload failed:", {
    code: error?.http_code || error?.name || "UnknownError",
  });
  return new HttpError(
    502,
    "Could not upload the product image to Cloudinary. Check the Cloudinary configuration and API log.",
  );
}

async function storeProductImage(file, config) {
  validateImage(file);
  if (!config?.cloudName || !config?.apiKey || !config?.apiSecret) {
    throw new HttpError(
      503,
      "Product image uploads are unavailable: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env, then restart the API.",
    );
  }

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  try {
    const result = await new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: "acquireauto/products",
          public_id: randomUUID(),
          resource_type: "image",
        },
        (error, uploaded) => (error ? reject(error) : resolve(uploaded)),
      );
      upload.end(file.body);
    });
    return { url: result.secure_url };
  } catch (error) {
    throw getCloudinaryUploadError(error);
  }
}

module.exports = { getCloudinaryUploadError, storeProductImage, validateImage };
