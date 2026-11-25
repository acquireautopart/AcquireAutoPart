# Admin console

Admin code is organized by feature. `overview/`, `marketplace/`, `operations/`, `reports/`, and
`settings/` each contain their own UI under `components/`. Admin-specific shell, sign-in, and UI
primitives live under `shared/components/`; the API client is in `lib/`.

Next.js route entry points are in `../../app/admin/`. Keep authorization enforced by the API in
addition to any UI-level access checks.
