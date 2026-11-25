const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { v2: cloudinary } = require("cloudinary");
const mongoose = require("mongoose");

const root = path.resolve(__dirname, "../..");
const sourceRoot = path.join(root, "client", "src");
const publicRoot = path.join(root, "client", "public");
const sourceExtensions = new Set([".js", ".jsx", ".json", ".css"]);
const imageExtensions = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
]);
const remoteImageHosts = new Set([
  "cdn.simpleicons.org",
  "images.unsplash.com",
  "thumb.wikimedia.org",
  "upload.wikimedia.org",
]);

function requireCloudinaryConfig() {
  const config = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
    api_key: process.env.CLOUDINARY_API_KEY?.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
  };
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    throw new Error(
      "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env before migrating images.",
    );
  }
  cloudinary.config({ ...config, secure: true });
}

function listFiles(directory, extensions) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(file, extensions);
    return extensions.has(path.extname(entry.name).toLowerCase()) ? [file] : [];
  });
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function normaliseRemoteUrl(value) {
  const url = new URL(value);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function imageUrlsIn(contents) {
  return [...contents.matchAll(/https?:\/\/[^\s"'`<>),]+/g)]
    .map((match) => match[0])
    .filter((value) => {
      if (value.includes("${")) return false;
      try {
        const url = new URL(value);
        return remoteImageHosts.has(url.hostname);
      } catch {
        return false;
      }
    });
}

async function upload(source, folder, publicId) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      let uploadSource = source;
      if (typeof source === "string" && /^https:\/\//i.test(source)) {
        const response = await fetch(source, {
          headers: { "User-Agent": "AcquireAutoImageMigration/1.0" },
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) {
          const error = new Error(
            `Image source returned HTTP ${response.status}.`,
          );
          error.http_code = response.status;
          throw error;
        }
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          throw new Error("Image source did not return an image.");
        }
        const body = Buffer.from(await response.arrayBuffer());
        uploadSource = `data:${contentType};base64,${body.toString("base64")}`;
      }

      const result = await cloudinary.uploader.upload(uploadSource, {
        folder,
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
      });
      return result.secure_url;
    } catch (error) {
      const retryable =
        [429, 500, 502, 503, 504].includes(Number(error?.http_code)) ||
        /(?:429|500|502|503|504|too many requests)/i.test(error?.message || "");
      if (!retryable || attempt === 3) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, 2000 * 2 ** attempt),
      );
    }
  }
  throw new Error("Cloudinary image upload retries were exhausted.");
}

async function getCloudinaryUrlForStoredImage(
  image,
  remoteUrlsByPath,
  localImageUrls,
) {
  const source = String(image || "").trim();
  if (!source) return source;

  if (source.startsWith("/")) {
    const cloudUrl = localImageUrls.get(source);
    if (!cloudUrl)
      throw new Error(
        `No project asset found for stored image path: ${source}`,
      );
    return cloudUrl;
  }

  const imageId = source.match(/^(photo-[\w-]+)/)?.[1];
  const remoteSource = imageId
    ? `https://images.unsplash.com/${imageId}`
    : source;
  let url;
  try {
    url = new URL(remoteSource);
  } catch {
    throw new Error(`Unsupported stored image reference: ${source}`);
  }
  if (
    url.hostname === "res.cloudinary.com" &&
    url.pathname.startsWith(
      `/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`,
    )
  ) {
    return source;
  }
  if (url.protocol !== "https:" || !remoteImageHosts.has(url.hostname)) {
    throw new Error(
      `Stored image host is not approved for migration: ${url.hostname}`,
    );
  }

  const normalisedUrl = normaliseRemoteUrl(remoteSource);
  let cloudUrl = remoteUrlsByPath.get(normalisedUrl);
  if (!cloudUrl) {
    cloudUrl = await upload(
      remoteSource,
      "acquireauto/project-images",
      hash(normalisedUrl),
    );
    remoteUrlsByPath.set(normalisedUrl, cloudUrl);
  }
  return cloudUrl;
}

async function migrateStoredImages(remoteUrlsByPath, localImageUrls) {
  const Product = require("../src/modules/seller/models/Product");
  const Cart = require("../src/modules/customer/models/Cart");
  const Order = require("../src/modules/customer/models/Order");
  const WishlistItem = require("../src/modules/customer/models/WishlistItem");
  const SavedVehicle = require("../src/modules/customer/models/SavedVehicle");
  let updatedCount = 0;

  const products = await Product.find({ images: { $exists: true, $ne: [] } })
    .select("_id images")
    .lean();
  for (const product of products) {
    const images = await Promise.all(
      product.images.map((image) =>
        getCloudinaryUrlForStoredImage(image, remoteUrlsByPath, localImageUrls),
      ),
    );
    if (images.some((image, index) => image !== product.images[index])) {
      await Product.updateOne({ _id: product._id }, { $set: { images } });
      updatedCount += 1;
    }
  }

  for (const Model of [Cart, Order]) {
    const documents = await Model.find({
      "items.imageUrl": { $exists: true, $ne: "" },
    })
      .select("_id items.imageUrl")
      .lean();
    for (const document of documents) {
      for (const [index, item] of document.items.entries()) {
        if (!item.imageUrl) continue;
        const imageUrl = await getCloudinaryUrlForStoredImage(
          item.imageUrl,
          remoteUrlsByPath,
          localImageUrls,
        );
        if (imageUrl !== item.imageUrl) {
          await Model.updateOne(
            { _id: document._id },
            { $set: { [`items.${index}.imageUrl`]: imageUrl } },
          );
          updatedCount += 1;
        }
      }
    }
  }

  for (const [Model, field] of [
    [WishlistItem, "imageUrl"],
    [SavedVehicle, "imageUrl"],
  ]) {
    const documents = await Model.find({ [field]: { $exists: true, $ne: "" } })
      .select(`_id ${field}`)
      .lean();
    for (const document of documents) {
      const imageUrl = await getCloudinaryUrlForStoredImage(
        document[field],
        remoteUrlsByPath,
        localImageUrls,
      );
      if (imageUrl !== document[field]) {
        await Model.updateOne(
          { _id: document._id },
          { $set: { [field]: imageUrl } },
        );
        updatedCount += 1;
      }
    }
  }
  return updatedCount;
}

async function migrateProjectImages() {
  const sourceFiles = listFiles(sourceRoot, sourceExtensions);
  const contentsByFile = new Map(
    sourceFiles.map((file) => [file, fs.readFileSync(file, "utf8")]),
  );
  const remoteSources = new Map();
  const shortImageIds = new Set();

  for (const contents of contentsByFile.values()) {
    for (const url of imageUrlsIn(contents)) {
      remoteSources.set(url, normaliseRemoteUrl(url));
    }
    for (const match of contents.matchAll(/\bphoto-\d+-[\w-]+\b/g)) {
      shortImageIds.add(match[0]);
    }
  }

  const remoteUrlsByPath = new Map();
  for (const [source, normalisedUrl] of remoteSources) {
    const existing = remoteUrlsByPath.get(normalisedUrl);
    if (existing) continue;
    const cloudUrl = await upload(
      source,
      "acquireauto/project-images",
      hash(normalisedUrl),
    );
    remoteUrlsByPath.set(normalisedUrl, cloudUrl);
  }

  const shortIdUrls = new Map();
  for (const imageId of shortImageIds) {
    const source = `https://images.unsplash.com/${imageId}`;
    const normalisedUrl = normaliseRemoteUrl(source);
    let cloudUrl = remoteUrlsByPath.get(normalisedUrl);
    if (!cloudUrl) {
      cloudUrl = await upload(
        source,
        "acquireauto/project-images",
        hash(normalisedUrl),
      );
      remoteUrlsByPath.set(normalisedUrl, cloudUrl);
    }
    shortIdUrls.set(imageId, cloudUrl);
  }

  const localImageUrls = new Map();
  const publicImages = listFiles(publicRoot, imageExtensions);
  for (const file of publicImages) {
    const relativePath = path
      .relative(publicRoot, file)
      .split(path.sep)
      .join("/");
    const cloudUrl = await upload(
      file,
      "acquireauto/project-images",
      hash(file),
    );
    localImageUrls.set(`/${relativePath}`, cloudUrl);
  }

  const storedImageCount = await migrateStoredImages(
    remoteUrlsByPath,
    localImageUrls,
  );

  for (const [file, original] of contentsByFile) {
    let updated = original;
    for (const [source, normalisedUrl] of remoteSources) {
      const cloudUrl = remoteUrlsByPath.get(normalisedUrl);
      updated = updated.split(source).join(cloudUrl);
    }
    for (const [imageId, cloudUrl] of shortIdUrls) {
      updated = updated.split(imageId).join(cloudUrl);
    }
    for (const [localPath, cloudUrl] of localImageUrls) {
      updated = updated.split(localPath).join(cloudUrl);
    }
    if (updated !== original) fs.writeFileSync(file, updated);
  }

  console.log(
    `Migrated ${remoteUrlsByPath.size + localImageUrls.size} project images and ${storedImageCount} stored image references to Cloudinary.`,
  );
}

async function migrate() {
  requireCloudinaryConfig();
  if (!process.env.MONGODB_URI?.trim()) {
    throw new Error(
      "Set MONGODB_URI in server/.env to migrate stored product images.",
    );
  }
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    await migrateProjectImages();
  } finally {
    await mongoose.disconnect();
  }
}

migrate().catch((error) => {
  console.error("Project image migration failed:", error.message);
  process.exitCode = 1;
});
