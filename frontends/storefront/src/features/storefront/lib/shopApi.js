import { authApiBase } from "@/lib/authApi";

/*
 * Thin client for the customer cart + orders API.
 * Session identity travels in the httpOnly `customer_session` cookie, so every
 * call is made with `credentials: "include"`.
 */

async function requestShop(path, { method = "GET", body, signal } = {}) {
  const response = await fetch(`${authApiBase}${path}`, {
    method,
    credentials: "include",
    signal,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || "Could not reach the shop right now.");
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

export const cartApi = {
  get: (options) => requestShop("/cart", options),
  addItem: (item) => requestShop("/cart/items", { method: "POST", body: item }),
  setQuantity: (productId, quantity) =>
    requestShop(`/cart/items/${encodeURIComponent(productId)}`, {
      method: "PATCH",
      body: { quantity },
    }),
  removeItem: (productId) =>
    requestShop(`/cart/items/${encodeURIComponent(productId)}`, { method: "DELETE" }),
  clear: () => requestShop("/cart", { method: "DELETE" }),
  merge: (items) => requestShop("/cart/merge", { method: "POST", body: { items } }),
};

export const ordersApi = {
  list: ({ status, year } = {}, options) =>
    requestShop(`/orders${query({ status, year })}`, options),
  get: (id, options) => requestShop(`/orders/${encodeURIComponent(id)}`, options),
  create: (payload) => requestShop("/orders", { method: "POST", body: payload }),
  quote: (payload, options) =>
    requestShop("/orders/quote", { method: "POST", body: payload, ...options }),
  validateCoupon: (couponCode, productIds) =>
    requestShop("/orders/coupon/validate", { method: "POST", body: { couponCode, productIds } }),
  cancel: (id) => requestShop(`/orders/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
};

export default cartApi;
