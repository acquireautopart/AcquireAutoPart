const {
  getCountry,
  getCountryOptions,
  getIdentityDocumentTypes,
} = require("./countries");
const Seller = require("../seller/models/Seller");
const Product = require("../seller/models/Product");

const RATE_TTL_MS = 60 * 60 * 1000;
const PRODUCT_MARKETS_TTL_MS = 30 * 1000;
let cachedRates;
let cachedProductMarkets;
let cachedProductMarketsUntil = 0;
let pendingProductMarkets;

function resolveCountry(headers = {}, requestedCountry) {
  const explicit = getCountry(requestedCountry);
  if (explicit) return explicit;
  const proxyCountry = getCountry(
    headers["x-vercel-ip-country"] || headers["cf-ipcountry"],
  );
  return proxyCountry || getCountry("US");
}

function resolveCountryWithListings(headers, requestedCountry, productMarkets) {
  const requested = getCountry(requestedCountry);
  if (requested) return requested;

  const preferred = resolveCountry(headers, requestedCountry);
  if (
    productMarkets.some(
      (market) => market._id === preferred.code && market.productCount > 0,
    )
  ) {
    return preferred;
  }
  return getCountry(productMarkets[0]?._id) || preferred;
}

async function getProductMarkets() {
  if (cachedProductMarkets && cachedProductMarketsUntil > Date.now()) {
    return cachedProductMarkets;
  }
  if (pendingProductMarkets) return pendingProductMarkets;

  pendingProductMarkets = (async () => {
    const approvedSellers = await Seller.find({
      $or: [
        { adminStatus: "Approved" },
        { adminStatus: { $exists: false }, verified: true },
      ],
    }).distinct("_id");
    if (!approvedSellers.length) return [];

    return Product.aggregate([
      {
        $match: {
          seller: { $in: approvedSellers },
          status: "Active",
          stock: { $gt: 0 },
        },
      },
      { $group: { _id: "$seller", productCount: { $sum: 1 } } },
      {
        $lookup: {
          from: Seller.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "seller",
        },
      },
      { $unwind: "$seller" },
      {
        $group: {
          _id: "$seller.country",
          productCount: { $sum: "$productCount" },
        },
      },
      { $sort: { productCount: -1, _id: 1 } },
    ]);
  })()
    .then((markets) => {
      cachedProductMarkets = markets;
      cachedProductMarketsUntil = Date.now() + PRODUCT_MARKETS_TTL_MS;
      return markets;
    })
    .finally(() => {
      pendingProductMarkets = null;
    });

  return pendingProductMarkets;
}

async function getRates() {
  if (cachedRates && cachedRates.expiresAt > Date.now()) return cachedRates;

  const response = await fetch(
    "https://api.frankfurter.dev/v1/latest?base=USD",
    {
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) {
    throw new Error(`Exchange-rate service returned ${response.status}.`);
  }
  const data = await response.json();
  if (data.base !== "USD" || !data.rates || typeof data.rates !== "object") {
    throw new Error("Exchange-rate service returned invalid rate data.");
  }
  cachedRates = {
    rates: { USD: 1, ...data.rates },
    updatedAt: data.date,
    expiresAt: Date.now() + RATE_TTL_MS,
  };
  return cachedRates;
}

async function getMarketContext(headers, requestedCountry) {
  const productMarkets = requestedCountry ? [] : await getProductMarkets();
  const country = requestedCountry
    ? resolveCountry(headers, requestedCountry)
    : resolveCountryWithListings(headers, requestedCountry, productMarkets);
  let rates;
  let rateError = "";
  let updatedAt = "";
  try {
    ({ rates, updatedAt } = await getRates());
  } catch {
    rateError = "Live currency conversion is temporarily unavailable.";
  }
  return {
    country: country.code,
    countryName: country.name,
    currency: country.currency,
    documentTypes: getIdentityDocumentTypes(country.code),
    countries: getCountryOptions(),
    rates: rates || {},
    ratesUpdatedAt: updatedAt,
    rateError,
  };
}

module.exports = {
  resolveCountry,
  resolveCountryWithListings,
  getMarketContext,
};
