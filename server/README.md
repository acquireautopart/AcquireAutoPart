# Customer authentication API

This Express API uses MongoDB for customer accounts and stores signed, seven-day sessions in an
HTTP-only cookie. Passwords are hashed with bcrypt; they are never returned by the API.

## Setup

1. Install a local MongoDB server or create a MongoDB Atlas database.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and a private `JWT_SECRET` of at least
   32 characters. In production, set `FRONTEND_URL` to the exact customer storefront origin(s),
   separated by commas. Set `TRUST_PROXY_HOPS` to the number of trusted reverse proxies in front
   of the API; keep it at `0` when directly exposed.
3. From this folder, run `npm install`, then `npm run dev`. The API listens on port `5000`.
4. Copy each `frontends/<storefront|seller|admin|delivery>/.env.example` to that app's `.env.local`. Set
   `NEXT_PUBLIC_API_URL` to this API base URL, for example `http://localhost:5000/api`. Restart
   each Next.js dev server after changing it.

For seller identity uploads, configure a private S3-compatible bucket with `KYC_S3_BUCKET` and
`AWS_REGION`; provide credentials through an instance role or both `AWS_ACCESS_KEY_ID` and
`AWS_SECRET_ACCESS_KEY`. The optional `S3_ENDPOINT` and `S3_FORCE_PATH_STYLE` settings support
S3-compatible storage. Do not make the bucket public. Admin review links expire after five minutes.
If the upload API returns `503`, `KYC_S3_BUCKET` is missing or blank in `server/.env`, or the API
was not restarted after the setting changed. Add the bucket name and storage credentials locally,
then restart the API. Never paste AWS credentials into chat or commit them.
Country ID document labels are suggestions for manual review, not automatic identity or legal
validation.

The API logs whether it connected to MongoDB and exits with a clear error if the database or
required signing secret is unavailable.

## Endpoints

- `POST /api/auth/register` — create a customer account and start a session. Body: `{ "name",
"email", "password" }`. The server assigns the `customer` role; client-supplied roles are ignored.
- `POST /api/auth/login` — sign in. Body: `{ "email", "password" }`. The response includes the
  account role.
- `GET /api/auth/me` — return the signed-in customer, including their role.
- `POST /api/auth/logout` — clear the session cookie.
- `GET /api/health` — API health check.
- `GET /api/market/context` — detected/selected country, currency, identity document types, and
  exchange rates. Detection uses trusted `x-vercel-ip-country` or `cf-ipcountry` proxy headers;
  without those or a selected country, the API defaults to US.
- `GET /api/catalog/products?country=US` — active inventory from approved sellers in that country.
  Frankfurter exchange rates are used by the storefront for display conversions where available;
  payment settlement and currency conversion are not provided by this demo.

Authentication requests are rate-limited. Browser requests must include credentials; CORS origins
are restricted to the configured storefront origins.

## Delivery operations

The admin provisions delivery-agent accounts and assigns shipped seller packages at
`/api/admin/delivery`. Agents sign in through the standalone `frontends/delivery` app, scan their
package QR label, and submit forward-only pickup/hub/transit/delivery events. Delivery confirmation
requires the short-lived customer OTP; COD packages also require the exact allocated collection
amount and payment method. Three failed attempts are recorded before RTO can be initiated. OTPs
are encrypted at rest and shown only on the owning customer's authenticated order details while
they are active. GPS coordinates are optional and are only recorded when the agent explicitly
enables location capture.

Carrier and AWB details are currently entered during admin assignment; carrier webhook/API
automation is not enabled until a provider and credentials are configured. The admin role controls
agent creation, activation, shipment assignment, and audit records. Delivery-agent sessions use a
separate HTTP-only cookie and cannot access seller or admin endpoints.

- `GET /api/admin/delivery/agents`, `POST /api/admin/delivery/agents`,
  `PATCH /api/admin/delivery/agents/:id` — create/list/activate delivery accounts.
- `GET /api/admin/delivery/shipments`,
  `POST /api/admin/delivery/shipments/:orderId/assign` — view packages and assign a shipped package.
- `POST /api/delivery/auth/login`, `GET /api/delivery/auth/me`,
  `PATCH /api/delivery/auth/password`, `POST /api/delivery/auth/logout` — delivery staff sessions.
- `GET /api/delivery/tasks`,
  `POST /api/delivery/tasks/:orderId/events` — assigned tasks and scanned tracking events.

Seller authentication and seller-owned catalogue/operations routes are enabled under `/api/seller`.
Seller registration requires a country and identity document type/number; the seller must upload
identity evidence and receive admin approval before their products appear in the public catalog.
Admin verification endpoints are under `/api/admin/sellers/:id/verification`.

Sellers can import up to 500 products per CSV, XLSX, or JSON file from the Products page. The
import first validates and previews every row; all rows must pass before any are written. The
insert is performed in a MongoDB transaction, so the database must support transactions (MongoDB
Atlas or a replica set). Required fields are `sku`, `name`, `category`, `price`, and `images`.
CSV/Excel images are URL strings separated by `|`; JSON images are arrays of URL strings. Each
product needs 1–7 HTTP(S) image URLs. Optional fields are `brand`, `fitment`, `description`,
`compareAtPrice`, `stock`, `lowStockThreshold`, and `status` (`Draft`, `Active`, or `Archived`);
`variants` is an optional array of `{ "name", "sku", "price", "stock" }` objects (in CSV/XLSX,
place the JSON array in the cell). Status defaults to `Draft`. Column/property names must match the
template exactly. A duplicate SKU or any invalid value rejects the entire batch. Download the CSV
or JSON templates from the import dialog.

Seller password recovery uses a one-time email link sent with Resend. Configure `RESEND_API_KEY`
and `RESEND_FROM` in `server/.env`; `RESEND_FROM` must use a sending domain verified in your
Resend account. Keep the API key private and restart the API after changing the settings. Reset
links expire after 30 minutes and can only be used once. `POST /api/seller/auth/forgot-password`
accepts `{ "email" }`;
`POST /api/seller/auth/reset-password` accepts `{ "token", "password" }`. Resetting a password
invalidates existing seller sessions. The forgot-password UI is available from the seller sign-in
page.

## Cloudinary product images

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `server/.env`
and restart the API. Keep the API secret on the server only. Sellers can then upload JPEG, PNG,
and WebP product images (up to 5 MB each) from the product editor; the returned Cloudinary URL is
saved with the product. Every new product must include 1–7 valid HTTP(S) image URLs.

To move the existing storefront image references and files in `frontends/storefront/public` into Cloudinary,
run `npm run images:migrate` from this folder after configuring those three values and `MONGODB_URI`.
The script uploads the image assets, rewrites source references, and migrates image URLs in seller
products, carts, orders, wishlists, and saved vehicles. Review the resulting source changes before
committing them, and back up MongoDB before running the migration. Private KYC documents are
intentionally not migrated; they remain in private S3 storage.

New order notifications are stored per seller in MongoDB when an order is placed (or when
Stripe confirms payment). Sellers can view and acknowledge them from the bell in Seller Hub.
When `RESEND_API_KEY` and `RESEND_FROM` are configured, an itemized order email is also sent to
each seller whose order-email preference is enabled. Stripe orders are emailed after payment is
confirmed. Email delivery failures are logged and do not undo a successful checkout.

To create five pending marketplace test sellers and 50 sample products for each, provide
`SEED_SELLER_EMAILS` as exactly five comma-separated addresses and run
`npm run seed:test-sellers`. The script never overwrites existing sellers, uploads five shared
sample product images to Cloudinary, creates active products that remain hidden until identity
verification is approved, and prints one-time temporary passwords once. Keep the output secure
and change the passwords after first login. Upload genuine identity documents through each seller
account before admin review; the script does not create identity documents or test orders.

## Seller Hub

1. Start MongoDB and the API using the setup steps above, then start `frontends/seller` on port 3001.
2. Open `http://localhost:3001`. Create a seller account or sign in. Seller sessions use a
   separate HTTP-only `seller_session` cookie and a role claim; seller routes enforce ownership on
   products, orders, inventory, returns, discounts, and settings.
3. Add products from the dashboard. SKU, name, category, price, inventory, publication status,
   image URLs, vehicle fitment, and variants are stored in MongoDB. Active seller products are
   added to the existing vehicle-specific storefront search when the fitment text includes the
   selected make/model/year (or says “Universal”). Checkout reserves seller-managed stock and
   customer cancellations restore it.

Seller endpoints include `POST /api/seller/auth/register`, `POST /api/seller/auth/login`,
`POST /api/seller/auth/forgot-password`, `POST /api/seller/auth/reset-password`,
`GET /api/seller/dashboard`, CRUD under `/api/seller/products`, stock adjustments at
`PATCH /api/seller/products/:id/stock`, order fulfillment under `/api/seller/orders`, return
reviews under `/api/seller/returns`, discount CRUD under `/api/seller/discounts`, plus
`/api/seller/payouts` and `/api/seller/settings`. `GET /api/catalog/products` is the public active
listing feed used by the storefront.

The seller area also includes overview metrics and sales charts, product and variant management,
inventory alerts, seller-specific order fulfillment and tracking, customer order history, return
reviews, coupon creation and checkout validation, store settings for shipping/tax/returns, and
estimated payout summaries. Seller products can be searched from the storefront and bought through
the existing cart and checkout; checkout rechecks prices and stock and reserves inventory. Seller
refunds can be issued to the customer wallet for paid Wallet orders. Configure the buyer-paid
platform fee in **Admin > Settings > Buyer-paid platform fee (%)**. It is added to each seller's
eligible merchandise amount after seller coupons; the seller's item share is not reduced. Order-time
fee-rate snapshots preserve the rate used at checkout if the administrator later changes it.
`SELLER_PLATFORM_FEE_RATE` is only the initial marketplace-setting fallback when no setting has
been saved (for example, `2` means 2%); it defaults to zero. See [`../docs/PAYMENT-FLOW.md`](../docs/PAYMENT-FLOW.md)
for Stripe, wallet, COD, refund, and settlement details.

Seller order rows can print an item/payment receipt with an internal QR code and barcode. From
Seller Hub, scanning either code with a camera or handheld scanner advances that seller's package
through Packed, Shipped, and Delivered; customers see each package's status history in order details.
The scanner accepts only labels issued to the signed-in seller and briefly rejects repeated scans.
This internal flow does not book courier pickups or receive carrier events.

Live shipping labels and carrier tracking are not yet integrated. Shiprocket, Delhivery, FedEx, UPS,
and DHL require active carrier accounts, provider-specific API credentials, and webhook setup before
their label-purchase and live tracking APIs can be safely enabled. Do not put carrier credentials in
client code or chat; configure them as server environment secrets when those integrations are added.
Payout values are estimates from order records. Bank transfers, payout history, fee reconciliation,
and card-provider refunds also need external integrations.

## Admin Console

1. Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_NAME` in `server/.env`. Use a
   unique, strong password; admin login is deliberately separate from seller and customer accounts.
2. Start the API and `frontends/admin` as described in the root README, then visit
   `http://localhost:3002`.
3. Review seller applications before their active listings appear in the public catalog. The console
   can also inspect customers and orders, flag or hide listings, review returns, manage support
   ticket status, view payment estimates and audit entries, and edit platform fee/content settings.

The admin API is protected by an HTTP-only `admin_session` cookie and a `superadmin` role claim.
Routes are under `/api/admin`; credentials are read from the API environment, not source code.
Payment transfers, live payment-provider health, messaging health, and actual payout operations are
not available until external providers are configured.

## Project structure

- `index.js` loads configuration, connects to MongoDB, and starts/shuts down the HTTP server.
- `src/app.js` configures Express middleware, API routes, and error handling.
- `src/modules/<role>/<feature>/` keeps role-specific routes, controllers, services, validators,
  and middleware together. Customer authentication currently lives in
  `src/modules/customer/auth/`; customer models live in `src/modules/customer/models/`.
- `src/config/`, `src/middleware/`, and `src/utils/` contain application-wide configuration,
  reusable middleware, and shared helpers.
- Add future seller and admin backend features under `src/modules/seller/` and
  `src/modules/admin/`. Do not treat a frontend role group as authorization; enforce access in
  backend middleware and services.

Run unit tests with `npm test`.
