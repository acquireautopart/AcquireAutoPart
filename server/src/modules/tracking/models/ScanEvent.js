const mongoose = require("mongoose");

const APPEND_ONLY_MESSAGE =
  "ScanEvent documents are append-only and cannot be changed or deleted.";

const scanEventSchema = new mongoose.Schema(
  {
    shipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
      required: true,
      index: true,
    },
    eventCode: { type: String, required: true, trim: true, maxlength: 40 },
    hub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hub",
      default: null,
    },
    message: { type: String, required: true, trim: true, maxlength: 200 },
    scannedBy: { type: String, trim: true, default: "", maxlength: 120 },
    scannedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

scanEventSchema.index({ shipment: 1, scannedAt: 1 });

/* Append-only: every update or delete path is blocked. */
const BLOCKED_QUERY_OPERATIONS = [
  "updateOne",
  "updateMany",
  "replaceOne",
  "findOneAndUpdate",
  "findOneAndReplace",
  "findOneAndDelete",
  "deleteOne",
  "deleteMany",
];

function blockMutation() {
  throw new Error(APPEND_ONLY_MESSAGE);
}

for (const operation of BLOCKED_QUERY_OPERATIONS) {
  scanEventSchema.pre(operation, blockMutation);
}

/* `insertMany`/`create` still work; saving an already-stored event does not. */
scanEventSchema.pre("save", function blockExistingDocumentSave() {
  if (!this.isNew) throw new Error(APPEND_ONLY_MESSAGE);
});

module.exports =
  mongoose.models.ScanEvent || mongoose.model("ScanEvent", scanEventSchema);
