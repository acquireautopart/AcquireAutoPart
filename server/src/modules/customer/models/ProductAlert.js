const mongoose = require("mongoose");

const productAlertSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    productId: { type: String, trim: true, maxlength: 64, required: true },
    targetPrice: { type: Number, min: 0, default: null },
    notifyPriceDrop: { type: Boolean, default: true },
    notifyRestock: { type: Boolean, default: true },
    active: { type: Boolean, default: true, index: true },
    lastEvent: { type: String, enum: ["price_drop", "restocked", ""], default: "" },
    triggeredAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

productAlertSchema.index({ customer: 1, productId: 1 }, { unique: true });

module.exports = mongoose.models.ProductAlert || mongoose.model("ProductAlert", productAlertSchema);
