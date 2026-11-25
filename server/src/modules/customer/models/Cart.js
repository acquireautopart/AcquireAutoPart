const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, trim: true, maxlength: 64 },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    brand: { type: String, trim: true, maxlength: 80, default: "" },
    category: { type: String, trim: true, maxlength: 80, default: "" },
    subcategory: { type: String, trim: true, maxlength: 80, default: "" },
    variant: { type: String, trim: true, maxlength: 120, default: "" },
    variantId: { type: String, trim: true, maxlength: 64, default: "" },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, match: /^[A-Z]{3}$/, default: "USD" },
    oldPrice: { type: Number, default: null, min: 0 },
    imageUrl: { type: String, trim: true, maxlength: 500, default: "" },
    quantity: { type: Number, required: true, min: 1, max: 99, default: 1 },
  },
  { _id: false },
);

/*
 * One cart per customer. Items are embedded so quantity changes and the
 * guest-cart merge stay atomic without extra collections.
 */
const cartSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [cartItemSchema], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.models.Cart || mongoose.model("Cart", cartSchema);
