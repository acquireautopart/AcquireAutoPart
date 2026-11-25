/* Static reference data served to the customer profile pages. */

const KYC_STEP_DEFINITIONS = [
  { key: "email", label: "Email address" },
  { key: "phone", label: "Mobile number" },
  { key: "identity", label: "Identity proof" },
  { key: "address", label: "Address proof" },
  { key: "bank", label: "Bank account" },
];

const KYC_STEP_DEFAULTS = {
  email: { status: "verified", detail: "" },
  phone: { status: "pending", detail: "Add a mobile number to verify" },
  identity: { status: "pending", detail: "PAN card or government photo ID" },
  address: { status: "pending", detail: "Utility bill or rent agreement" },
  bank: { status: "none", detail: "Required for refunds and payouts" },
};

const CONTACT_CHANNELS = [
  {
    id: "phone",
    icon: "phone",
    label: "Call us",
    value: "+1 (800) 555-0142",
    detail: "Mon–Sat, 9:00am – 7:00pm",
    href: "tel:+18005550142",
  },
  {
    id: "email",
    icon: "mail",
    label: "Email support",
    value: "support@acquireautopart.com",
    detail: "Replies within 24 hours",
    href: "mailto:support@acquireautopart.com",
  },
  {
    id: "chat",
    icon: "chat",
    label: "Live chat",
    value: "Start a chat",
    detail: "Average wait under 2 minutes",
    href: null,
  },
  {
    id: "whatsapp",
    icon: "whatsapp",
    label: "WhatsApp",
    value: "+1 (800) 555-0142",
    detail: "Send photos of the part",
    href: "tel:+18005550142",
  },
];

const SUPPORT_FAQS = [
  {
    q: "How do I find the right part for my vehicle?",
    a: "Save your vehicle in Saved Vehicles and every search is filtered to parts that fit exactly.",
  },
  {
    q: "How long does a refund take?",
    a: "Refunds are issued within 3–5 business days after the returned part passes inspection.",
  },
  {
    q: "Do you ship internationally?",
    a: "Yes — shipping options and duties are calculated at checkout for your delivery address.",
  },
  {
    q: "Can I change my order after placing it?",
    a: "Orders can be changed within 1 hour of placing them. Contact support with your order ID.",
  },
];

const SUPPORT_DETAILS = {
  hours:
    "Monday to Saturday, 9:00am – 7:00pm. Average first reply within 4 hours.",
  address:
    "AcquireAuto Parts · 24 Garage Road, Industrial Area, New Delhi 110001 · support@acquireautopart.com",
};

const CONTACT_SUBJECTS = [
  "Order or delivery",
  "Return or refund",
  "Fitment help",
  "Payment issue",
  "Account & KYC",
  "Something else",
];

const RETURN_TIMELINE_LABELS = [
  "Return requested",
  "Approved",
  "Picked up",
  "Refund issued",
];

const LEDGER_CHANNELS = [
  "Wallet",
  "Card",
  "Bank transfer",
  "Promo",
  "Original payment",
];

const WISHLIST_SORTS = ["recent", "price-low", "price-high", "rating"];

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

module.exports = {
  KYC_STEP_DEFINITIONS,
  KYC_STEP_DEFAULTS,
  CONTACT_CHANNELS,
  CONTACT_SUBJECTS,
  SUPPORT_FAQS,
  SUPPORT_DETAILS,
  RETURN_TIMELINE_LABELS,
  LEDGER_CHANNELS,
  WISHLIST_SORTS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
};
