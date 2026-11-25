const mongoose = require("mongoose");
const { countries } = require("../../market/countries");

const countryCodes = countries.map((country) => country.code);

const adminSettingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "marketplace" },
    platformFeeRate: { type: Number, min: 0, max: 100, default: 0 },
    maintenanceMode: { type: Boolean, default: false },
    supportEmail: { type: String, trim: true, lowercase: true, default: "" },
    announcement: { type: String, trim: true, maxlength: 500, default: "" },
    deliveryPayoutRates: [
      {
        _id: false,
        country: { type: String, required: true, enum: countryCodes },
        city: { type: String, required: true, trim: true, maxlength: 120 },
        currency: { type: String, required: true, match: /^[A-Z]{3}$/ },
        minWeightGrams: { type: Number, required: true, min: 1, max: 100000 },
        maxWeightGrams: { type: Number, required: true, min: 1, max: 100000 },
        deliveryAgentRate: { type: Number, required: true, min: 0, max: 1000000 },
        hubGrossRate: { type: Number, required: true, min: 0, max: 1000000 },
      },
    ],
    banners: [
      {
        title: { type: String, trim: true, maxlength: 120 },
        message: { type: String, trim: true, maxlength: 500 },
        active: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true, versionKey: false },
);

module.exports =
  mongoose.models.AdminSetting ||
  mongoose.model("AdminSetting", adminSettingSchema);
