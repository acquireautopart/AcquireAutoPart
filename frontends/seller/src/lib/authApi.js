export const authApiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(
  /\/+$/,
  "",
);

let currentCustomerCache;
let currentCustomerCacheExpiresAt = 0;
let currentCustomerRequest;
let currentCustomerGeneration = 0;
const CURRENT_CUSTOMER_CACHE_MS = 30_000;
const SESSION_PATHS = new Set(["login", "register", "logout"]);

export const SESSION_EVENT = "acquireauto-session-change";
export const AUTH_DIALOG_EVENT = "acquireauto-open-auth-dialog";

export function requestCustomerAuthDialog() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_DIALOG_EVENT));
  }
}

export function invalidateCurrentCustomer() {
  currentCustomerGeneration += 1;
  currentCustomerCache = undefined;
  currentCustomerCacheExpiresAt = 0;
  currentCustomerRequest = undefined;
}

export async function requestAuth(path, options = {}) {
  const response = await fetch(`${authApiBase}/auth/${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || "Could not connect to your customer account.");
    error.status = response.status;
    throw error;
  }
  if (!data) throw new Error("The customer API returned an invalid response.");
  if (path !== "me") {
    invalidateCurrentCustomer();
    if (SESSION_PATHS.has(path) && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(SESSION_EVENT, { detail: { authenticated: path !== "logout" } }),
      );
    }
  }
  return data;
}

export function requestCurrentCustomer({ signal } = {}) {
  if (signal?.aborted) {
    return Promise.reject(new DOMException("The request was aborted.", "AbortError"));
  }

  if (currentCustomerCache && Date.now() < currentCustomerCacheExpiresAt) {
    return Promise.resolve(currentCustomerCache);
  }

  if (!currentCustomerRequest) {
    const generation = currentCustomerGeneration;
    const request = requestAuth("me")
      .then((data) => {
        if (generation === currentCustomerGeneration) {
          currentCustomerCache = data;
          currentCustomerCacheExpiresAt = Date.now() + CURRENT_CUSTOMER_CACHE_MS;
        }
        return data;
      })
      .finally(() => {
        if (currentCustomerRequest === request) currentCustomerRequest = undefined;
      });
    currentCustomerRequest = request;
  }

  if (!signal) return currentCustomerRequest;
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException("The request was aborted.", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    currentCustomerRequest.then(
      (data) => {
        signal.removeEventListener("abort", onAbort);
        if (!signal.aborted) resolve(data);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        if (!signal.aborted) reject(error);
      },
    );
  });
}
