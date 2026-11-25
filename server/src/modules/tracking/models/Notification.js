const mongoose = require("mongoose");
const {
  EVENT_CODES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUS,
  NOTIFICATION_STATUSES,
} = require("../constants");

/**
 * The SMS/email that a shipment milestone would send to the customer. Nothing
 * leaves the server yet: the rendered text is stored here so the message can be
 * inspected and, later, handed to a real gateway.
 */
const notificationSchema = new mongoose.Schema(
  {
    shipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
      required: true,
      index: true,
    },
    awb: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 32,
    },
    eventCode: {
      type: String,
      required: true,
      trim: true,
      enum: EVENT_CODES,
    },
    channel: {
      type: String,
      required: true,
      enum: NOTIFICATION_CHANNELS,
    },
    /* Would be the customer's phone or email; shipments do not carry contact
       details in this demo, so real deliveries leave this empty. */
    recipient: { type: String, trim: true, default: "", maxlength: 160 },
    /* Email subject; empty for SMS. */
    subject: { type: String, trim: true, default: "", maxlength: 160 },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: NOTIFICATION_STATUSES,
      default: NOTIFICATION_STATUS.QUEUED,
    },
  },
  { timestamps: true, versionKey: false },
);

notificationSchema.index({ shipment: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
