const Webhook = require("../models/Webhook");
const {
  WEBHOOK_DELIVERY_HISTORY,
  WEBHOOK_RETRY_COUNT,
  WEBHOOK_RETRY_DELAY_MS,
  WEBHOOK_TIMEOUT_MS,
} = require("../constants");

function normalizeId(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return value._id ? value._id.toString() : value.toString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The body a seller endpoint receives for one scan event. */
function buildPayload({ shipment, event, hub }) {
  return {
    awb: shipment.awb,
    eventCode: event.eventCode,
    hub: hub?.name || null,
    hubCode: hub?.code || null,
    hubCity: hub?.city || null,
    message: event.message,
    time: new Date(event.scannedAt || Date.now()).toISOString(),
  };
}

/**
 * POSTs `payload` to `url`. One attempt is made, and every failure is retried
 * WEBHOOK_RETRY_COUNT more times with WEBHOOK_RETRY_DELAY_MS between tries.
 * The last attempt's outcome is returned so it can be stored.
 */
async function postWithRetries(url, payload) {
  const attemptsAllowed = WEBHOOK_RETRY_COUNT + 1;
  let status = 0;
  let error = "";

  for (let attempt = 1; attempt <= attemptsAllowed; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      status = response.status;
      if (response.ok) {
        return { ok: true, status, error: "", attempts: attempt };
      }
      error = `HTTP ${response.status}`;
    } catch (requestError) {
      status = 0;
      error = requestError.message;
    }

    if (attempt < attemptsAllowed) await sleep(WEBHOOK_RETRY_DELAY_MS);
  }

  return { ok: false, status, error, attempts: attemptsAllowed };
}

/** Delivers one event to one webhook and stores the result on the webhook. */
async function deliverEvent({ webhook, shipment, event, hub }) {
  const payload = buildPayload({ shipment, event, hub });
  const outcome = await postWithRetries(webhook.url, payload);

  await Webhook.updateOne(
    { _id: webhook._id },
    {
      $push: {
        deliveries: {
          $each: [
            {
              awb: payload.awb,
              eventCode: payload.eventCode,
              ok: outcome.ok,
              status: outcome.status,
              error: outcome.error,
              attempts: outcome.attempts,
              at: new Date(),
            },
          ],
          $slice: -WEBHOOK_DELIVERY_HISTORY,
        },
      },
    },
  );

  return { url: webhook.url, eventCode: payload.eventCode, ...outcome };
}

/**
 * POSTs each event to every active seller webhook.
 *
 * `hubById` maps a hub id to the hub document, so the payload can name the hub
 * without an extra query per event.
 */
async function dispatchScanEvents({ shipment, events, hubById }) {
  const webhooks = await Webhook.find({ active: true }).lean();
  if (!webhooks.length) return [];

  const results = [];
  for (const event of events) {
    const hub = hubById?.get(normalizeId(event.hub)) || null;
    for (const webhook of webhooks) {
      results.push(await deliverEvent({ webhook, shipment, event, hub }));
    }
  }
  return results;
}

/** Registers (or re-activates) a seller's webhook URL. */
async function registerWebhook({ sellerId, sellerName, url }) {
  const updated = await Webhook.findOneAndUpdate(
    { sellerId: String(sellerId).trim(), url: String(url).trim() },
    { $set: { active: true, ...(sellerName ? { sellerName } : {}) } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  return updated;
}

async function listWebhooks() {
  return Webhook.find().sort({ createdAt: -1 }).lean();
}

module.exports = {
  buildPayload,
  postWithRetries,
  dispatchScanEvents,
  registerWebhook,
  listWebhooks,
};
