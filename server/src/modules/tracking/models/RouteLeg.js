const mongoose = require("mongoose");
const { ROUTE_MODES } = require("../constants");

const routeLegSchema = new mongoose.Schema(
  {
    fromHub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hub",
      required: true,
    },
    toHub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hub",
      required: true,
    },
    mode: { type: String, required: true, enum: ROUTE_MODES },
    avgHours: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, versionKey: false },
);

routeLegSchema.index({ fromHub: 1, toHub: 1 });

module.exports =
  mongoose.models.RouteLeg || mongoose.model("RouteLeg", routeLegSchema);
