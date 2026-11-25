# Frontend source layout

Next.js route files stay in `app/`. They map URLs to pages and layouts; feature UI and behavior
belong in `features/`.

```text
src/
├── app/
│   ├── (storefront)/     # Customer-facing routes
│   ├── admin/            # Admin routes
│   ├── seller/           # Seller routes
│   ├── api/              # Next.js route handlers
│   └── layout.jsx        # Root layout and global styles
├── features/
│   ├── storefront/       # Storefront components, data, hooks, and API helpers
│   ├── profile/          # Customer account and profile pages
│   ├── admin/            # Admin features and shared admin UI
│   └── seller/           # Seller features and shared seller UI
├── lib/                  # Helpers intentionally shared across features
└── components/           # Reusable UI shared across roles, when applicable
```

Keep each domain's `pages/`, `components/`, `hooks/`, and `lib/` close to that feature. Admin and
seller role-specific UI belongs under that role's `shared/` feature, not in global components.
Routes in `app/` should stay thin and render the corresponding feature page or layout. Use
`@/features/...` aliases for imports so moving a route does not change module resolution.
Storefront drawer categories are defined in `features/storefront/data/storefront.js`; each item
maps to a static `/category/[slug]` route that renders the shared category page.
