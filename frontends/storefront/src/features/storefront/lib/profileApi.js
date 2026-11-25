import { authApiBase } from "@/lib/authApi";

/*
 * Thin client for the customer profile API.
 * Session identity travels in the httpOnly `customer_session` cookie, so every
 * call is made with `credentials: "include"`.
 */

async function requestProfile(path, { method = "GET", body, signal } = {}) {
  const response = await fetch(`${authApiBase}/profile${path}`, {
    method,
    credentials: "include",
    signal,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || "Could not reach your account right now.");
    error.status = response.status;
    throw error;
  }

  return data;
}

function query(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const serialised = search.toString();
  return serialised ? `?${serialised}` : "";
}

export const profileApi = {
  /* Overview */
  overview: (options) => requestProfile("/overview", options),

  /* Wallet & ledger */
  wallet: (options) => requestProfile("/wallet", options),
  topUp: (amount) => requestProfile("/wallet/topup", { method: "POST", body: { amount } }),
  withdraw: (amount) => requestProfile("/wallet/withdraw", { method: "POST", body: { amount } }),
  ledger: ({ type, page, limit } = {}, options) =>
    requestProfile(`/ledger${query({ type, page, limit })}`, options),

  /* Wishlist */
  wishlist: ({ q, sort } = {}, options) =>
    requestProfile(`/wishlist${query({ q, sort })}`, options),
  wishlistIds: (options) => requestProfile("/wishlist/ids", options),
  addWishlistItem: (payload) => requestProfile("/wishlist", { method: "POST", body: payload }),
  removeWishlistItem: (id) => requestProfile(`/wishlist/${id}`, { method: "DELETE" }),
  clearWishlist: () => requestProfile("/wishlist", { method: "DELETE" }),

  /* Price and stock alerts */
  productAlerts: (productId, options) => requestProfile(`/alerts${productId ? query({ productId }) : ""}`, options),
  createProductAlert: (payload) => requestProfile("/alerts", { method: "POST", body: payload }),
  removeProductAlert: (id) => requestProfile(`/alerts/${id}`, { method: "DELETE" }),

  /* Saved vehicles */
  vehicles: (options) => requestProfile("/vehicles", options),
  createVehicle: (payload) => requestProfile("/vehicles", { method: "POST", body: payload }),
  setPrimaryVehicle: (id) => requestProfile(`/vehicles/${id}/primary`, { method: "PATCH" }),
  removeVehicle: (id) => requestProfile(`/vehicles/${id}`, { method: "DELETE" }),

  /* Addresses */
  addresses: (options) => requestProfile("/addresses", options),
  createAddress: (payload) => requestProfile("/addresses", { method: "POST", body: payload }),
  updateAddress: (id, payload) =>
    requestProfile(`/addresses/${id}`, { method: "PATCH", body: payload }),
  setDefaultAddress: (id) => requestProfile(`/addresses/${id}/default`, { method: "PATCH" }),
  removeAddress: (id) => requestProfile(`/addresses/${id}`, { method: "DELETE" }),

  /* Payment methods (masked details only) */
  payments: (options) => requestProfile("/payments", options),
  createPayment: (payload) => requestProfile("/payments", { method: "POST", body: payload }),
  setDefaultPayment: (id) => requestProfile(`/payments/${id}/default`, { method: "PATCH" }),
  removePayment: (id) => requestProfile(`/payments/${id}`, { method: "DELETE" }),

  /* KYC */
  kyc: (options) => requestProfile("/kyc", options),
  submitKycStep: (key, payload) => requestProfile(`/kyc/${key}`, { method: "POST", body: payload }),

  /* Returns & refunds */
  returns: ({ status } = {}, options) => requestProfile(`/returns${query({ status })}`, options),
  createReturn: (payload) => requestProfile("/returns", { method: "POST", body: payload }),
  cancelReturn: (id) => requestProfile(`/returns/${id}/cancel`, { method: "POST" }),

  /* Support tickets (contact us) */
  tickets: (options) => requestProfile("/tickets", options),
  createTicket: (payload) => requestProfile("/tickets", { method: "POST", body: payload }),

  /* Account settings */
  updateSettings: (payload) => requestProfile("/settings", { method: "PATCH", body: payload }),
  updatePreferences: (payload) =>
    requestProfile("/preferences", { method: "PATCH", body: payload }),
  changePassword: (payload) => requestProfile("/password", { method: "POST", body: payload }),
};

export default profileApi;
