const mongoose = require("mongoose");
const { HUB_TYPES } = require("../constants");

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
    hubType: { type: String, required: true, enum: HUB_TYPES },
    servedPincodes: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false },
);

hubSchema.index({ servedPincodes: 1 });
hubSchema.index({ hubType: 1 });

module.exports = mongoose.models.Hub || mongoose.model("Hub", hubSchema);
