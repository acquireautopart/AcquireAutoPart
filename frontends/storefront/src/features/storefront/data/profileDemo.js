// Demo data for the profile pages.
// The backend currently exposes only name / email / role (GET /api/auth/me).
// Everything below is placeholder data until orders, wishlist, addresses etc. get real APIs.

export const demoProfile = {
  phone: "+91 98765 43210",
  memberSince: "Oct 2025",
  tier: "Premium Customer",
  cartCount: 3,
};

export const demoOrders = [
  { id: "#AP1005", date: "Oct 20, 2025", total: 89.99, status: "Delivered" },
  { id: "#AP1004", date: "Oct 15, 2025", total: 129.99, status: "Processing" },
  { id: "#AP1003", date: "Oct 10, 2025", total: 64.5, status: "Shipped" },
  { id: "#AP1002", date: "Oct 05, 2025", total: 42.75, status: "Delivered" },
  { id: "#AP1001", date: "Sep 28, 2025", total: 110.0, status: "Delivered" },
];

export const demoVehicles = [
  {
    id: "v1",
    name: "BMW 5 Series",
    years: "2018 - 2023",
    engine: "2.0L Turbo Petrol",
    fuel: "Petrol",
    parts: 248,
    image: "https://res.cloudinary.com/l8vkwojw/image/upload/v1794229943/acquireauto/project-images/44ff20825869df2bc3ab6da0448f8d29.png",
    isPrimary: true,
  },
  {
    id: "v2",
    name: "Audi A4",
    years: "2016 - 2021",
    engine: "1.4L TFSI",
    fuel: "Petrol",
    parts: 196,
    image: "https://res.cloudinary.com/l8vkwojw/image/upload/v1794229941/acquireauto/project-images/64ff6b29128b589ae02a506f439597b5.png",
    isPrimary: false,
  },
  {
    id: "v3",
    name: "Toyota Fortuner",
    years: "2019 - 2024",
    engine: "2.8L Diesel",
    fuel: "Diesel",
    parts: 312,
    image: "https://res.cloudinary.com/l8vkwojw/image/upload/v1794229943/acquireauto/project-images/44ff20825869df2bc3ab6da0448f8d29.png",
    isPrimary: false,
  },
];

const discBrakeImage =
  "https://res.cloudinary.com/l8vkwojw/image/upload/v1794229796/acquireauto/project-images/cd387c4bd38978e4344bce085864e323.jpg";
const suspensionImage =
  "https://res.cloudinary.com/l8vkwojw/image/upload/v1794229797/acquireauto/project-images/a2f359a87f8404873d4ea747d51c1e92.jpg";
const headlightImage =
  "https://res.cloudinary.com/l8vkwojw/image/upload/v1794229798/acquireauto/project-images/2149fa68e007c48b1217df33993a7a0c.jpg";
const engineImage =
  "https://res.cloudinary.com/l8vkwojw/image/upload/v1794229799/acquireauto/project-images/abe535543140983d017fe391bd94e1e1.jpg";
const filterImage = "https://res.cloudinary.com/l8vkwojw/image/upload/v1794229934/acquireauto/project-images/ef9cc77c04bbffd9e748c7adafd2324a.jpg";
const mirrorImage =
  "https://res.cloudinary.com/l8vkwojw/image/upload/v1794229935/acquireauto/project-images/037781abda3106e6ca62a39a3f706ab6.jpg";

export const demoWishlist = [
  {
    id: "w1",
    name: "Brembo Brake Disc & Pads",
    brand: "Brembo",
    category: "Brakes",
    price: 169.99,
    oldPrice: 214.0,
    rating: 5,
    reviews: 128,
    stock: "In stock",
    image: discBrakeImage,
  },
  {
    id: "w2",
    name: "Premium Ceramic Brake Pad Set",
    brand: "AcquireAuto",
    category: "Brakes",
    price: 42.5,
    oldPrice: 58.0,
    rating: 4,
    reviews: 86,
    stock: "In stock",
    image: suspensionImage,
  },
  {
    id: "w3",
    name: "Projector Headlight Assembly",
    brand: "Valeo",
    category: "Lighting",
    price: 124.95,
    oldPrice: 159.99,
    rating: 5,
    reviews: 64,
    stock: "Only 3 left",
    image: headlightImage,
  },
  {
    id: "w4",
    name: "Engine Air Filter Replacement",
    brand: "Mann Filter",
    category: "Filters",
    price: 18.99,
    oldPrice: 24.99,
    rating: 4,
    reviews: 41,
    stock: "In stock",
    image: filterImage,
  },
  {
    id: "w5",
    name: "Forged Piston & Ring Kit",
    brand: "Mahle",
    category: "Engine",
    price: 289.0,
    oldPrice: null,
    rating: 5,
    reviews: 22,
    stock: "Ships in 5 days",
    image: engineImage,
  },
  {
    id: "w6",
    name: "Power Side Mirror Assembly",
    brand: "TYC",
    category: "Body parts",
    price: 76.25,
    oldPrice: 92.0,
    rating: 3,
    reviews: 18,
    stock: "In stock",
    image: mirrorImage,
  },
];

export const demoAddresses = [
  {
    id: "a1",
    label: "Home",
    name: "Dheeraj Sharma",
    line: "123 Main Street, Sector 12",
    city: "New Delhi",
    region: "Delhi",
    postalCode: "110001",
    phone: "+91 98765 43210",
    isDefault: true,
  },
  {
    id: "a2",
    label: "Office",
    name: "Dheeraj Sharma",
    line: "456 Business Park, Tower B",
    city: "Gurgaon",
    region: "Haryana",
    postalCode: "122001",
    phone: "+91 98765 43210",
    isDefault: false,
  },
  {
    id: "a3",
    label: "Workshop",
    name: "Auto Care Garage",
    line: "78 Industrial Area, Phase 2",
    city: "Noida",
    region: "Uttar Pradesh",
    postalCode: "201301",
    phone: "+91 90123 45678",
    isDefault: false,
  },
];

export const demoPayments = [
  {
    id: "p1",
    brand: "Visa",
    type: "Credit card",
    last4: "4242",
    holder: "Dheeraj Sharma",
    expires: "12/28",
    isDefault: true,
  },
  {
    id: "p2",
    brand: "Mastercard",
    type: "Debit card",
    last4: "8810",
    holder: "Dheeraj Sharma",
    expires: "07/27",
    isDefault: false,
  },
  {
    id: "p3",
    brand: "PayPal",
    type: "Wallet",
    last4: "9K2L",
    holder: "dheeraj@example.com",
    expires: "",
    isDefault: false,
  },
];

export const demoWallet = {
  balance: 245.5,
  pending: 32.0,
  cashbackEarned: 68.25,
  updatedAt: "Nov 02, 2025",
};

export const demoWalletTransactions = [
  {
    id: "wt1",
    type: "credit",
    title: "Cashback · Order #AP1005",
    date: "Oct 22, 2025",
    amount: 8.99,
    status: "Completed",
  },
  {
    id: "wt2",
    type: "debit",
    title: "Applied to Order #AP1004",
    date: "Oct 15, 2025",
    amount: 25.0,
    status: "Completed",
  },
  {
    id: "wt3",
    type: "credit",
    title: "Refund · Order #AP1002",
    date: "Oct 09, 2025",
    amount: 42.75,
    status: "Completed",
  },
  {
    id: "wt4",
    type: "credit",
    title: "Welcome bonus",
    date: "Oct 01, 2025",
    amount: 15.0,
    status: "Completed",
  },
  {
    id: "wt5",
    type: "debit",
    title: "Withdrawal to bank account",
    date: "Sep 28, 2025",
    amount: 50.0,
    status: "Processing",
  },
];

export const demoLedger = [
  {
    id: "lg1",
    date: "Oct 22, 2025",
    ref: "CB-AP1005",
    description: "Cashback credit",
    method: "Wallet",
    type: "credit",
    amount: 8.99,
    balance: 245.5,
  },
  {
    id: "lg2",
    date: "Oct 15, 2025",
    ref: "PAY-AP1004",
    description: "Wallet applied to order",
    method: "Wallet",
    type: "debit",
    amount: 25.0,
    balance: 236.51,
  },
  {
    id: "lg3",
    date: "Oct 09, 2025",
    ref: "RF-AP1002",
    description: "Refund for returned part",
    method: "Original payment",
    type: "credit",
    amount: 42.75,
    balance: 261.51,
  },
  {
    id: "lg4",
    date: "Oct 01, 2025",
    ref: "BN-WELCOME",
    description: "Welcome bonus credit",
    method: "Promo",
    type: "credit",
    amount: 15.0,
    balance: 218.76,
  },
  {
    id: "lg5",
    date: "Sep 28, 2025",
    ref: "WD-90012",
    description: "Withdrawal to bank account",
    method: "Bank transfer",
    type: "debit",
    amount: 50.0,
    balance: 203.76,
  },
  {
    id: "lg6",
    date: "Sep 20, 2025",
    ref: "CB-AP1001",
    description: "Cashback credit",
    method: "Wallet",
    type: "credit",
    amount: 11.0,
    balance: 253.76,
  },
];

export const demoKyc = {
  status: "In progress",
  level: 2,
  maxLevel: 3,
  steps: [
    {
      id: "email",
      label: "Email address",
      detail: "dheeraj@example.com",
      status: "verified",
    },
    {
      id: "phone",
      label: "Mobile number",
      detail: "+91 98765 43210",
      status: "verified",
    },
    {
      id: "identity",
      label: "Identity proof",
      detail: "PAN card or government photo ID",
      status: "pending",
    },
    {
      id: "address",
      label: "Address proof",
      detail: "Utility bill or rent agreement",
      status: "pending",
    },
    {
      id: "bank",
      label: "Bank account",
      detail: "Required for refunds and payouts",
      status: "none",
    },
  ],
};

export const demoReturns = [
  {
    id: "RMA-2041",
    order: "#AP1003",
    item: "Projector Headlight Assembly",
    reason: "Damaged on arrival",
    status: "Refunded",
    requested: "Oct 12, 2025",
    refund: 64.5,
    timeline: [
      { label: "Return requested", date: "Oct 12", done: true },
      { label: "Approved", date: "Oct 13", done: true },
      { label: "Picked up", date: "Oct 15", done: true },
      { label: "Refund issued", date: "Oct 18", done: true },
    ],
  },
  {
    id: "RMA-2038",
    order: "#AP1002",
    item: "Premium Ceramic Brake Pad Set",
    reason: "Wrong part for my vehicle",
    status: "In transit",
    requested: "Oct 07, 2025",
    refund: 42.75,
    timeline: [
      { label: "Return requested", date: "Oct 07", done: true },
      { label: "Approved", date: "Oct 08", done: true },
      { label: "Picked up", date: "Oct 11", done: true },
      { label: "Refund issued", date: "Pending", done: false },
    ],
  },
  {
    id: "RMA-2032",
    order: "#AP1001",
    item: "Engine Air Filter Replacement",
    reason: "No longer needed",
    status: "Requested",
    requested: "Sep 30, 2025",
    refund: 18.99,
    timeline: [
      { label: "Return requested", date: "Sep 30", done: true },
      { label: "Approved", date: "Under review", done: false },
      { label: "Picked up", date: "Pending", done: false },
      { label: "Refund issued", date: "Pending", done: false },
    ],
  },
];

export const demoSettings = {
  profile: {
    name: "Dheeraj Sharma",
    email: "dheeraj@example.com",
    phone: "+91 98765 43210",
  },
  preferences: [
    {
      id: "orderUpdates",
      label: "Order & delivery updates",
      detail: "Email and SMS alerts about your orders",
      enabled: true,
    },
    {
      id: "priceDrops",
      label: "Price drop alerts",
      detail: "Tell me when a saved part gets cheaper",
      enabled: true,
    },
    {
      id: "newsletter",
      label: "Offers & newsletter",
      detail: "Deals, new arrivals and garage tips",
      enabled: false,
    },
    {
      id: "twoFactor",
      label: "Two-factor authentication",
      detail: "Extra verification code at sign-in",
      enabled: false,
    },
  ],
};

export const demoContactChannels = [
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

export const demoFaqs = [
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

export const brakeDiscImage = discBrakeImage;
