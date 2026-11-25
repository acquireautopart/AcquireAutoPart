const mongoose = require("mongoose");

/*
 * Single source of truth for every money movement on a customer account.
 * The wallet page and the ledger page both read from this collection.
 */
const ledgerEntrySchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    occurredAt: { type: Date, default: Date.now },
    reference: { type: String, trim: true, maxlength: 60, default: "" },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    channel: {
      type: String,
      enum: ["Wallet", "Card", "Bank transfer", "Promo", "Original payment"],
      default: "Wallet",
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, match: /^[A-Z]{3}$/, default: "USD" },
    balanceAfter: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Completed", "Processing", "Failed"],
      default: "Completed",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

ledgerEntrySchema.index({ customer: 1, occurredAt: -1 });

module.exports =
  mongoose.models.LedgerEntry ||
  mongoose.model("LedgerEntry", ledgerEntrySchema);
