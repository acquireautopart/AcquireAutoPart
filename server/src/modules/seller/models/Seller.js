const mongoose = require("mongoose");
const { countries } = require("../../market/countries");

const countryCodes = countries.map((country) => country.code);

const sellerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
    },
    phone: { type: String, trim: true, default: "", maxlength: 32 },
    passwordHash: { type: String, required: true, select: false },
    authVersion: { type: Number, min: 0, default: 0 },
    role: {
      type: String,
      enum: ["seller"],
      default: "seller",
      immutable: true,
    },
    storeName: { type: String, trim: true, default: "", maxlength: 120 },
    address: { type: String, trim: true, default: "", maxlength: 1000 },
    pickupPostalCode: { type: String, trim: true, default: "", maxlength: 24 },
    taxId: { type: String, trim: true, default: "", maxlength: 40 },
    sellCategories: { type: [String], default: [] },
    country: { type: String, enum: [...countryCodes, ""], default: "" },
    stripeAccountId: { type: String, trim: true, default: "" },
    verified: { type: Boolean, default: false },
    adminStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Suspended"],
      default: "Pending",
      index: true,
    },
    identityVerification: {
      status: {
        type: String,
        enum: ["Not submitted", "Pending", "Approved", "Rejected"],
        default: "Not submitted",
      },
      documentType: { type: String, trim: true, maxlength: 100, default: "" },
      documentNumberEncrypted: { type: String, select: false, default: "" },
      documentKey: { type: String, select: false, default: "" },
      contentType: { type: String, default: "" },
      submittedAt: { type: Date, default: null },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: String, default: "" },
      reviewNote: { type: String, maxlength: 500, default: "" },
      signatureStatus: {
        type: String,
        enum: ["Not submitted", "Pending", "Approved", "Rejected"],
        default: "Not submitted",
      },
      signatureKey: { type: String, select: false, default: "" },
      signatureContentType: { type: String, default: "" },
      signatureSubmittedAt: { type: Date, default: null },
    },
    settings: {
      currency: { type: String, match: /^[A-Z]{3}$/, default: "USD" },
      lowStockThreshold: { type: Number, min: 0, max: 10000, default: 5 },
      shippingDays: { type: Number, min: 1, max: 60, default: 3 },
      shippingFee: { type: Number, min: 0, max: 100000, default: 0 },
      taxRate: { type: Number, min: 0, max: 100, default: 0 },
      returnWindowDays: { type: Number, min: 0, max: 365, default: 30 },
      returnPolicy: { type: String, maxlength: 2000, default: "" },
      notifications: {
        orders: { type: Boolean, default: true },
        inventory: { type: Boolean, default: true },
        payouts: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true, versionKey: false },
);

module.exports =
  mongoose.models.Seller || mongoose.model("Seller", sellerSchema);
