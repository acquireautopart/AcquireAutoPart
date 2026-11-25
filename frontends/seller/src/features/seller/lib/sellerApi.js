import { authApiBase } from "@/lib/authApi";

async function request(path, { method = "GET", body, signal } = {}) {
  const response = await fetch(`${authApiBase}/seller${path}`, {
    method,
    credentials: "include",
    signal,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || "Could not reach the seller service.");
    error.status = response.status;
    throw error;
  }
  return data;
}

async function submitVerification(file, documentType, documentNumber, country) {
  const response = await fetch(`${authApiBase}/seller/verification/document`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": file.type,
      "X-Identity-Document-Type": documentType,
      "X-Identity-Document-Number": documentNumber,
      "X-Identity-Country": country,
    },
    body: file,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Could not upload the identity document.");
  return data;
}

async function uploadProductImage(file) {
  const response = await fetch(`${authApiBase}/seller/products/images`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Could not upload the product image.");
  }
  return data.image.url;
}

async function uploadProductImport(file, action) {
  const extension = file.name.split(".").pop().toLowerCase();
  const contentType = {
    csv: "text/csv",
    json: "application/vnd.acquireauto.products+json",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }[extension];
  if (!contentType) throw new Error("Choose a CSV, XLSX, or JSON file.");

  const importPath = action === "preview" ? "/products/import/preview" : "/products/import";
  const response = await fetch(`${authApiBase}/seller${importPath}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": contentType,
      "X-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || "Could not import the product file.");
    error.issues = data?.issues || [];
    throw error;
  }
  return data;
}

async function submitSignature(file) {
  const response = await fetch(`${authApiBase}/seller/verification/signature`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Could not upload the signature.");
  return data;
}

export const sellerApi = {
  register: (body) => request("/auth/register", { method: "POST", body }),
  login: (body) => request("/auth/login", { method: "POST", body }),
  requestPasswordReset: (body) => request("/auth/forgot-password", { method: "POST", body }),
  resetPassword: (body) => request("/auth/reset-password", { method: "POST", body }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: (options) => request("/auth/me", options),
  submitVerification,
  submitSignature,
  uploadProductImage,
  previewProductImport: (file) => uploadProductImport(file, "preview"),
  importProducts: (file) => uploadProductImport(file, "commit"),
  dashboard: (options) =>
    request(`/dashboard?timezoneOffset=${new Date().getTimezoneOffset()}`, options),
  categories: () => request("/categories"),
  products: (q = "") => request(`/products${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  notifications: (options) => request("/notifications", options),
  hubs: (options) => request("/hubs", options),
  readNotification: (id) =>
    request(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" }),
  createProduct: (body) => request("/products", { method: "POST", body }),
  updateProduct: (id, body) =>
    request(`/products/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  deleteProduct: (id) => request(`/products/${encodeURIComponent(id)}`, { method: "DELETE" }),
  deleteProducts: (ids) =>
    request("/products", { method: "DELETE", body: { ids } }),
  adjustStock: (id, quantity, variantId) =>
    request(`/products/${encodeURIComponent(id)}/stock`, {
      method: "PATCH",
      body: { quantity, variantId },
    }),
  orders: () => request("/orders"),
  scanOrder: (scanToken, location, packageWeightGrams) =>
    request("/orders/scan", {
      method: "POST",
      body: { scanToken, location, packageWeightGrams },
    }),
  updateOrder: (id, body) =>
    request(`/orders/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  returns: () => request("/returns"),
  updateReturn: (id, status) =>
    request(`/returns/${encodeURIComponent(id)}`, { method: "PATCH", body: { status } }),
  discounts: () => request("/discounts"),
  createDiscount: (body) => request("/discounts", { method: "POST", body }),
  updateDiscount: (id, body) =>
    request(`/discounts/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  deleteDiscount: (id) => request(`/discounts/${encodeURIComponent(id)}`, { method: "DELETE" }),
  payouts: () => request("/payouts"),
  stripeConnectStatus: () => request("/connect/status"),
  createStripeConnectLink: () => request("/connect/account-link", { method: "POST" }),
  updateSettings: (body) => request("/settings", { method: "PATCH", body }),
};
