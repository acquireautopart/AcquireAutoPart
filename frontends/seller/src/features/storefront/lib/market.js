"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApiBase } from "@/lib/authApi";
import { setMarketFormatting } from "@/features/storefront/lib/format";

const COUNTRY_STORAGE_KEY = "acquireauto-market-country";
const MarketContext = createContext(null);

async function loadMarket(country) {
  const query = country ? `?country=${encodeURIComponent(country)}` : "";
  const response = await fetch(`${authApiBase}/market/context${query}`, { cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error(data?.message || "Could not determine your market.");
  }
  if (!Array.isArray(data.countries) || !data.countries.length) {
    throw new Error("The country and identity document list is unavailable. Try again shortly.");
  }
  return data;
}

export function MarketProvider({ children }) {
  const [market, setMarket] = useState({
    country: "US",
    countryName: "United States",
    currency: "USD",
    countries: [],
    rates: {},
    rateError: "",
  });
  const [error, setError] = useState("");

  const selectCountry = useCallback(async (country) => {
    window.localStorage.setItem(COUNTRY_STORAGE_KEY, country);
    setError("");
    try {
      const nextMarket = await loadMarket(country);
      setMarket(nextMarket);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  const refreshMarket = useCallback(async () => {
    setError("");
    try {
      const savedCountry = window.localStorage.getItem(COUNTRY_STORAGE_KEY);
      setMarket(await loadMarket(savedCountry || ""));
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    refreshMarket();
  }, [refreshMarket]);

  useEffect(() => {
    setMarketFormatting(market.currency, market.rates);
  }, [market]);

  const value = useMemo(
    () => ({ ...market, error, refreshMarket, selectCountry }),
    [market, error, refreshMarket, selectCountry],
  );
  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const market = useContext(MarketContext);
  if (!market) throw new Error("useMarket must be used within a MarketProvider.");
  return market;
}
