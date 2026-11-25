const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    reference: { type: String, required: true, trim: true, maxlength: 40 },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    orderRef: { type: String, trim: true, maxlength: 40, default: "" },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ["Open", "In progress", "Resolved"],
      default: "Open",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

supportTicketSchema.index({ customer: 1, createdAt: -1 });

module.exports =
  mongoose.models.SupportTicket ||
  mongoose.model("SupportTicket", supportTicketSchema);
