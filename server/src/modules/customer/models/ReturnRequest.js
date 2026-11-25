const mongoose = require("mongoose");

const returnEventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        "Requested",
        "Approved",
        "Rejected",
        "Cancelled",
        "Ready for Pickup",
        "Picked Up",
        "Arrived at Facility",
        "Left Facility",
        "Reached Destination Hub",
        "At Seller",
        "Replacement Preparing",
        "Replacement Shipped",
        "Out for Delivery",
        "Delivered",
        "Refunded",
      ],
      required: true,
    },
    source: {
      type: String,
      enum: ["system", "seller", "admin", "delivery_agent", "hub_staff"],
      default: "system",
    },
    clientEventId: { type: String, trim: true, maxlength: 64, default: "" },
    occurredAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 300, default: "" },
    location: {
      latitude: { type: Number, min: -90, max: 90, default: null },
      longitude: { type: Number, min: -180, max: 180, default: null },
      label: { type: String, trim: true, maxlength: 120, default: "" },
    },
  },
  { _id: false },
);

const timelineStepSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 60 },
    date: { type: String, trim: true, maxlength: 40, default: "Pending" },
    done: { type: Boolean, default: false },
  },
  { _id: false },
);

const returnRequestSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      default: null,
      index: true,
    },
    code: { type: String, required: true, trim: true, maxlength: 40 },
    type: {
      type: String,
      enum: ["Return", "Replacement"],
      default: "Return",
    },
    orderRef: { type: String, trim: true, maxlength: 40, default: "" },
    item: { type: String, required: true, trim: true, maxlength: 200 },
    reason: { type: String, required: true, trim: true, maxlength: 300 },
    status: {
      type: String,
      enum: [
        "Requested",
        "Approved",
        "In transit",
        "Refunded",
        "Rejected",
        "Cancelled",
        "Replacement Shipped",
        "Completed",
      ],
      default: "Requested",
    },
    trackingStatus: {
      type: String,
      enum: [
        "Requested",
        "Approved",
        "Rejected",
        "Cancelled",
        "Ready for Pickup",
        "Picked Up",
        "Arrived at Facility",
        "Left Facility",
        "Reached Destination Hub",
        "At Seller",
        "Replacement Preparing",
        "Replacement Shipped",
        "Out for Delivery",
        "Delivered",
        "Refunded",
      ],
      default: "Requested",
    },
    scanToken: { type: String, trim: true, maxlength: 128, default: "" },
    assignedDeliveryAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryAgent",
      default: null,
      index: true,
    },
    deliveryOtpEncrypted: { type: String, select: false, default: "" },
    deliveryOtpExpiresAt: { type: Date, default: null },
    deliveryOtpUsedAt: { type: Date, default: null },
    deliveryOtpFailures: { type: Number, min: 0, default: 0 },
    trackingEvents: { type: [returnEventSchema], default: [] },
    requestedAt: { type: Date, default: Date.now },
    refund: { type: Number, default: 0, min: 0 },
    timeline: { type: [timelineStepSchema], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

returnRequestSchema.index({ customer: 1, requestedAt: -1 });
returnRequestSchema.index({ customer: 1, code: 1 }, { unique: true });

module.exports =
  mongoose.models.ReturnRequest ||
  mongoose.model("ReturnRequest", returnRequestSchema);
