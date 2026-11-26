import { API_BASE_URL } from "@/lib/apiBase";

const API_URL = API_BASE_URL;

/**
 * Thin fetch wrapper around the AcquireAuto API.
 * Pass the path relative to the API base, e.g. apiFetch("/health").
 */
export async function apiFetch(
  path,
  { method = "GET", body, signal, headers } = {},
) {
  const target = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${API_URL}${target}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      data?.message || `Request failed with status ${response.status}.`,
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  get: (path, options) => apiFetch(path, options),
  post: (path, body, options) =>
    apiFetch(path, { method: "POST", body, ...options }),
  patch: (path, body, options) =>
    apiFetch(path, { method: "PATCH", body, ...options }),
  delete: (path, options) => apiFetch(path, { method: "DELETE", ...options }),
  health: () => apiFetch("/health"),
};

export { API_URL };
export default api;
