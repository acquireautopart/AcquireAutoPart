const mongoose = require("mongoose");
const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    sku: { type: String, trim: true, maxlength: 64, default: "" },
    price: { type: Number, min: 0, required: true },
    stock: { type: Number, min: 0, default: 0 },
  },
  { _id: true },
);
const vehicleFitmentSchema = new mongoose.Schema(
  {
    yearFrom: { type: Number, min: 1900, max: 2100 },
    yearTo: { type: Number, min: 1900, max: 2100 },
    make: { type: String, trim: true, maxlength: 80, required: true },
    model: { type: String, trim: true, maxlength: 100, required: true },
    trim: { type: String, trim: true, maxlength: 80, default: "" },
    engine: { type: String, trim: true, maxlength: 80, default: "" },
  },
  { _id: false },
);
const productSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    sku: { type: String, trim: true, maxlength: 64, required: true },
    partNumber: { type: String, trim: true, uppercase: true, maxlength: 80, default: "", index: true },
    name: { type: String, trim: true, maxlength: 200, required: true },
    description: { type: String, trim: true, maxlength: 5000, default: "" },
    category: { type: String, trim: true, maxlength: 80, required: true },
    subcategory: { type: String, trim: true, maxlength: 80, default: "" },
    brand: { type: String, trim: true, maxlength: 80, default: "" },
    fitment: { type: String, trim: true, maxlength: 200, default: "" },
    fitments: { type: [vehicleFitmentSchema], default: [] },
    condition: { type: String, enum: ["New", "Refurbished", "Used"], default: "New", index: true },
    warranty: { type: String, trim: true, maxlength: 160, default: "" },
    price: { type: Number, min: 0, required: true },
    compareAtPrice: { type: Number, min: 0, default: null },
    storefrontPrice: { type: Number, min: 0, select: false },
    storefrontCompareAtPrice: { type: Number, min: 0, default: null, select: false },
    stock: { type: Number, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 5 },
    images: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 1000,
          match: /^https?:\/\/\S+$/i,
        },
      ],
      validate: {
        validator: (images) =>
          Array.isArray(images) && images.length >= 1 && images.length <= 6,
        message: "Add between 1 and 6 product image URLs.",
      },
    },
    variants: { type: [variantSchema], default: [] },
    status: {
      type: String,
      enum: ["Draft", "Active", "Archived"],
      default: "Active",
      index: true,
    },
    moderationStatus: {
      type: String,
      enum: ["Clear", "Flagged", "Hidden"],
      default: "Clear",
      index: true,
    },
    soldCount: { type: Number, min: 0, default: 0 },
    viewCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true, versionKey: false },
);
productSchema.index({ seller: 1, sku: 1 }, { unique: true });
productSchema.index({ seller: 1, status: 1, updatedAt: -1 });
productSchema.index({ status: 1, stock: 1, storefrontPrice: 1 });
module.exports =
  mongoose.models.SellerProduct ||
  mongoose.model("SellerProduct", productSchema);
