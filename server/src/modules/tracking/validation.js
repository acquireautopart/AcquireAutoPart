const { z } = require("zod");
const HttpError = require("../../utils/HttpError");
const {
  EVENT_CODES,
  PAYMENT_TYPES,
  SCAN_TYPES,
  STUCK_AFTER_HOURS,
} = require("./constants");

const createShipmentSchema = z.object({
  orderId: z.string().trim().min(1).max(80),
  originCity: z.string().trim().min(1).max(80),
  destinationPincode: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, "must be a 4-10 digit pincode"),
  destinationCity: z.string().trim().min(1).max(80),
  paymentType: z.enum(PAYMENT_TYPES),
  originHubCode: z.string().trim().min(1).max(24).optional(),
});

const recordScanSchema = z.object({
  awb: z.string().trim().min(4).max(32),
  hubCode: z.string().trim().min(1).max(24),
  scanType: z.enum(SCAN_TYPES),
  scannedBy: z.string().trim().max(120).optional(),
  scannedAt: z
    .string()
    .trim()
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      "must be a valid date (for example 2026-01-01T10:30:00.000Z)",
    )
    .optional(),
});

const routePreviewQuerySchema = z.object({
  origin: z.string().trim().min(1).max(24),
  pincode: z.string().trim().min(4).max(12),
});

const assignDeliverySchema = z.object({
  awb: z.string().trim().min(4).max(32),
  deliveryBoyId: z.string().trim().min(1).max(120),
});

const completeDeliverySchema = z.object({
  awb: z.string().trim().min(4).max(32),
  otp: z.string().trim().min(1).max(12),
  codCollected: z.boolean().optional(),
  scannedBy: z.string().trim().max(120).optional(),
});

const failDeliverySchema = z.object({
  awb: z.string().trim().min(4).max(32),
  reason: z.string().trim().min(1).max(200),
  scannedBy: z.string().trim().max(120).optional(),
});

/** A date the admin filters can use, e.g. 2026-11-16. */
const dayFilter = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => !Number.isNaN(new Date(value).getTime()),
    "must be a valid date (for example 2026-11-16)",
  );

const adminShipmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(EVENT_CODES).optional(),
  from: dayFilter.optional(),
  to: dayFilter.optional(),
});

const adminStuckQuerySchema = z.object({
  hours: z.coerce.number().positive().max(720).default(STUCK_AFTER_HOURS),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const adminListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const registerWebhookSchema = z.object({
  sellerId: z.string().trim().min(1).max(80),
  sellerName: z.string().trim().max(120).optional(),
  url: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine((value) => /^https?:\/\//i.test(value), "must be an http(s) URL"),
});

function firstIssueMessage(error) {
  const issue = error.issues[0];
  if (!issue) return "The request payload is invalid.";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

function validate(source, schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] || {});
    if (!result.success) {
      return next(new HttpError(400, firstIssueMessage(result.error)));
    }
    req.validated = { ...(req.validated || {}), [source]: result.data };
    return next();
  };
}

function validateBody(schema) {
  return validate("body", schema);
}

function validateQuery(schema) {
  return validate("query", schema);
}

module.exports = {
  createShipmentSchema,
  recordScanSchema,
  routePreviewQuerySchema,
  assignDeliverySchema,
  completeDeliverySchema,
  failDeliverySchema,
  adminShipmentsQuerySchema,
  adminStuckQuerySchema,
  adminListQuerySchema,
  registerWebhookSchema,
  validateBody,
  validateQuery,
};
