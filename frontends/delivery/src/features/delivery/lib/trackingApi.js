import { apiFetch } from "@/lib/api";

/** Shared secret for the staff-only endpoints; set NEXT_PUBLIC_STAFF_API_KEY. */
export const STAFF_API_KEY = process.env.NEXT_PUBLIC_STAFF_API_KEY || "";

export function hasStaffKey() {
  return Boolean(STAFF_API_KEY);
}

/** Public: the full customer tracking payload for one AWB. */
export function trackShipment(awb) {
  return apiFetch(`/track/${encodeURIComponent(awb)}`);
}

/** Every hub in the network, for the scanner's picker. */
export function getHubs() {
  return apiFetch("/hubs");
}

/** Staff: record an INBOUND or OUTBOUND parcel scan at a hub. */
export function recordScan({ awb, hubCode, scanType, scannedBy }) {
  return apiFetch("/scan", {
    method: "POST",
    body: {
      awb,
      hubCode,
      scanType,
      ...(scannedBy ? { scannedBy } : {}),
    },
    headers: STAFF_API_KEY ? { "x-api-key": STAFF_API_KEY } : {},
  });
}
