const mongoose = require("mongoose");

const kycStepSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 40 },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    detail: { type: String, trim: true, maxlength: 200, default: "" },
    status: {
      type: String,
      enum: ["verified", "pending", "none"],
      default: "none",
    },
    /*
     * Only a reference to the uploaded document is stored — never the file
     * itself. The document number is kept encrypted so it cannot be read from
     * a database dump.
     */
    documentNumberEncrypted: {
      type: String,
      select: false,
      default: "",
    },
    documentUrl: { type: String, trim: true, maxlength: 500, default: "" },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
  },
  { _id: false },
);

const kycProfileSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["Not started", "In progress", "Verified", "Action needed"],
      default: "Not started",
    },
    level: { type: Number, default: 1, min: 0, max: 5 },
    maxLevel: { type: Number, default: 3, min: 1, max: 5 },
    steps: { type: [kycStepSchema], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports =
  mongoose.models.KycProfile || mongoose.model("KycProfile", kycProfileSchema);
