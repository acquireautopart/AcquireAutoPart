let marketCurrency = "USD";
let marketRates = { USD: 1 };

export function setMarketFormatting(currency, rates) {
  marketCurrency = currency || "USD";
  marketRates = rates && typeof rates === "object" ? rates : { USD: 1 };
}

export function formatPrice(amount, sourceCurrency = marketCurrency) {
  const sourceRate = Number(marketRates[sourceCurrency]);
  const targetRate = Number(marketRates[marketCurrency]);
  const canConvert =
    sourceCurrency === marketCurrency ||
    (Number.isFinite(sourceRate) &&
      sourceRate > 0 &&
      Number.isFinite(targetRate) &&
      targetRate > 0);
  const value =
    canConvert && sourceCurrency !== marketCurrency
      ? (Number(amount) / sourceRate) * targetRate
      : Number(amount);
  const currency = canConvert ? marketCurrency : sourceCurrency;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
