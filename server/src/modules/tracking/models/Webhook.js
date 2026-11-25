const mongoose = require("mongoose");

/** One POST attempt-set per scan event, kept so failures can be inspected. */
const webhookDeliverySchema = new mongoose.Schema(
  {
    awb: { type: String, trim: true, uppercase: true, default: "" },
    eventCode: { type: String, trim: true, default: "" },
    ok: { type: Boolean, default: false },
    /* HTTP status of the last attempt; 0 when the request never completed. */
    status: { type: Number, default: 0 },
    error: { type: String, trim: true, default: "", maxlength: 200 },
    attempts: { type: Number, default: 0 },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

/**
 * A seller-registered URL that receives every scan event of their shipments.
 */
const webhookSchema = new mongoose.Schema(
  {
    sellerId: { type: String, required: true, trim: true, maxlength: 80 },
    sellerName: { type: String, trim: true, default: "", maxlength: 120 },
    url: { type: String, required: true, trim: true, maxlength: 500 },
    active: { type: Boolean, default: true },
    deliveries: { type: [webhookDeliverySchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

webhookSchema.index({ sellerId: 1 });
webhookSchema.index({ active: 1 });

module.exports =
  mongoose.models.Webhook || mongoose.model("Webhook", webhookSchema);
