# Stripe Connect payments

The storefront creates Stripe-hosted Checkout sessions for card payments. Set these variables in
`server/.env` (never in a client-side environment file):

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
```

Configure a Stripe webhook to call `POST /api/payments/stripe/webhook` and subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

The webhook endpoint verifies Stripe signatures against the raw request body. For local testing,
forward Stripe CLI events to `http://localhost:5000/api/payments/stripe/webhook` and use the CLI
webhook signing secret in `STRIPE_WEBHOOK_SECRET`.

Sellers connect their own Stripe accounts from **Seller → Payments & payouts**. Orders require an
active seller transfer capability before Stripe checkout. Successful checkout records payment;
the seller's full discounted product share is transferred after that seller marks the order
delivered. The configured marketplace fee rate is added to the customer's checkout total as a
separate `AcquireAuto platform fee` line and remains in the platform balance. Stripe processing
fees are charged separately and can reduce the platform's net fee revenue. Cancelling a paid order
reverses recorded seller transfers and refunds the remaining Stripe payment. Seller-approved
returns create item-level refunds that include the relevant buyer-paid platform fee and reverse the
seller's corresponding share when a transfer has already been made.

Cash on delivery is collected by the courier. Configure the courier to remit the customer amount
to the platform, or record the net remittance together with any COD fee withheld. An admin must
confirm the actual COD reconciliation under **Payments & payouts**;
this records receipt and makes a paid COD order eligible for seller payout reporting, but does not
initiate a bank transfer. Courier integration and automatic COD reconciliation are not included.

See [`docs/PAYMENT-FLOW.md`](../../../../../docs/PAYMENT-FLOW.md) for the complete customer, seller,
platform, refund, COD, and setup flow.

Stripe account approval and cross-border transfer availability are controlled by Stripe. Verify
the platform and every seller country in the Stripe dashboard before enabling live keys. Never
commit API keys or ask users to paste them into chat.
