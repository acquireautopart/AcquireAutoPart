const mongoose = require("mongoose");

const sellerNotificationSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["new_order"],
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    orderCode: { type: String, trim: true, required: true },
    message: { type: String, trim: true, required: true, maxlength: 300 },
    itemCount: { type: Number, min: 1, required: true },
    total: { type: Number, min: 0, required: true },
    currency: { type: String, match: /^[A-Z]{3}$/, default: "USD" },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

sellerNotificationSchema.index({ seller: 1, createdAt: -1 });
sellerNotificationSchema.index(
  { seller: 1, type: 1, order: 1 },
  { unique: true },
);

module.exports =
  mongoose.models.SellerNotification ||
  mongoose.model("SellerNotification", sellerNotificationSchema);
