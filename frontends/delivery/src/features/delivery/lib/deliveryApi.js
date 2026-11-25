const apiBase = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

async function request(path, { method = "GET", body, signal } = {}) {
  const response = await fetch(`${apiBase}/delivery${path}`, {
    method,
    credentials: "include",
    signal,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      data?.message || "Could not reach the delivery service.",
    );
    error.status = response.status;
    throw error;
  }
  if (!data) throw new Error("The delivery API returned an invalid response.");
  return data;
}

export const deliveryApi = {
  countries: async () => {
    const response = await fetch(`${apiBase}/market/countries`, {
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data?.countries)) {
      throw new Error(data?.message || "Could not load country information.");
    }
    return data.countries;
  },
  createApplication: (body) =>
    request("/auth/applications", { method: "POST", body }),
  createHubApplication: (body) =>
    request("/auth/hub-applications", { method: "POST", body }),
  uploadApplicationFile: async (token, kind, file) => {
    const response = await fetch(
      `${apiBase}/delivery/auth/applications/files`,
      {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          "X-Application-Token": token,
          "X-Application-File-Kind": kind,
        },
        body: file,
      },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        data?.message || "Could not upload your application file.",
      );
    }
    return data;
  },
  login: (body) => request("/auth/login", { method: "POST", body }),
  me: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
  changePassword: (body) =>
    request("/auth/password", { method: "PATCH", body }),
  setAvailability: (isOnline) =>
    request("/auth/availability", { method: "PATCH", body: { isOnline } }),
  tasks: () => request("/tasks"),
  hubTasks: () => request("/hub/tasks"),
  earnings: (from, to, timeZone) => {
    const params = new URLSearchParams({ from, to, timeZone });
    return request(`/earnings?${params.toString()}`);
  },
  addEvent: (orderId, body) =>
    request(`/tasks/${encodeURIComponent(orderId)}/events`, {
      method: "POST",
      body,
    }),
  addReverseEvent: (requestId, body) =>
    request(`/reverse-tasks/${encodeURIComponent(requestId)}/events`, {
      method: "POST",
      body,
    }),
  addHubEvent: (orderId, body) =>
    request(`/hub/tasks/${encodeURIComponent(orderId)}/events`, {
      method: "POST",
      body,
    }),
  addHubReverseEvent: (requestId, body) =>
    request(`/hub/reverse-tasks/${encodeURIComponent(requestId)}/events`, {
      method: "POST",
      body,
    }),
  getPendingEvents(agentId) {
    const value = window.localStorage.getItem(
      `acquireauto:delivery:pending:${agentId}`,
    );
    if (!value) return [];
    try {
      const events = JSON.parse(value);
      if (!Array.isArray(events)) {
        throw new Error("The saved delivery scans are invalid.");
      }
      return events;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(
          "Saved delivery scans could not be read on this device.",
        );
      }
      throw error;
    }
  },
  savePendingEvents(agentId, events) {
    window.localStorage.setItem(
      `acquireauto:delivery:pending:${agentId}`,
      JSON.stringify(events),
    );
  },
  createEventId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  },
};
