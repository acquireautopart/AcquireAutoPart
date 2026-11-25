# GarageParts — Next.js + Tailwind CSS storefront starter

A responsive automotive-parts storefront homepage with an original design inspired by common auto-parts ecommerce patterns. Not affiliated with CarParts.com.

## Tech stack

- Next.js App Router + React JSX (`.jsx` files)
- JavaScript only — no TypeScript
- Tailwind CSS v3 for utility-first styling (no CSS Modules)
- Lucide icons
- Reusable UI components, storefront hooks and API helpers

## Run locally

Requires Node.js 20.9+.

```bash
npm install
npm run dev
```

If PowerShell blocks `npm.ps1`, run `npm.cmd install` and `npm.cmd run dev` instead. Open http://localhost:3000.

## Project structure

```text
src/
├── app/       # Next.js routes, layouts, global CSS, and API route handlers
├── admin/     # Admin components and admin API client
├── client/    # Customer storefront/profile components, data, hooks, and API helpers
├── seller/    # Seller components and seller API client
└── shared/    # Cross-role helpers used by the role-specific API clients
```

## Team-style conventions

- Keep Next.js route entry files under `src/app`; Next.js requires this location for route discovery.
- Put admin, customer, and seller components under their matching `src/<role>/components` folder.
- Put customer profile features, hooks, data, and domain helpers under `src/client/`.
- Keep role-specific API clients in their corresponding role folder; put cross-role helpers in
  `src/shared/` only when multiple roles use them.
- UI components are separated by responsibility and named with PascalCase.
- Tailwind theme tokens are centralized in `tailwind.config.js`.
- Keep components small and reusable; use server components by default and add `"use client"` only for interactive UI.
- Use semantic elements, accessible labels, responsive utility classes, and consistent spacing/color tokens.

The seller hub is available at `/seller`; seller data is stored in MongoDB and protected by a
separate seller session. See `../server/README.md` for backend setup and seller API details. Admin
tools are available at `/admin` and use a separate admin session.

## Marketplace catalog

The storefront reads products, categories, brands and seller-provided fitment details from the
backend marketplace catalog. Search supports product names, SKUs, brands, categories, descriptions
and fitment text, with paginated results and category, brand, price and sort filters. The storefront
does not contain a synthetic parts catalog or generated vehicle trims. Fitment is the seller's
listing text; confirm compatibility with the seller before ordering.
