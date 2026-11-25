const mongoose = require("mongoose");
const { EVENT_CODE, PAYMENT_TYPES } = require("../constants");

const shipmentSchema = new mongoose.Schema(
  {
    awb: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: 32,
    },
    orderId: { type: String, required: true, trim: true, maxlength: 80 },
    originCity: { type: String, required: true, trim: true, maxlength: 80 },
    destinationPincode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 12,
    },
    destinationCity: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    paymentType: { type: String, required: true, enum: PAYMENT_TYPES },
    plannedRoute: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hub" }],
    currentStatus: { type: String, trim: true, default: EVENT_CODE.ORDER_PLACED },
    currentHub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hub",
      default: null,
    },
    otp: { type: String, default: "" },
    failedAttempts: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false },
);

shipmentSchema.index({ currentHub: 1 });
shipmentSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.Shipment || mongoose.model("Shipment", shipmentSchema);
