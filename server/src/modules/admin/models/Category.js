const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 80, required: true },
    slug: { type: String, trim: true, lowercase: true, maxlength: 100, required: true, unique: true },
    image: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
      match: /^(?:https?:\/\/\S+)?$/i,
    },
    subcategories: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    markupPercent: { type: Number, min: 0, max: 100, default: 0 },
    active: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

categorySchema.index({ name: 1 }, { unique: true });

module.exports =
  mongoose.models.MarketplaceCategory ||
  mongoose.model("MarketplaceCategory", categorySchema);
