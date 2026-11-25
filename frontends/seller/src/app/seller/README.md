# Seller Hub

Open `/seller` to sign in or create a seller account. The workspace is built with the project's Tailwind CSS and lucide-react conventions. It supports the saved light/dark theme and responsive mobile navigation.

The dashboard, catalogue, inventory, orders, returns, payouts, analytics, discounts, customer list, and store settings are backed by the Express seller API. Products are seller-owned MongoDB records. Creating a product requires a unique SKU, name, category, price and stock; images are supplied as image URLs. Each variant can have its own SKU, price, and stock. Enter vehicle fitment such as `2018–2024 Honda Civic` for an active listing to appear in that vehicle's storefront search.

## Frontend file structure

- `../../features/seller/shared/components/SellerWorkspace.jsx` — shared seller session and workspace shell.
- `../../features/seller/shared/components/SellerSidebar.jsx` — seller navigation and active page state.
- `../../features/seller/<feature>/pages/` — dashboard, catalogue, order, inventory, return, payout,
  analytics, discount, customer, and settings page UI.
- `../../features/seller/<feature>/components/` — feature-specific widgets and forms.
- `../../features/seller/shared/components/` — seller-only UI primitives, authentication, and helpers.
- `../../features/seller/lib/sellerApi.js` — seller API request methods used by feature pages.
- `../../app/seller/` — thin Next.js route entry points.

Seller sessions use their own HTTP-only cookie and are separate from customer sessions. Configure `client/.env.local` and `server/.env` as described in the server README. Seller payout figures are estimates calculated from paid orders; actual transfers and fee reconciliation need a payment provider integration.
