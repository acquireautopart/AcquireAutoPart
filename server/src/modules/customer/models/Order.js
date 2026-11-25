const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, trim: true, maxlength: 64 },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    brand: { type: String, trim: true, maxlength: 80, default: "" },
    category: { type: String, trim: true, maxlength: 80, default: "" },
    subcategory: { type: String, trim: true, maxlength: 80, default: "" },
    variant: { type: String, trim: true, maxlength: 120, default: "" },
    variantId: { type: String, trim: true, maxlength: 64, default: "" },
    price: { type: Number, required: true, min: 0 },
    sellerPrice: { type: Number, min: 0 },
    categoryMarkupAmount: { type: Number, min: 0, default: 0 },
    currency: { type: String, match: /^[A-Z]{3}$/, default: "USD" },
    oldPrice: { type: Number, default: null, min: 0 },
    imageUrl: { type: String, trim: true, maxlength: 500, default: "" },
    quantity: { type: Number, required: true, min: 1, max: 99 },
  },
  { _id: false },
);

/* The delivery address is copied onto the order so later edits never change history. */
const orderAddressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 40, default: "Home" },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    line: { type: String, required: true, trim: true, maxlength: 300 },
    city: { type: String, trim: true, maxlength: 120, default: "" },
    region: { type: String, trim: true, maxlength: 120, default: "" },
    postalCode: { type: String, trim: true, maxlength: 20, default: "" },
    country: { type: String, trim: true, maxlength: 80, default: "" },
    phone: { type: String, trim: true, maxlength: 24, default: "" },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 40,
    },
    items: { type: [orderItemSchema], default: [] },
    currency: { type: String, match: /^[A-Z]{3}$/, default: "USD" },
    address: { type: orderAddressSchema, required: true },
    payment: {
      method: {
        type: String,
        enum: ["Wallet", "Cash on delivery", "Card", "Stripe"],
        required: true,
      },
      brand: { type: String, trim: true, maxlength: 40, default: "" },
      last4: { type: String, trim: true, maxlength: 4, default: "" },
      label: { type: String, trim: true, maxlength: 80, default: "" },
      paid: { type: Boolean, default: false },
      status: {
        type: String,
        enum: [
          "unpaid",
          "pending",
          "paid",
          "expired",
          "failed",
          "partially_refunded",
          "refunded",
        ],
        default: "unpaid",
      },
      stripeSessionId: { type: String, trim: true, default: "" },
      stripePaymentIntentId: { type: String, trim: true, default: "" },
      transfers: [
        {
          _id: false,
          seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seller",
            required: true,
          },
          connectedAccountId: { type: String, trim: true, required: true },
          amount: { type: Number, min: 0, required: true },
          transferId: { type: String, trim: true, default: "" },
          reversedAmount: { type: Number, min: 0, default: 0 },
          refundedAmount: { type: Number, min: 0, default: 0 },
          reversals: [
            {
              _id: false,
              reference: { type: String, trim: true, required: true },
              amount: { type: Number, min: 0, required: true },
              reversalId: { type: String, trim: true, required: true },
            },
          ],
          status: {
            type: String,
            enum: ["pending", "transferred", "reversed"],
            default: "pending",
          },
        },
      ],
      refunds: [
        {
          _id: false,
          reference: { type: String, trim: true, required: true },
          seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seller",
            default: null,
          },
          amount: { type: Number, min: 0, required: true },
          refundId: { type: String, trim: true, required: true },
        },
      ],
      refundedTotal: { type: Number, min: 0, default: 0 },
      platformFeeRefundedTotal: { type: Number, min: 0, default: 0 },
      categoryMarkupRefundedTotal: { type: Number, min: 0, default: 0 },
      sellerRefundedTotal: { type: Number, min: 0, default: 0 },
      codSettlement: {
        status: { type: String, enum: ["pending", "collected"], default: "pending" },
        collectedAmount: { type: Number, min: 0, default: 0 },
        carrierFee: { type: Number, min: 0, default: 0 },
        collectedAt: { type: Date, default: null },
        remittanceReference: { type: String, trim: true, maxlength: 120, default: "" },
      },
    },
    totals: {
      subtotal: { type: Number, required: true, min: 0 },
      savings: { type: Number, default: 0, min: 0 },
      shipping: { type: Number, default: 0, min: 0 },
      tax: { type: Number, default: 0, min: 0 },
      platformFee: { type: Number, default: 0, min: 0 },
      categoryMarkup: { type: Number, default: 0, min: 0 },
      total: { type: Number, required: true, min: 0 },
    },
    appliedDiscount: {
      code: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 32,
        default: "",
      },
      seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Seller",
        default: null,
      },
      amount: { type: Number, min: 0, default: 0 },
    },
    status: {
      type: String,
      enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Processing",
      index: true,
    },
    sellerFulfillment: {
      type: String,
      enum: [
        "New",
        "Packed",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Return requested",
      ],
      default: "New",
      index: true,
    },
    sellerTracking: { type: String, trim: true, maxlength: 100, default: "" },
    sellerFulfillments: [
      {
        seller: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Seller",
          required: true,
        },
        status: {
          type: String,
          enum: ["New", "Packed", "Shipped", "Delivered", "Cancelled"],
          default: "New",
        },
        trackingStatus: {
          type: String,
          enum: [
            "Order Confirmed",
            "Packed",
            "Shipped",
            "Ready for Pickup",
            "Picked Up",
            "Arrived at Origin Hub",
            "In Transit",
            "Arrived at Facility",
            "Left Facility",
            "Reached Destination Hub",
            "Out for Delivery",
            "Delivery Attempted",
            "Delivered",
            "Cancelled",
            "RTO Initiated",
            "RTO In Transit",
            "RTO Delivered",
          ],
          default: "Order Confirmed",
        },
        scanToken: { type: String, trim: true, maxlength: 128, default: "" },
        carrier: { type: String, trim: true, maxlength: 80, default: "" },
        tracking: { type: String, trim: true, maxlength: 100, default: "" },
        trackingUrl: { type: String, trim: true, maxlength: 500, default: "" },
        assignedDeliveryAgent: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "DeliveryAgent",
          default: null,
        },
        deliveryOtpEncrypted: {
          type: String,
          select: false,
          default: "",
        },
        deliveryOtpExpiresAt: { type: Date, default: null },
        deliveryOtpUsedAt: { type: Date, default: null },
        deliveryOtpFailures: { type: Number, min: 0, default: 0 },
        deliveryAttempts: { type: Number, min: 0, default: 0 },
        codCollectedAmount: { type: Number, min: 0, default: 0 },
        codCollectedAt: { type: Date, default: null },
        codCollectionMethod: {
          type: String,
          enum: ["Cash", "UPI", ""],
          default: "",
        },
        commissionableAmount: { type: Number, min: 0 },
        platformFeeRate: { type: Number, min: 0, max: 100 },
        platformFee: { type: Number, min: 0 },
        platformFeePayer: { type: String, enum: ["buyer", "seller"] },
        events: [
          {
            _id: false,
            status: {
              type: String,
              enum: [
                "New",
                "Packed",
                "Shipped",
                "Delivered",
                "Cancelled",
                "Order Confirmed",
                "Ready for Pickup",
                "Picked Up",
                "Arrived at Origin Hub",
                "In Transit",
                "Arrived at Facility",
                "Left Facility",
                "Reached Destination Hub",
                "Out for Delivery",
                "Delivery Attempted",
                "RTO Initiated",
                "RTO In Transit",
                "RTO Delivered",
              ],
              required: true,
            },
            source: {
              type: String,
              enum: [
                "system",
                "seller_scan",
                "seller_manual",
                "carrier",
                "delivery_agent",
                "hub_staff",
                "admin",
                "carrier_webhook",
              ],
              default: "system",
            },
            clientEventId: { type: String, trim: true, maxlength: 64, default: "" },
            occurredAt: { type: Date, default: Date.now },
            note: { type: String, trim: true, maxlength: 300, default: "" },
            attemptReason: {
              type: String,
              enum: [
                "Customer unavailable",
                "Address issue",
                "Customer refused",
                "Phone unreachable",
                "",
              ],
              default: "",
            },
            location: {
              latitude: { type: Number, min: -90, max: 90, default: null },
              longitude: { type: Number, min: -180, max: 180, default: null },
              label: { type: String, trim: true, maxlength: 120, default: "" },
            },
          },
        ],
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    placedAt: { type: Date, default: Date.now },
    cancelledAt: { type: Date, default: null },
    timeline: [
      {
        _id: false,
        label: { type: String, required: true },
        date: { type: String, default: "Pending" },
        done: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

orderSchema.index({ customer: 1, placedAt: -1 });
orderSchema.index({ "payment.stripeSessionId": 1 }, { sparse: true });
orderSchema.index({ "sellerFulfillments.scanToken": 1 }, { sparse: true });
orderSchema.index({ "sellerFulfillments.assignedDeliveryAgent": 1 });

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
