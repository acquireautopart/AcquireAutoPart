const crypto = require("crypto");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { v2: cloudinary } = require("cloudinary");
const mongoose = require("mongoose");
const Seller = require("../src/modules/seller/models/Seller");
const Product = require("../src/modules/seller/models/Product");

const PRODUCT_NAMES = [
  ["Ceramic Brake Pad Set", "Brakes"],
  ["Brake Rotor Pair", "Brakes"],
  ["Brake Caliper Assembly", "Brakes"],
  ["Brake Master Cylinder", "Brakes"],
  ["Brake Hose Kit", "Brakes"],
  ["Air Filter Element", "Filters"],
  ["Oil Filter Cartridge", "Filters"],
  ["Cabin Air Filter", "Filters"],
  ["Fuel Filter Assembly", "Filters"],
  ["Transmission Filter Kit", "Filters"],
  ["Engine Gasket Set", "Engine"],
  ["Water Pump Assembly", "Engine"],
  ["Radiator Hose Kit", "Engine"],
  ["Serpentine Belt", "Engine"],
  ["Ignition Coil Pack", "Engine"],
  ["Headlight Assembly", "Lighting"],
  ["LED Fog Lamp Pair", "Lighting"],
  ["Tail Light Assembly", "Lighting"],
  ["Turn Signal Lamp", "Lighting"],
  ["Headlight Bulb Pair", "Lighting"],
  ["Shock Absorber Pair", "Suspension"],
  ["Strut Mount Kit", "Suspension"],
  ["Control Arm Assembly", "Suspension"],
  ["Ball Joint Pair", "Suspension"],
  ["Stabilizer Link Kit", "Suspension"],
  ["Alternator Assembly", "Electrical"],
  ["Starter Motor", "Electrical"],
  ["Battery Terminal Set", "Electrical"],
  ["Window Switch Assembly", "Electrical"],
  ["Wiring Connector Kit", "Electrical"],
  ["Floor Mat Set", "Interior"],
  ["Seat Cover Set", "Interior"],
  ["Door Handle Assembly", "Interior"],
  ["Mirror Switch", "Interior"],
  ["Cabin Trim Fastener Kit", "Interior"],
  ["Side Mirror Assembly", "Exterior"],
  ["Bumper Retainer Kit", "Exterior"],
  ["Fender Liner", "Exterior"],
  ["Wiper Blade Pair", "Exterior"],
  ["Splash Guard Set", "Exterior"],
  ["Mechanic Socket Set", "Tools"],
  ["Torque Wrench", "Tools"],
  ["Trim Removal Tool Kit", "Tools"],
  ["Diagnostic Test Light", "Tools"],
  ["Workshop Creeper", "Tools"],
  ["Wheel Hub Assembly", "Wheels"],
  ["Wheel Stud Set", "Wheels"],
  ["Lug Nut Set", "Wheels"],
  ["Wheel Bearing Pair", "Wheels"],
  ["Valve Stem Kit", "Wheels"],
];

const IMAGE_SOURCES = [
  ["brakes", "photo-1486262715619-67b85e0b08d3"],
  ["vehicle", "photo-1552519507-da3b142c6e3d"],
  ["body", "photo-1492144534655-ae79c964c9d7"],
  ["engine", "photo-1503376780353-7e6692767b70"],
  ["tools", "photo-1581092918056-0c4c3acd3789"],
];

function getSellerEmails() {
  const emails = String(process.env.SEED_SELLER_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (
    emails.length !== 5 ||
    emails.some((email) => !/^\S+@\S+\.\S+$/.test(email)) ||
    new Set(emails).size !== emails.length
  ) {
    throw new Error(
      "Set SEED_SELLER_EMAILS to exactly five unique, valid comma-separated addresses.",
    );
  }
  return emails;
}

function createTemporaryPassword() {
  return crypto.randomBytes(24).toString("base64url");
}

async function uploadProductImages() {
  const config = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
    api_key: process.env.CLOUDINARY_API_KEY?.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
  };
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    throw new Error(
      "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env.",
    );
  }
  cloudinary.config({ ...config, secure: true });

  const imageUrls = [];
  for (const [name, imageId] of IMAGE_SOURCES) {
    const result = await cloudinary.uploader.upload(
      `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=800&q=80`,
      {
        folder: "acquireauto/test-sellers",
        public_id: name,
        overwrite: true,
        resource_type: "image",
      },
    );
    imageUrls.push(result.secure_url);
  }
  return imageUrls;
}

async function seed() {
  const emails = getSellerEmails();
  if (!process.env.MONGODB_URI?.trim()) {
    throw new Error("Set MONGODB_URI in server/.env.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  const createdSellerIds = [];
  try {
    const existing = await Seller.find({ email: { $in: emails } })
      .select("email")
      .lean();
    if (existing.length) {
      throw new Error(
        `No records were changed. Seller accounts already exist for: ${existing.map((seller) => seller.email).join(", ")}. Existing accounts will not be overwritten.`,
      );
    }

    const imageUrls = await uploadProductImages();
    const credentials = [];
    for (const [sellerIndex, email] of emails.entries()) {
      const sellerNumber = sellerIndex + 1;
      const password = createTemporaryPassword();
      const seller = await Seller.create({
        name: `AcquireAuto Test Seller ${sellerNumber}`,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        country: "IN",
        storeName: `AA TEST Store ${sellerNumber}`,
        verified: false,
        adminStatus: "Pending",
        identityVerification: { status: "Not submitted" },
        settings: {
          currency: "INR",
          notifications: { orders: true },
        },
      });
      createdSellerIds.push(seller._id);

      const products = PRODUCT_NAMES.map(([name, category], productIndex) => {
        const index = productIndex + 1;
        const price = 299 + ((sellerIndex * 317 + productIndex * 137) % 4000);
        const imageIndex =
          category === "Brakes"
            ? 0
            : category === "Lighting" || category === "Electrical"
              ? 1
              : category === "Exterior" || category === "Wheels"
                ? 2
                : category === "Engine" || category === "Filters"
                  ? 3
                  : 4;
        return {
          seller: seller._id,
          sku: `AA-TEST-S${sellerNumber}-${String(index).padStart(3, "0")}`,
          name: `${name} - Test ${sellerNumber}-${String(index).padStart(2, "0")}`,
          description:
            "AcquireAuto sample listing for marketplace and order-flow testing. Not a real product offer.",
          category,
          brand: "AcquireAuto Test",
          fitment: "Universal - test listing",
          price,
          compareAtPrice: Math.round(price * 1.2 * 100) / 100,
          stock: 20,
          lowStockThreshold: 5,
          images: [imageUrls[imageIndex]],
          status: "Active",
          moderationStatus: "Clear",
        };
      });
      await Product.insertMany(products, { ordered: true });
      credentials.push({
        store: seller.storeName,
        email,
        temporaryPassword: password,
        productsCreated: products.length,
        sellerStatus: seller.adminStatus,
        identityStatus: seller.identityVerification.status,
      });
    }

    console.log(
      JSON.stringify(
        {
          createdSellers: credentials.length,
          createdProducts: credentials.reduce(
            (total, seller) => total + seller.productsCreated,
            0,
          ),
          credentials,
          note: "Temporary passwords are displayed once. Store them securely and change them after first login. Sellers remain pending until genuine identity documents are uploaded and approved by an admin.",
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (createdSellerIds.length) {
      await Product.deleteMany({ seller: { $in: createdSellerIds } });
      await Seller.deleteMany({ _id: { $in: createdSellerIds } });
    }
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error("Test seller seed failed:", error.message);
  process.exitCode = 1;
});
