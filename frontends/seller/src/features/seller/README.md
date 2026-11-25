# Seller hub

Seller code is organized by domain. Each feature keeps its page UI and components together:
`dashboard/`, `products/`, `inventory/`, `orders/`, `returns/`, `payouts/`, `analytics/`,
`discounts/`, `customers/`, and `settings/`.

Seller-only shell, sidebar, sign-in, and UI primitives live under `shared/components/`; the API
client is in `lib/`. Next.js route entry points remain in `../../app/seller/` and render the
matching feature through the shared workspace. Keep seller data and operations backed by the
seller API and scoped to the authenticated seller.
