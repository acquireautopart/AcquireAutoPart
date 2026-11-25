import { NextResponse } from "next/server";

const NOMINATIM_BASE_URL = (
  process.env.GEOCODING_BASE_URL || "https://nominatim.openstreetmap.org"
).replace(/\/+$/, "");
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_LIMIT = 100;
const REQUEST_GAP_MS = 1100;

const state = globalThis.__acquireAutoGeocodingState || {
  cache: new Map(),
  queue: Promise.resolve(),
  lastRequestAt: 0,
};
globalThis.__acquireAutoGeocodingState = state;

function getCached(key) {
  const entry = state.cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    state.cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheResult(key, data) {
  if (state.cache.size >= CACHE_LIMIT) {
    const oldest = state.cache.keys().next().value;
    if (oldest) state.cache.delete(oldest);
  }
  state.cache.set(key, { data, createdAt: Date.now() });
}

async function nominatimRequest(url) {
  const request = state.queue.then(async () => {
    const delay = Math.max(0, REQUEST_GAP_MS - (Date.now() - state.lastRequestAt));
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    state.lastRequestAt = Date.now();
    return fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "AcquireAuto/1.0 (address search)",
      },
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
  });
  state.queue = request.then(
    () => undefined,
    () => undefined,
  );
  return request;
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  let endpoint;
  let cacheKey;

  if (kind === "search") {
    const query = params.get("q")?.trim();
    if (!query || query.length < 3 || query.length > 180) {
      return NextResponse.json(
        { error: "Enter at least 3 characters to search for a place." },
        { status: 400 },
      );
    }
    const search = new URL(`${NOMINATIM_BASE_URL}/search`);
    search.searchParams.set("q", query);
    search.searchParams.set("format", "jsonv2");
    search.searchParams.set("addressdetails", "1");
    search.searchParams.set("limit", "6");
    search.searchParams.set("accept-language", "en");
    endpoint = search;
    cacheKey = `search:${query.toLowerCase()}`;
  } else if (kind === "reverse") {
    const latitude = Number(params.get("lat"));
    const longitude = Number(params.get("lon"));
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      return NextResponse.json({ error: "Choose a valid point on the map." }, { status: 400 });
    }
    const reverse = new URL(`${NOMINATIM_BASE_URL}/reverse`);
    reverse.searchParams.set("lat", String(latitude));
    reverse.searchParams.set("lon", String(longitude));
    reverse.searchParams.set("format", "jsonv2");
    reverse.searchParams.set("zoom", "18");
    reverse.searchParams.set("addressdetails", "1");
    reverse.searchParams.set("accept-language", "en");
    endpoint = reverse;
    cacheKey = `reverse:${latitude.toFixed(5)}:${longitude.toFixed(5)}`;
  } else {
    return NextResponse.json({ error: "Choose search or reverse geocoding." }, { status: 400 });
  }

  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json(cached, { headers: { "X-Geocoding-Cache": "HIT" } });

  try {
    const response = await nominatimRequest(endpoint);
    if (!response.ok) {
      return NextResponse.json(
        { error: "The map search service is temporarily unavailable." },
        { status: 502 },
      );
    }
    const data = await response.json();
    cacheResult(cacheKey, data);
    return NextResponse.json(data, { headers: { "X-Geocoding-Cache": "MISS" } });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the map search service. Please try again." },
      { status: 502 },
    );
  }
}
