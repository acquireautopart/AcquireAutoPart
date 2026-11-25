const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerProduct",
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    title: { type: String, trim: true, maxlength: 100, default: "" },
    comment: { type: String, trim: true, maxlength: 2000, default: "" },
  },
  { timestamps: true, versionKey: false },
);

reviewSchema.index({ product: 1, customer: 1 }, { unique: true });

module.exports =
  mongoose.models.ProductReview ||
  mongoose.model("ProductReview", reviewSchema);
