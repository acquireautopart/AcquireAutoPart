const mongoose = require("mongoose");
const { HUB_TYPES } = require("../constants");
const { countries } = require("../../market/countries");

const countryCodes = countries.map((country) => country.code);

const hubSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: 24,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    district: { type: String, trim: true, default: "", maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    country: { type: String, enum: [...countryCodes, ""], default: "" },
    address: { type: String, trim: true, default: "", maxlength: 500 },
    postalCode: { type: String, trim: true, default: "", maxlength: 24 },
    pickupPincodes: { type: [String], default: [] },
    inChargeName: { type: String, trim: true, default: "", maxlength: 100 },
    inChargeEmail: { type: String, trim: true, lowercase: true, default: "", maxlength: 254 },
    inChargePhone: { type: String, trim: true, default: "", maxlength: 24 },
    applicationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Approved",
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    hubType: { type: String, required: true, enum: HUB_TYPES },
    servedPincodes: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false },
);

hubSchema.index({ servedPincodes: 1 });
hubSchema.index({ country: 1, pickupPincodes: 1, isActive: 1, applicationStatus: 1 });
hubSchema.index({ hubType: 1 });

module.exports = mongoose.models.Hub || mongoose.model("Hub", hubSchema);
