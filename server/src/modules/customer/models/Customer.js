const mongoose = require("mongoose");
const { countries } = require("../../market/countries");

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
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
    marketCountry: {
      type: String,
      enum: countries.map((country) => country.code),
      default: "US",
    },
    role: {
      type: String,
      enum: ["customer"],
      default: "customer",
      immutable: true,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 24,
      default: "",
    },
    profilePhoto: {
      type: String,
      maxlength: 850000,
      default: "",
    },
    preferences: {
      orderUpdates: { type: Boolean, default: true },
      priceDrops: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: false },
      twoFactor: { type: Boolean, default: false },
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);
