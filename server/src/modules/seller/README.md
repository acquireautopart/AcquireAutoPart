# Seller API module

Seller registration and authentication live under `auth/`. Every authenticated workspace route is mounted below `/api/seller` and protected by `requireSeller`. Product queries and mutations always include the signed-in seller ID. Active public listings are exposed separately through `/api/catalog/products`.

The current module includes dashboard aggregates, catalogue CRUD/archive, stock adjustment, order fulfillment and seller-specific fulfillment state, return review, discount CRUD, payout estimates, and store settings. `SellerProduct` records use SKU uniqueness per seller. Existing customer order lines retain the MongoDB product ID so seller ownership can be resolved for reporting and fulfillment.

Keep external payout transfer and refund operations out of this module until a payment provider and approved seller-onboarding process are configured.
