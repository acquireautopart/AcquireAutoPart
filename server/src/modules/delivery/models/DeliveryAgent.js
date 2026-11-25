const mongoose = require("mongoose");
const { countries } = require("../../market/countries");

const countryCodes = countries.map((country) => country.code);

const deliveryAgentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
    },
    phone: { type: String, required: true, trim: true, maxlength: 24 },
    passwordHash: { type: String, required: true, select: false },
    authVersion: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isOnline: { type: Boolean, default: false },
    applicationStatus: {
      type: String,
      enum: ["Incomplete", "Pending", "Interview", "Approved", "Rejected"],
      default: "Approved",
      index: true,
    },
    address: { type: String, trim: true, maxlength: 500, default: "" },
    country: { type: String, enum: countryCodes, default: undefined },
    state: { type: String, trim: true, maxlength: 120, default: "" },
    district: { type: String, trim: true, maxlength: 120, default: "" },
    postalCode: { type: String, trim: true, maxlength: 24, default: "" },
    identityDocumentType: { type: String, trim: true, maxlength: 100, default: "" },
    identityDocumentNumberEncrypted: {
      type: String,
      select: false,
      default: "",
    },
    profilePhotoKey: { type: String, select: false, default: "" },
    identityDocumentKey: { type: String, select: false, default: "" },
    applicationTokenHash: { type: String, select: false, default: "" },
    applicationTokenExpiresAt: { type: Date, select: false, default: null },
    applicationSubmittedAt: { type: Date, default: null },
    interviewAt: { type: Date, default: null },
    interviewNote: { type: String, trim: true, maxlength: 500, default: "" },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, trim: true, default: "" },
    reviewNote: { type: String, trim: true, maxlength: 500, default: "" },
    role: {
      type: String,
      enum: ["delivery_agent", "hub_staff"],
      default: "delivery_agent",
    },
  },
  { timestamps: true, versionKey: false },
);

deliveryAgentSchema.index({
  applicationStatus: 1,
  country: 1,
  state: 1,
  district: 1,
});

module.exports =
  mongoose.models.DeliveryAgent ||
  mongoose.model("DeliveryAgent", deliveryAgentSchema);
