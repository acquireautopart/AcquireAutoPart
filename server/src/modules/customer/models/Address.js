const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    label: {
      type: String,
      enum: ["Home", "Office", "Workshop", "Other"],
      default: "Home",
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    line: { type: String, required: true, trim: true, maxlength: 300 },
    city: { type: String, trim: true, maxlength: 120, default: "" },
    region: { type: String, trim: true, maxlength: 120, default: "" },
    postalCode: { type: String, trim: true, maxlength: 20, default: "" },
    country: { type: String, trim: true, maxlength: 80, default: "India" },
    phone: { type: String, trim: true, maxlength: 24, default: "" },
    isDefault: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

addressSchema.index({ customer: 1, createdAt: -1 });

module.exports =
  mongoose.models.Address || mongoose.model("Address", addressSchema);
