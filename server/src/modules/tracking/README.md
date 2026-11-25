# tracking module

Scan-based courier tracking, modelled on how a real logistics network works: a
parcel's journey is rebuilt from the barcode scans that hub and delivery staff
record at every hand-off.

## Folder layout

```
tracking/
├── models/        Mongoose models (Hub, RouteLeg, Shipment, ScanEvent)
├── services/      Business logic (route planner, scan handling, timeline)
├── controllers/   Express route handlers
├── middleware/    API-key guards for staff-only endpoints
└── scripts/       Seed and simulator scripts
```

Feature code is added here step by step.

## Current HTTP API

Public:

- `GET /api/route-preview?origin=DEL-PKP&pincode=274701` — planned hop-by-hop
  route with a cumulative ETA per hub
- `POST /api/shipments` — create a shipment, allocate an FMPP AWB, plan the
  route and record the opening scan events
- `GET /api/shipments/:awb` — shipment detail with `plannedRoute` populated
- `POST /api/scan` — record an INBOUND or OUTBOUND hub scan
- `POST /api/delivery/assign` — send a shipment out for delivery (only from its
  delivery hub); records OUT_FOR_DELIVERY and stores a 4-digit OTP
- `POST /api/delivery/complete` — verify the OTP and record DELIVERED; COD
  shipments also require `codCollected: true`
- `POST /api/delivery/fail` — record DELIVERY_ATTEMPTED with a reason and bump
  `failedAttempts`; the third failure records RTO_INITIATED automatically
- `GET /api/track/:awb` — customer tracking view: `summary`, `timeline`
  (all scan events), `groupedStatus` (Flipkart-style buckets), `progress`
  (visited/current/upcoming hubs) and `estimatedDeliveryDate`

Still planned:

- `GET /api/hubs` — hubs available for the route picker
- `GET /api/admin/shipments` — dashboard listing

## Seeding

`npm run seed` upserts the demo network (Delhi pickup hub → Delhi sort center →
Lucknow mother hub → Gorakhpur hub → Salempur delivery hub, which serves pincode
274701). It is idempotent and safe to run repeatedly.

## Tests

`npm run test:unit` runs the Jest unit tests for the route planner (no database
needed). `npm test` runs the Node test-runner suites.

## Conventions

- Endpoints are mounted under `/api`.
- Errors are returned as `{ "success": false, "message": "..." }` by the
  central error handler in `src/middleware/errorHandler.js`.
- `GET /api/health` reports the live Mongoose connection state.

## Environment

Uses the shared server configuration (`server/.env`): `MONGODB_URI`, `PORT`,
`JWT_SECRET`. Staff endpoints additionally require an API key (added in a later
step).
