import { apiFetch } from "@/lib/api";
import { STAFF_API_KEY, hasStaffKey } from "./trackingApi";

/** Every call to the operations endpoints carries the staff key. */
function staffHeaders() {
  return STAFF_API_KEY ? { "x-api-key": STAFF_API_KEY } : {};
}

/** Drops empty filters so the API only sees the ones that are set. */
function queryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export { hasStaffKey };

/** Paginated shipment table, optionally filtered by status and created date. */
export function listShipments({ page, limit, status, from, to }) {
  return apiFetch(
    `/admin/tracking/shipments${queryString({ page, limit, status, from, to })}`,
    { headers: staffHeaders() },
  );
}

/** Parcels with no scan for more than `hours` (defaults to 24 on the server). */
export function listStuckShipments({ hours, limit } = {}) {
  return apiFetch(`/admin/tracking/stuck${queryString({ hours, limit })}`, {
    headers: staffHeaders(),
  });
}

/** How many in-transit parcels sit in each hub. */
export function getHubLoad() {
  return apiFetch("/admin/tracking/hub-load", { headers: staffHeaders() });
}

/** The SMS/email texts stored by the notification layer. */
export function listNotifications({ limit } = {}) {
  return apiFetch(`/admin/tracking/notifications${queryString({ limit })}`, {
    headers: staffHeaders(),
  });
}

export function listWebhooks() {
  return apiFetch("/admin/tracking/webhooks", { headers: staffHeaders() });
}

export function registerWebhook({ sellerId, sellerName, url }) {
  return apiFetch("/admin/tracking/webhooks", {
    method: "POST",
    body: { sellerId, sellerName, url },
    headers: staffHeaders(),
  });
}
