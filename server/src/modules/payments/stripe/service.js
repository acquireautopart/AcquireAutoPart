const Stripe = require("stripe");
const HttpError = require("../../../utils/HttpError");

let stripeClient;

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new HttpError(
      503,
      "Stripe payments are not configured on the server.",
    );
  }
  if (!stripeClient) stripeClient = new Stripe(secretKey);
  return stripeClient;
}

function getFrontendOrigin(requestOrigin) {
  const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!allowedOrigins.includes(requestOrigin)) {
    throw new HttpError(
      400,
      "The storefront origin is not configured for Stripe.",
    );
  }
  return requestOrigin;
}

function toMinorUnits(amount, currency) {
  const zeroDecimalCurrencies = new Set([
    "bif",
    "clp",
    "djf",
    "gnf",
    "jpy",
    "kmf",
    "krw",
    "mga",
    "pyg",
    "rwf",
    "ugx",
    "vnd",
    "vuv",
    "xaf",
    "xof",
    "xpf",
  ]);
  const exponent = zeroDecimalCurrencies.has(currency.toLowerCase()) ? 0 : 2;
  return Math.round(Number(amount) * 10 ** exponent);
}

async function getConnectedAccount(accountId) {
  return getStripe().accounts.retrieve(accountId);
}

async function getPaymentIntent(paymentIntentId) {
  return getStripe().paymentIntents.retrieve(paymentIntentId);
}

async function createSellerAccountLink(seller, requestOrigin) {
  const stripe = getStripe();
  const origin = getFrontendOrigin(requestOrigin);
  if (!seller.country) {
    throw new HttpError(
      400,
      "Set your seller country before connecting payouts.",
    );
  }

  let accountId = seller.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create(
      {
        type: "express",
        country: seller.country.toLowerCase(),
        email: seller.email,
        capabilities: { transfers: { requested: true } },
        metadata: { sellerId: seller._id.toString() },
      },
      { idempotencyKey: `seller-connect-${seller._id}` },
    );
    accountId = account.id;
    seller.stripeAccountId = accountId;
    await seller.save();
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/seller/payouts?stripe=refresh`,
    return_url: `${origin}/seller/payouts?stripe=return`,
    type: "account_onboarding",
    collection_options: { fields: "eventually_due" },
  });
  return { url: accountLink.url };
}

async function getSellerConnectStatus(seller) {
  if (!seller.stripeAccountId) {
    return {
      connected: false,
      ready: false,
      detailsSubmitted: false,
      payoutsEnabled: false,
      transfersEnabled: false,
      requirements: [],
    };
  }

  const account = await getConnectedAccount(seller.stripeAccountId);
  const requirements = account.requirements?.currently_due || [];
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const detailsSubmitted = Boolean(account.details_submitted);
  const transfersEnabled = account.capabilities?.transfers === "active";
  return {
    connected: true,
    ready: payoutsEnabled && detailsSubmitted && transfersEnabled,
    detailsSubmitted,
    payoutsEnabled,
    transfersEnabled,
    requirements,
  };
}

async function createCheckoutSession(order, requestOrigin) {
  const stripe = getStripe();
  const origin = getFrontendOrigin(requestOrigin);
  const currency = String(order.currency || "USD").toLowerCase();
  const amount = toMinorUnits(order.totals.total, currency);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new HttpError(
      400,
      "The order total is not valid for Stripe checkout.",
    );
  }

  return stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        ...(toMinorUnits(order.totals.subtotal - (order.appliedDiscount?.amount || 0) + order.totals.shipping + order.totals.tax, currency) > 0
          ? [{
              price_data: {
                currency,
                unit_amount: toMinorUnits(order.totals.subtotal - (order.appliedDiscount?.amount || 0) + order.totals.shipping + order.totals.tax, currency),
                product_data: {
                  name: `AcquireAuto order ${order.code}`,
                  description: `${order.items.length} marketplace item${order.items.length === 1 ? "" : "s"}; includes delivery and tax`,
                },
              },
              quantity: 1,
            }]
          : []),
        ...(toMinorUnits(order.totals.platformFee || 0, currency) > 0
          ? [{
              price_data: {
                currency,
                unit_amount: toMinorUnits(order.totals.platformFee, currency),
                product_data: { name: "AcquireAuto platform fee" },
              },
              quantity: 1,
            }]
          : []),
      ],
      success_url: `${origin}/profile/orders?payment=success&order=${encodeURIComponent(order.code)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?payment=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      metadata: {
        orderId: order._id.toString(),
        customerId: order.customer.toString(),
      },
      payment_intent_data: {
        transfer_group: order._id.toString(),
        metadata: {
          orderId: order._id.toString(),
          customerId: order.customer.toString(),
        },
      },
    },
    { idempotencyKey: `checkout-${order._id}` },
  );
}

async function createSellerTransfer({ order, transfer, chargeId }) {
  const stripe = getStripe();
  const currency = String(order.currency || "USD").toLowerCase();
  const payableAmount = Math.max(
    0,
    transfer.amount -
      (transfer.refundedAmount || 0) -
      (transfer.reversedAmount || 0),
  );
  const amount = toMinorUnits(payableAmount, currency);
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;

  return stripe.transfers.create(
    {
      amount,
      currency,
      destination: transfer.connectedAccountId,
      source_transaction: chargeId,
      transfer_group: order._id.toString(),
      metadata: {
        orderId: order._id.toString(),
        sellerId: transfer.seller.toString(),
      },
    },
    {
      idempotencyKey: `transfer-${order._id}-${transfer.seller}`,
    },
  );
}

async function transferSellerPayout(order, sellerId) {
  if (order.payment.method !== "Stripe" || !order.payment.paid) {
    throw new HttpError(
      409,
      "Seller payout is available after Stripe payment clears.",
    );
  }
  const transferPlan = order.payment.transfers.find(
    (item) => item.seller.toString() === sellerId.toString(),
  );
  if (!transferPlan || transferPlan.status === "transferred") return;

  const paymentIntent = await getPaymentIntent(
    order.payment.stripePaymentIntentId,
  );
  const chargeId =
    typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id;
  if (!chargeId) {
    throw new HttpError(
      409,
      "The Stripe charge is not ready for seller transfer.",
    );
  }

  const transfer = await createSellerTransfer({
    order,
    transfer: transferPlan,
    chargeId,
  });
  if (!transfer) return;
  transferPlan.transferId = transfer.id;
  transferPlan.status = "transferred";
  await order.save();
}

async function reverseSellerTransfer({ order, transfer, amount, reference }) {
  const stripe = getStripe();
  const currency = String(order.currency || "USD").toLowerCase();
  const reversalReference = String(reference || "full");
  const existing = (transfer.reversals || []).find(
    (reversal) => reversal.reference === reversalReference,
  );
  if (existing) return existing;

  const totalMinor = toMinorUnits(transfer.amount, currency);
  const reversedMinor = toMinorUnits(transfer.reversedAmount || 0, currency);
  const remainingMinor = Math.max(0, totalMinor - reversedMinor);
  const requestedMinor =
    amount === undefined
      ? remainingMinor
      : toMinorUnits(amount, currency);
  const minorAmount = Math.min(requestedMinor, remainingMinor);
  if (!Number.isSafeInteger(minorAmount) || minorAmount <= 0) {
    if (minorAmount === 0) return null;
    throw new HttpError(400, "The seller transfer reversal amount is invalid.");
  }
  const reversal = await stripe.transfers.createReversal(
    transfer.transferId,
    {
      amount: minorAmount,
      metadata: {
        orderId: order._id.toString(),
        sellerId: transfer.seller.toString(),
        reference: reversalReference,
      },
    },
    {
      idempotencyKey: `reverse-${order._id}-${transfer.seller}-${reversalReference}`,
    },
  );
  const amountMajor = minorAmount / toMinorUnits(1, currency);
  transfer.reversals.push({
    reference: reversalReference,
    amount: amountMajor,
    reversalId: reversal.id,
  });
  transfer.reversedAmount =
    Math.round(((transfer.reversedAmount || 0) + amountMajor) * 100) / 100;
  if (toMinorUnits(transfer.reversedAmount, currency) >= totalMinor) {
    transfer.status = "reversed";
  }
  await order.save();
  return reversal;
}

async function refundPaymentIntent(
  order,
  amount,
  reference,
  sellerId,
  sellerRefundAmount,
) {
  const stripe = getStripe();
  if (!order.payment.stripePaymentIntentId) {
    throw new HttpError(409, "The Stripe payment reference is missing.");
  }
  const currency = String(order.currency || "USD").toLowerCase();
  const refundReference = String(reference || "full");
  const existing = (order.payment.refunds || []).find(
    (refund) => refund.reference === refundReference,
  );
  if (existing) return existing;
  const remaining = Math.max(
    0,
    order.totals.total - (order.payment.refundedTotal || 0),
  );
  const refundAmount = Math.min(amount ?? remaining, remaining);
  const amountMinor = toMinorUnits(refundAmount, currency);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return null;
  const refund = {
    payment_intent: order.payment.stripePaymentIntentId,
    amount: amountMinor,
  };
  const result = await stripe.refunds.create(
    refund,
    {
      idempotencyKey: `refund-${order._id}-${refundReference}`,
    },
  );
  if (result.status === "failed") {
    throw new HttpError(502, "Stripe could not complete the refund.");
  }
  const amountMajor = amountMinor / toMinorUnits(1, currency);
  order.payment.refunds.push({
    reference: refundReference,
    seller: sellerId || null,
    amount: amountMajor,
    refundId: result.id,
  });
  order.payment.refundedTotal =
    Math.round(((order.payment.refundedTotal || 0) + amountMajor) * 100) / 100;
  if (sellerId) {
    const transfer = order.payment.transfers.find(
      (item) => item.seller.toString() === sellerId.toString(),
    );
    if (transfer) {
      transfer.refundedAmount =
        Math.round(
          ((transfer.refundedAmount || 0) +
            (sellerRefundAmount ?? amountMajor)) *
            100,
        ) / 100;
    }
  }
  if (order.payment.refundedTotal >= order.totals.total) {
    order.payment.paid = false;
    order.payment.status = "refunded";
  } else {
    order.payment.status = "partially_refunded";
  }
  await order.save();
  return result;
}

function constructWebhookEvent(payload, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new HttpError(
      503,
      "Stripe webhooks are not configured on the server.",
    );
  }
  const stripe = getStripe();
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    throw new HttpError(400, "Stripe webhook signature verification failed.");
  }
}

async function expireCheckoutSession(sessionId) {
  const stripe = getStripe();
  try {
    return await stripe.checkout.sessions.expire(sessionId);
  } catch (error) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "expired") return session;
    throw error;
  }
}

module.exports = {
  createCheckoutSession,
  createSellerAccountLink,
  createSellerTransfer,
  transferSellerPayout,
  constructWebhookEvent,
  expireCheckoutSession,
  getConnectedAccount,
  getPaymentIntent,
  getSellerConnectStatus,
  refundPaymentIntent,
  reverseSellerTransfer,
  toMinorUnits,
};
