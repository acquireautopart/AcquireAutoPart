const adminService = require("../services/adminService");
const { registerWebhook, listWebhooks } = require("../services/webhookService");

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** `from` filter: date-only values start at UTC midnight. */
function dayStart(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `to` filter: a date-only value covers that whole day. */
function dayEnd(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (DATE_ONLY.test(value)) date.setUTCHours(23, 59, 59, 999);
  return date;
}

async function listShipments(req, res) {
  const { page, limit, status, from, to } = req.validated.query;
  const result = await adminService.listShipments({
    page,
    limit,
    status,
    from: dayStart(from),
    to: dayEnd(to),
  });
  return res.json(result);
}

async function stuckShipments(req, res) {
  const { hours, limit } = req.validated.query;
  const shipments = await adminService.listStuckShipments({ hours, limit });
  return res.json({ hours, count: shipments.length, shipments });
}

async function hubLoad(_req, res) {
  const hubs = await adminService.hubLoad();
  return res.json({ hubs });
}

async function listNotifications(req, res) {
  const { limit } = req.validated.query;
  const notifications = await adminService.listNotifications({ limit });
  return res.json({ notifications });
}

async function getWebhooks(_req, res) {
  const webhooks = await listWebhooks();
  return res.json({
    webhooks: webhooks.map((webhook) => ({
      id: String(webhook._id),
      sellerId: webhook.sellerId,
      sellerName: webhook.sellerName,
      url: webhook.url,
      active: webhook.active,
      deliveries: (webhook.deliveries || []).slice(-5).reverse(),
      createdAt: webhook.createdAt,
    })),
  });
}

async function createWebhook(req, res) {
  const webhook = await registerWebhook(req.validated.body);
  return res.status(201).json({
    webhook: {
      id: String(webhook._id),
      sellerId: webhook.sellerId,
      sellerName: webhook.sellerName,
      url: webhook.url,
      active: webhook.active,
    },
  });
}

module.exports = {
  listShipments,
  stuckShipments,
  hubLoad,
  listNotifications,
  getWebhooks,
  createWebhook,
};
