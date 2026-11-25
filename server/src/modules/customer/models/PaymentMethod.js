const mongoose = require("mongoose");

/*
 * PCI-safe payment method metadata.
 * The full card number (PAN) and CVV are never stored — only the brand, the
 * last four digits, the expiry and the cardholder name that the customer sees
 * back in their own account.
 */
const paymentMethodSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    brand: {
      type: String,
      enum: ["Visa", "Mastercard", "Amex", "RuPay", "PayPal", "Other"],
      default: "Other",
    },
    type: {
      type: String,
      enum: ["Credit card", "Debit card", "Wallet"],
      default: "Credit card",
    },
    last4: {
      type: String,
      required: true,
      trim: true,
      match: /^[A-Za-z0-9]{2,4}$/,
    },
    holder: { type: String, trim: true, maxlength: 120, default: "" },
    expiresMonth: { type: Number, min: 1, max: 12, default: null },
    expiresYear: { type: Number, min: 2000, max: 2100, default: null },
    /* Non-reversible fingerprint used only to block duplicate cards. */
    fingerprint: { type: String, trim: true, maxlength: 128, default: "" },
    isDefault: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

paymentMethodSchema.index({ customer: 1, createdAt: -1 });
paymentMethodSchema.index(
  { customer: 1, fingerprint: 1 },
  { unique: true, sparse: true },
);

module.exports =
  mongoose.models.PaymentMethod ||
  mongoose.model("PaymentMethod", paymentMethodSchema);
