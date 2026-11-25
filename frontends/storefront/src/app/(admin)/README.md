# Admin Console

Open `/admin` and sign in with the credentials configured through `ADMIN_EMAIL` and
`ADMIN_PASSWORD` in the server environment. The admin session is separate from customer and seller
sessions. See the server README for setup and the limits of external payment and notification tools.

## Frontend structure

- `../admin/` — thin Next.js route entry points; each route renders its feature page.
- `../../features/admin/overview/` — overview page and dashboard components.
- `../../features/admin/marketplace/` — customer, seller, product moderation, and order pages.
- `../../features/admin/operations/` — payments, returns, support, and audit pages.
- `../../features/admin/reports/` — marketplace reports and CSV export.
- `../../features/admin/settings/` — platform settings and storefront banner pages.
- `../../features/admin/shared/components/` — admin shell, sign-in, and admin-only UI primitives.
- `../../features/admin/lib/adminApi.js` — admin API client.

Admin backend routes and data access live under `server/src/modules/admin/`.
