# Seller Hub

Open `/seller` to sign in or create a seller account. The workspace supports the saved light/dark
theme and responsive mobile navigation.

The dashboard, catalogue, inventory, orders, returns, payouts, analytics, discounts, customers, and
store settings are backed by the Express seller API. Products are seller-owned MongoDB records.
New stores begin in the admin review queue and must be approved before their active parts are
visible in marketplace search.

## Frontend structure

- `../seller/` — thin Next.js route entry points.
- `../../features/seller/<feature>/pages/` — page UI for each seller domain.
- `../../features/seller/<feature>/components/` — feature-specific widgets and forms.
- `../../features/seller/shared/components/` — workspace shell, sidebar, sign-in, and seller UI.
- `../../features/seller/lib/sellerApi.js` — seller API request methods.

Seller sessions use their own HTTP-only cookie and are separate from customer sessions. Configure
`client/.env.local` and `server/.env` as described in the server README. Seller payout figures are
estimates calculated from paid orders; actual transfers and fee reconciliation need a payment
provider integration.
