const mongoose = require("mongoose");

const wishlistItemSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    productId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    brand: { type: String, trim: true, maxlength: 80, default: "" },
    category: { type: String, trim: true, maxlength: 80, default: "" },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, match: /^[A-Z]{3}$/, default: "USD" },
    oldPrice: { type: Number, default: null, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    stock: { type: String, trim: true, maxlength: 60, default: "In stock" },
    imageUrl: { type: String, trim: true, maxlength: 500, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// A customer can save the same product only once.
wishlistItemSchema.index({ customer: 1, productId: 1 }, { unique: true });

module.exports =
  mongoose.models.WishlistItem ||
  mongoose.model("WishlistItem", wishlistItemSchema);
