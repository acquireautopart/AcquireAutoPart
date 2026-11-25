const mongoose = require("mongoose");

const adminSettingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "marketplace" },
    platformFeeRate: { type: Number, min: 0, max: 100, default: 0 },
    maintenanceMode: { type: Boolean, default: false },
    supportEmail: { type: String, trim: true, lowercase: true, default: "" },
    announcement: { type: String, trim: true, maxlength: 500, default: "" },
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
