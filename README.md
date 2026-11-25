# AcquireAuto

AcquireAuto is a global automotive-parts marketplace with four independently runnable Next.js frontends and one shared Express API. Storefront, seller portal, admin console, and delivery workspace use separate folders and can be deployed to separate domains while sharing AcquireAuto branding and backend data.

## Contents

| Folder | Purpose | Runtime |
| --- | --- | --- |
| `frontends/storefront/` | Customer storefront, catalog, search, cart, customer account | Next.js 15, React 19, Tailwind CSS |
| `frontends/seller/` | Seller login and seller dashboard | Next.js 15, React 19, Tailwind CSS |
| `frontends/admin/` | Admin login and marketplace console | Next.js 15, React 19, Tailwind CSS |
| `frontends/delivery/` | Delivery-agent login, assigned packages, scan events, OTP delivery confirmation | Next.js 15, React 19, Tailwind CSS |
| `server/` | Shared customer, seller, admin, catalog, and order API | Express 5, MongoDB/Mongoose |

Node.js 20.9 or later is recommended. Install dependencies separately in each frontend folder; there is no root package script.

## Run the frontends separately

```powershell
cd frontends/storefront
npm install
npm run dev
```

Open <http://localhost:3000> for the storefront. In two more terminals, run:

```powershell
cd frontends/seller
npm install
npm run dev
```

```powershell
cd frontends/admin
npm install
npm run dev
```

Seller login/dashboard runs at <http://localhost:3001>; admin login/console runs at
<http://localhost:3002>. Each folder has its own `package.json`, lockfile, and `.env.example`.
Copy its env example to `.env.local` and configure `NEXT_PUBLIC_API_URL` if the shared API is at
another address. Each frontend has its own build, start, and lint scripts; the storefront, seller,
and admin apps also include formatting scripts.

Run the independently deployable delivery workspace on port `3003`:

```powershell
cd frontends/delivery
npm install
npm run dev
```

Open <http://localhost:3003>. A marketplace administrator creates delivery-agent accounts and
assigns shipped packages from **Admin → Delivery operations**. The delivery portal accepts only
those accounts; agents scan a printed package QR before adding pickup, hub, transit, attempt,
out-for-delivery, delivery, or RTO events.

## Start the customer API

The server requires a MongoDB database and environment configuration. Create `server/.env` with:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/acquireauto
JWT_SECRET=replace-with-a-private-random-secret-at-least-32-characters-long
PORT=5000
FRONTEND_URL=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003
TRUST_PROXY_HOPS=0
```

Use a private secret of at least 32 bytes. In production, set `FRONTEND_URL` to the exact frontend origins or comma-separated allowed origins. Set `TRUST_PROXY_HOPS` to the number of trusted proxies only when deploying behind them. Keep `.env` files private and out of version control. The checked-in `server/.env.example` lists the complete configuration.

## Global marketplace and seller verification

The market is selected from a country selector or the trusted `x-vercel-ip-country` / `cf-ipcountry` headers forwarded by your deployment proxy; without either, the API defaults to the US. Configure the proxy to set these headers and set `TRUST_PROXY_HOPS` to match your deployment. Customers can change the selected market. The seller catalog only returns in-stock products from approved sellers registered in that country.

Prices are stored in the seller's country currency. The storefront converts them for display using Frankfurter reference rates (cached for one hour); if a currency or rate is unavailable, the original currency is shown. Display conversion is not used to charge customers. Stripe checkout, seller Connect onboarding, refunds, and payout hooks are present in the API, but live payment processing stays unavailable until `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are configured, the webhook is registered, and sellers finish Stripe onboarding. Review shipping, tax, refunds, and settlement currencies before accepting real orders.

Seller registration asks for the seller's country and a matching government ID type/number. The seller must upload an ID document for admin review before the account can be approved for catalog listing. Uploads require a private S3-compatible bucket configured with `KYC_S3_BUCKET` and `AWS_REGION`; use an IAM role or set both AWS access-key environment variables. Keep the bucket private. Admin document links expire after five minutes. Country document labels are guidance for manual review and are not legal or identity validation.

Run the API in another terminal:

```powershell
cd server
npm install
npm run dev
```

For a non-watch process, use `npm start`. API tests can be run with `npm test` from `server/`.

Each frontend and the server include `.env.example` files for local settings. The server exits with an error if MongoDB or the required signing secret is unavailable.

## Deploy separate storefront, seller, admin, and delivery domains

Deploy each frontend folder as its own Next.js application and attach one domain to each:

| Domain | Landing page |
| --- | --- |
| `www.example.com` | Storefront |
| `seller.example.com` | Seller sign-in, then seller dashboard |
| `admin.example.com` | Admin sign-in, then admin overview |
| `delivery.example.com` | Delivery-agent sign-in and assigned route |

Point each DNS name at its matching frontend deployment. Set `NEXT_PUBLIC_STORE_URL`,
`NEXT_PUBLIC_SELLER_URL`, and `NEXT_PUBLIC_ADMIN_URL` in the storefront, seller, and admin apps so
cross-portal links open the correct domain. Set `NEXT_PUBLIC_API_URL` in each app to the shared API
URL. Set the API's `FRONTEND_URL` to a comma-separated allowlist containing all four exact HTTPS
origins. Seller and
admin sign-in opens its dashboard on that frontend's root URL. Replace the local URLs in each
`.env.example` with the domains you own before deploying. The API retains role-specific
authorization and separate customer, seller, admin, and delivery-agent sessions. Delivery accounts
are provisioned by admin, with bcrypt-hashed passwords. Courier name and AWB are entered during
assignment; carrier API/webhook automation requires a separately configured provider integration.

## Storefront pages and features

- `/` — storefront home page with product and structured vehicle search, US VIN lookup, optional photo part lookup, live seller categories, brands, fitments and product cards.
- `/parts` — searchable active seller listings, with category/brand/condition/price filters, vehicle fitment matching, sorting, pagination, and a side-by-side comparison tray for up to three parts.
- `/product/[id]` — product details, image zoom, quantity selection, verified-purchase reviews, manufacturer part-number cross-reference search, seller fitments and return terms, seller trust details, and price/back-in-stock alerts.
- `/cart` — cart item list, quantity controls, remove and clear actions, item count, and subtotal.
- `/profile` — customer account overview and existing profile sections. Its content is unchanged; sidebar entries navigate to their dedicated pages.
- `/profile/orders` — responsive order history with search, order-type tabs, year selection, shipment carrier/tracking links and status timeline.
- `/profile/orders/filter` — order type and date filters. Apply returns to the order history with the selected filters.
- `/profile/wishlist`, `/profile/vehicles`, `/profile/addresses`, `/profile/payments`, `/profile/wallet`, `/profile/ledger`, `/profile/kyc`, `/profile/returns`, `/profile/settings`, `/profile/contact` — dedicated destinations for the matching account sidebar sections. The desktop pages retain the profile sidebar; mobile pages use a compact return-to-profile control. Saved vehicles can be launched as quick searches from the home-page vehicle search.

The site header provides search, navigation, theme selection, account access, and a cart badge. Guest cart contents use browser local storage and synchronize between tabs; signing in merges them into the customer's server-side cart.

Customer profile, saved vehicles, cart, orders, returns, and review flows use the customer API. `profileDemo.js` remains as presentation/demo fixture data for sections that need sample content.

## API routes

### Storefront Next.js API routes

- `GET /api/parts` — proxy the active backend seller catalog. Supports free-text `q`, structured vehicle fields, `brand`, `category`, `condition`, `minPrice`, `maxPrice`, `sort`, `page`, and `pageSize`.
- `POST /api/parts/image-search` — extracts visible text and image labels from a JPEG, PNG, or WebP photo (up to 5 MB) and suggests catalog search terms. Configure the optional server-only `GOOGLE_VISION_API_KEY` in `frontends/storefront/.env.local`; Vision API usage may incur charges under the configured Google Cloud project.
- `GET /api/vin?vin=...` — decode a 17-character US VIN through NHTSA vPIC and return year/make/model details for a suggested catalog search.
- `GET /api/market/context` (Express API) — return the selected country, currency, document type options, and available exchange rates.
- `GET /api/catalog/products?country=US` (Express API) — return active, in-stock items from approved sellers in the requested country.

### Express marketplace API

Base URL: `http://localhost:5000/api` by default.

- `GET /market/context` — return country, currency, seller document type options, and exchange rates.
- `POST /auth/register` — create a customer account. JSON body includes `name`, `email`, `password`, and selected `marketCountry`.
- `POST /auth/login` — sign in. JSON body includes `email`, `password`, and selected `marketCountry`.
- `GET /auth/me` — return the current signed-in customer.
- `POST /auth/logout` — clear the session cookie.
- `GET /catalog/products?country=US` — list paginated, in-stock products from approved sellers; supports text and structured year/make/model/trim/engine fitment searches, plus brand, category, price, and sort filters.
- Customer product-alert routes under `/profile/alerts` — save or remove price-drop and back-in-stock alerts. In-account alerts work without email setup; email notifications use the server's optional `RESEND_API_KEY` and `RESEND_FROM` settings.
- Seller order updates accept carrier and tracking URL fields and notify customers by email when Resend is configured.
- `/seller/*` — seller auth, identity document submission, products, orders, inventory, and store settings.
- `/admin/*` — admin seller verification review, including short-lived private document links.
- `GET /health` — API health status.

Passwords are hashed with bcrypt. The API uses signed, HTTP-only session cookies, rate limits authentication requests, and restricts credentialed CORS requests to configured frontend origins. Seller and admin sessions are separate from customer sessions.

## Main source folders

```text
frontends/
├── storefront/
│   ├── src/app/       # Storefront routes and layout
│   ├── src/features/  # Storefront UI and API clients
│   └── public/
├── seller/
│   ├── src/app/       # Seller portal routes and layout
│   ├── src/features/  # Seller dashboard and API client
│   └── public/
└── admin/
    ├── src/app/       # Admin console routes and layout
    ├── src/features/  # Admin console and API client
    └── public/

server/
├── index.js      # Environment loading, MongoDB connection, HTTP startup
├── src/
│   ├── modules/
│   │   ├── customer/auth/  # Customer auth routes, controllers, service, validation
│   │   ├── customer/models/
│   │   ├── seller/         # Seller API features
│   │   └── admin/          # Admin API features
│   ├── config/             # Environment validation
│   ├── middleware/         # Shared middleware
│   └── utils/              # Shared helpers
└── test/         # Node test-runner auth and route tests
```

Customer, seller, and admin APIs remain in the shared server. Keep role permissions enforced there,
even though each dashboard has its own frontend deployment.

## Demo limits

- Structured and legacy fitment data is seller-provided and is not an independent compatibility guarantee. The US VIN decoder and photo lookup suggest search terms; they do not certify part fitment.
- Stripe code is ready for environment configuration, but no API credentials are included in this project archive. See `server/.env.example` and configure Stripe's webhook URL at `/api/payments/stripe/webhook` before live payment use.
- Newsletter signup remains a demo interaction. Confirm shipping, tax, return, privacy, and seller verification policies for the target market before launch.
