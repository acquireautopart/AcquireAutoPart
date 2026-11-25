const countryCurrency = require("iso-country-currency");

const countries = countryCurrency
  .getAllISOCodes()
  .filter(
    (country) =>
      /^[A-Z]{2}$/.test(country.iso) && /^[A-Z]{3}$/.test(country.currency),
  )
  .map(({ iso, countryName, currency, symbol }) => ({
    code: iso,
    name: countryName,
    currency,
    symbol,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const countriesByCode = new Map(
  countries.map((country) => [country.code, country]),
);

const countryDocumentTypes = {
  AE: ["Emirates ID", "Passport", "Residence permit"],
  AU: [
    "Australian passport",
    "Driver licence",
    "Photo ID card",
    "Residence permit",
  ],
  BD: ["National ID card (NID)", "Passport", "Driving licence"],
  BR: [
    "Identity card (RG)",
    "Driver licence (CNH)",
    "Passport",
    "Residence permit",
  ],
  CA: [
    "Canadian passport",
    "Provincial or territorial photo ID",
    "Permanent resident card",
  ],
  DE: ["German identity card", "Passport", "Residence permit"],
  FR: ["National identity card", "Passport", "Residence permit"],
  GB: ["UK passport", "Photocard driving licence", "Residence permit"],
  IN: ["Aadhaar card", "PAN card", "Voter ID", "Passport", "Driving licence"],
  JP: [
    "My Number card",
    "Japanese passport",
    "Driver licence",
    "Residence card",
  ],
  NG: ["National ID (NIN)", "Passport", "Driving licence"],
  PK: ["National identity card (CNIC)", "Passport", "Driving licence"],
  SA: ["National ID", "Passport", "Iqama / residence permit"],
  SG: ["National registration identity card", "Passport", "Work pass"],
  US: [
    "State-issued driver licence or ID",
    "US passport",
    "Permanent resident card",
  ],
};

function getCountry(code) {
  if (typeof code !== "string") return null;
  return countriesByCode.get(code.trim().toUpperCase()) || null;
}

function getIdentityDocumentTypes(code) {
  const country = getCountry(code);
  if (!country) return [];
  return (
    countryDocumentTypes[country.code] || [
      "Passport",
      "National identity card",
      "Driver licence",
      "Residence permit",
    ]
  );
}

// Country-specific business tax identifier. `required` decides whether sellers
// must provide it before going live. Countries without a rule use a generic,
// optional tax ID so the flow works worldwide.
const countryTaxInfo = {
  IN: { label: "GSTIN", placeholder: "15-character GSTIN", required: true },
  US: {
    label: "Federal Tax ID (EIN / SSN)",
    placeholder: "EIN or SSN",
    required: false,
  },
  GB: {
    label: "UTR / VAT Registration Number",
    placeholder: "10-digit UTR or 9-character VAT number",
    required: false,
  },
  JP: {
    label: "Corporate Number / My Number",
    placeholder: "13-digit Corporate Number or 12-digit My Number",
    required: false,
  },
};

function getTaxInfo(code) {
  const country = getCountry(code);
  if (!country) return null;
  return (
    countryTaxInfo[country.code] || {
      label: "Tax ID",
      placeholder: "Tax identification number (if applicable)",
      required: false,
    }
  );
}

function getCountryOptions() {
  return countries.map((country) => ({
    ...country,
    documentTypes: getIdentityDocumentTypes(country.code),
    taxInfo: getTaxInfo(country.code),
  }));
}

module.exports = {
  countries,
  getCountry,
  getIdentityDocumentTypes,
  getTaxInfo,
  getCountryOptions,
};
