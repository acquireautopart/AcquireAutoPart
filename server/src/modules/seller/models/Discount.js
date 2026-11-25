const mongoose = require("mongoose");
const discountSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 32,
      required: true,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    value: { type: Number, min: 0, required: true },
    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date, default: null },
    usageLimit: { type: Number, min: 0, default: 0 },
    uses: { type: Number, min: 0, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);
discountSchema.index({ seller: 1, code: 1 }, { unique: true });
module.exports =
  mongoose.models.SellerDiscount ||
  mongoose.model("SellerDiscount", discountSchema);
