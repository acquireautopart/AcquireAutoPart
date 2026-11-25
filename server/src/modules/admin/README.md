# Admin backend

The `/api/admin` route group uses a dedicated HTTP-only `admin_session` cookie. Credentials are
configured with `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optional `ADMIN_NAME`; the token has a
`superadmin` role and expires after eight hours.

## Files

- `routes.js` — admin endpoint map and protected route boundary.
- `controller.js` — HTTP handlers and session cookie handling.
- `service.js` — marketplace reads, moderation actions, settings and audit writes.
- `auth/requireAdmin.js` — verifies the admin role, session and configured admin identity.
- `models/AdminSetting.js` — platform fee, storefront announcement/banner and maintenance settings.
- `models/AuditLog.js` — persistent administrator action history.

Sellers remain in the review queue until approved. Public catalog lookups and checkout verify the
seller approval state. Product moderation supports flagging or hiding listings; customer returns
can be reviewed here while actual refunds remain in the owning seller's supported payment flow.
