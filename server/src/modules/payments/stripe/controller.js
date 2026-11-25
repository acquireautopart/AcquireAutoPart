const stripeService = require("./service");
const shopService = require("../../customer/shop/service");

async function webhook(req, res) {
  const event = stripeService.constructWebhookEvent(
    req.body,
    req.get("stripe-signature"),
  );

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await shopService.completeStripeCheckout(
        event.data.object,
        req.app.locals.resend,
      );
      break;
    case "checkout.session.expired":
      await shopService.expireStripeCheckout(event.data.object);
      break;
    case "checkout.session.async_payment_failed":
      await shopService.expireStripeCheckout(event.data.object, "failed");
      break;
    default:
      break;
  }

  return res.json({ received: true });
}

module.exports = { webhook };
