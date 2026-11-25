const mongoose = require("mongoose");

const savedVehicleSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    years: { type: String, trim: true, maxlength: 40, default: "" },
    year: { type: Number, min: 1900, max: 2100, default: null },
    make: { type: String, trim: true, maxlength: 80, default: "" },
    model: { type: String, trim: true, maxlength: 100, default: "" },
    trim: { type: String, trim: true, maxlength: 80, default: "" },
    engine: { type: String, trim: true, maxlength: 80, default: "" },
    fuel: { type: String, trim: true, maxlength: 40, default: "" },
    partsCount: { type: Number, default: 0, min: 0, max: 100000 },
    imageUrl: { type: String, trim: true, maxlength: 500, default: "" },
    isPrimary: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

savedVehicleSchema.index({ customer: 1, createdAt: -1 });

module.exports =
  mongoose.models.SavedVehicle ||
  mongoose.model("SavedVehicle", savedVehicleSchema);
