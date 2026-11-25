import { authApiBase } from "@/lib/authApi";

async function request(path, { method = "GET", body } = {}) {
  const response = await fetch(`${authApiBase}/admin${path}`, {
    method,
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || "Could not reach the admin service.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export const adminApi = {
  deliveryCountries: async () => {
    const response = await fetch(`${authApiBase}/market/countries`, {
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data?.countries)) {
      throw new Error(data?.message || "Could not load country information.");
    }
    return data.countries;
  },
  login: (body) => request("/auth/login", { method: "POST", body }),
  me: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
  dashboard: (days = 30) => request(`/dashboard?days=${days}`),
  categories: () => request("/categories"),
  createCategory: (body) => request("/categories", { method: "POST", body }),
  updateCategory: (id, body) =>
    request(`/categories/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  deleteCategory: (id) =>
    request(`/categories/${encodeURIComponent(id)}`, { method: "DELETE" }),
  sellers: (q = "") => request(`/sellers${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  sellerDetails: (id) =>
    request(`/sellers/${encodeURIComponent(id)}/details`),
  sellerVerification: (id) => request(`/sellers/${encodeURIComponent(id)}/verification`),
  reviewSellerVerification: (id, status, note = "") =>
    request(`/sellers/${encodeURIComponent(id)}/verification`, {
      method: "PATCH",
      body: { status, note },
    }),
  updateSeller: (id, status) =>
    request(`/sellers/${encodeURIComponent(id)}`, { method: "PATCH", body: { status } }),
  products: (q = "") => request(`/products${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  moderateProduct: (id, action) =>
    request(`/products/${encodeURIComponent(id)}/moderation`, {
      method: "PATCH",
      body: { action },
    }),
  deleteProduct: (id) =>
    request(`/products/${encodeURIComponent(id)}`, { method: "DELETE" }),
  deleteProducts: (ids) =>
    request("/products", { method: "DELETE", body: { ids } }),
  customers: (q = "") => request(`/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  orders: (q = "") => request(`/orders${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  returns: () => request("/returns"),
  updateReturn: (id, status) =>
    request(`/returns/${encodeURIComponent(id)}`, { method: "PATCH", body: { status } }),
  tickets: () => request("/tickets"),
  updateTicket: (id, status) =>
    request(`/tickets/${encodeURIComponent(id)}`, { method: "PATCH", body: { status } }),
  payments: () => request("/payments"),
  recordCodCollection: (id, amount, carrierFee = 0, reference = "") =>
    request(`/payments/${encodeURIComponent(id)}/cod-collected`, {
      method: "POST",
      body: { amount, carrierFee, reference },
    }),
  deliveryAgents: (filters = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const search = query.toString();
    return request(`/delivery/agents${search ? `?${search}` : ""}`);
  },
  createHubStaff: (body) =>
    request("/delivery/hub-staff", { method: "POST", body }),
  deliveryHubs: (filters = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const search = query.toString();
    return request(`/delivery/hubs${search ? `?${search}` : ""}`);
  },
  deliveryHubDetails: (id) =>
    request(`/delivery/hubs/${encodeURIComponent(id)}/details`),
  reviewHubApplication: (id, status) =>
    request(`/delivery/hubs/${encodeURIComponent(id)}/application`, {
      method: "PATCH",
      body: { status },
    }),
  deliveryAgentApplication: (id) =>
    request(`/delivery/agents/${encodeURIComponent(id)}/application`),
  reviewDeliveryAgent: (id, body) =>
    request(`/delivery/agents/${encodeURIComponent(id)}/application`, {
      method: "PATCH",
      body,
    }),
  updateDeliveryAgent: (id, isActive) =>
    request(`/delivery/agents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { isActive },
    }),
  deliveryShipments: () => request("/delivery/shipments"),
  assignDeliveryShipment: (orderId, body) =>
    request(`/delivery/shipments/${encodeURIComponent(orderId)}/assign`, {
      method: "POST",
      body,
    }),
  settings: () => request("/settings"),
  updateSettings: (body) => request("/settings", { method: "PATCH", body }),
  audit: () => request("/audit"),
};
