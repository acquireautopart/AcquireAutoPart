# Storefront feature

Customer-facing shop UI, hooks, and API helpers live here. Marketplace product data is requested
from the backend catalog; Next.js route entry points are under `../../app/(storefront)/` and should
stay thin.

- `components/` — storefront UI such as the header, product sections, and search form.
- `data/` — category navigation labels and search terms.
- `hooks/` — storefront and cart hooks.
- `lib/` — storefront API clients, formatting, and image helpers.
- `../profile/` — the separate customer profile feature.
