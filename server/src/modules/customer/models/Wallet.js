const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
    },
    balance: { type: Number, default: 0, min: 0 },
    pending: { type: Number, default: 0, min: 0 },
    cashbackEarned: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "USD", maxlength: 8 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports =
  mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);
