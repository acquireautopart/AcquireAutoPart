const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

if (!configuredApiUrl) {
  throw new Error("Set NEXT_PUBLIC_API_URL in the seller frontend environment.");
}

const trimmedApiUrl = configuredApiUrl.replace(/\/+$/, "");

export const API_BASE_URL = /\/api$/i.test(trimmedApiUrl)
  ? trimmedApiUrl
  : `${trimmedApiUrl}/api`;
