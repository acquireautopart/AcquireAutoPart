import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  LayoutDashboard,
  MapPin,
  Package,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

const navLinks = [
  { label: "Sell online", href: "#why" },
  { label: "How it works", href: "#journey" },
  { label: "Seller tools", href: "#tools" },
  { label: "Seller experience", href: "#stories" },
];

const stats = [
  { value: "24×7", label: "Your storefront stays open" },
  { value: "7-day", label: "Payout cycle after dispatch" },
  { value: "Fitment-first", label: "Vehicle-specific listings" },
  { value: "Nationwide", label: "One catalog, national reach" },
];

const reasons = [
  {
    icon: TrendingUp,
    tone: "t1",
    title: "Opportunity",
    description:
      "Reach buyers who are already searching for exact-fit parts — brakes, lighting, engine, and more.",
  },
  {
    icon: Sparkles,
    tone: "t2",
    title: "Ease of listing",
    description:
      "Create your seller account in minutes, then list your first part with fitment, pricing, and stock.",
  },
  {
    icon: BarChart3,
    tone: "t3",
    title: "Growth",
    description:
      "Discounts, analytics, and storefront tools help your listings get discovered and convert.",
  },
  {
    icon: ShieldCheck,
    tone: "t4",
    title: "Additional support",
    description:
      "Orders, returns, and payouts are handled end-to-end from one seller workspace.",
  },
];

const stories = [
  {
    icon: Wrench,
    title: "Help buyers find the right fit",
    description:
      "Keep vehicle compatibility, part numbers, and product details together so customers can choose with confidence.",
    label: "Catalog & fitment",
  },
  {
    icon: Package,
    title: "Keep orders moving",
    description:
      "Manage incoming orders, stock updates, returns, and shipment details from one seller workspace.",
    label: "Orders & inventory",
  },
  {
    icon: Wallet,
    title: "See what you earn",
    description:
      "Follow order earnings and payout status with clear payment information for your store.",
    label: "Payout visibility",
  },
];

const journey = [
  { icon: Users, title: "Create account", description: "Register your store and add your business details." },
  { icon: Package, title: "Add products", description: "Upload parts with photos, prices, and stock levels." },
  { icon: ClipboardCheck, title: "Set fitment", description: "Add vehicle details so shoppers can check compatibility." },
  { icon: Truck, title: "Ship orders", description: "Pack each order and share delivery tracking." },
  { icon: Wallet, title: "Track payouts", description: "Review order earnings and payout status in your hub." },
];

const tools = [
  {
    icon: Boxes,
    tone: "t1",
    title: "Product catalog & fitment",
    description: "Manage part photos, pricing, variants, and vehicle fitment in one place.",
    href: "/seller/products",
  },
  {
    icon: Package,
    tone: "t2",
    title: "Inventory control",
    description: "Track stock levels and get alerts before a part runs out.",
    href: "/seller/inventory",
  },
  {
    icon: ClipboardCheck,
    tone: "t3",
    title: "Order management",
    description: "Review incoming orders, update fulfillment, and share tracking.",
    href: "/seller/orders",
  },
  {
    icon: RotateCcw,
    tone: "t4",
    title: "Returns handling",
    description: "Keep return requests and resolutions organised in the same workspace.",
    href: "/seller/returns",
  },
  {
    icon: Wallet,
    tone: "t1",
    title: "Payouts",
    description: "See what you have earned and what is scheduled for the next cycle.",
    href: "/seller/payouts",
  },
  {
    icon: Tag,
    tone: "t2",
    title: "Analytics & discounts",
    description: "Understand best sellers and run discount codes that move stock.",
    href: "/seller/analytics",
  },
];

const sneakPeek = [
  {
    icon: LayoutDashboard,
    tone: "t1",
    eyebrow: "Seller workspace",
    title: "A dashboard built for your store",
    description:
      "See orders, revenue, and stock at a glance, then jump straight into the task that needs you.",
    points: ["Live order pipeline", "Low-stock alerts", "Sales trends"],
  },
  {
    icon: Search,
    tone: "t2",
    eyebrow: "Listing",
    title: "Listing made effortless",
    description:
      "Add a part, attach fitment details, and manage variants without leaving your catalog.",
    points: ["Fitment-first fields", "Bulk product import", "Draft and publish"],
  },
  {
    icon: Wallet,
    tone: "t3",
    eyebrow: "Payments",
    title: "Payments you can track",
    description:
      "Follow every order through dispatch to payout with a transparent, itemised breakdown.",
    points: ["Payout schedule", "Order-level earnings", "Fee clarity"],
  },
];

const categories = [
  "Brakes",
  "Suspension",
  "Engine",
  "Filters",
  "Lighting",
  "Electrical",
  "Body parts",
  "Cooling",
  "Exhaust",
  "Transmission",
  "Wheels & tyres",
  "Interior",
  "Accessories",
  "Oils & fluids",
];

const TONE_CLASS = {
  t1: "bg-[var(--sl-t1-bg)] text-[var(--sl-t1-fg)]",
  t2: "bg-[var(--sl-t2-bg)] text-[var(--sl-t2-fg)]",
  t3: "bg-[var(--sl-t3-bg)] text-[var(--sl-t3-fg)]",
  t4: "bg-[var(--sl-t4-bg)] text-[var(--sl-t4-fg)]",
};

function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--sl-brand)] text-white">
        <Store size={21} aria-hidden="true" />
      </span>
      <span className="font-display text-[17px] font-extrabold tracking-[-.06em] text-[var(--sl-text)]">
        Acquire<span className="text-[var(--sl-brand)]">Auto</span>
        <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-[.2em] sl-muted">
          Seller hub
        </span>
      </span>
    </span>
  );
}

export default function SellerLandingPage() {
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || "/";

  return (
    <main className="sl min-h-screen">
      <div className="bg-[#fff3cf] text-[#3d3321]">
        <div className="mx-auto flex min-h-10 w-full max-w-[1200px] flex-wrap items-center justify-center gap-x-2 px-5 py-2 text-center text-xs sm:justify-between sm:px-8 sm:text-sm">
          <span>Auto-parts sellers: reach more customers with AcquireAuto.</span>
          <Link href="/login" className="font-extrabold underline underline-offset-2">
            Already a seller? Sign in
          </Link>
        </div>
      </div>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--sl-border)] bg-[var(--sl-bg-2)] shadow-sm">
        <nav className="mx-auto flex min-h-[72px] w-full max-w-[1200px] items-center justify-between gap-5 px-5 sm:px-8">
          <Link href="/" aria-label="AcquireAuto seller home" className="shrink-0">
            <Logo />
          </Link>
          <div className="hidden items-center gap-7 text-sm font-semibold sl-soft md:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-[var(--sl-brand)]">
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-bold sl-soft transition hover:bg-[var(--sl-surface-2)] hover:text-[var(--sl-brand)]"
            >
              Seller login
            </Link>
            <Link href="/register" className="sl-btn-primary min-h-[42px] px-4 text-[13px]">
              Start selling <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Seller hero */}
      <section className="bg-[var(--sl-bg)]">
        <img
          src="/seller-zero-commission-banner.png"
          alt="AcquireAutoPart seller offer: 0% commission on selling auto parts"
          className="block h-auto w-full"
        />
        <div className="relative z-10 mx-auto -mt-7 grid w-[calc(100%-1rem)] max-w-[1200px] grid-cols-2 rounded-xl border border-[var(--sl-border)] bg-[var(--sl-surface)] px-3 py-4 shadow-[var(--sl-shadow-sm)] sm:px-5 lg:grid-cols-4 lg:divide-x lg:py-3">
          {stats.map((stat) => (
            <div key={stat.value} className="px-2 py-2 text-center">
              <p className="font-display text-xl font-extrabold tracking-tight text-[#0876d1] sm:text-2xl">
                {stat.value}
              </p>
              <p className="mt-1 text-[11px] font-semibold sl-muted sm:text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto w-full max-w-[1200px] px-5 pb-8 pt-5 sm:px-8">
          <div className="flex flex-col items-center justify-between gap-3 px-2 text-center sm:flex-row sm:text-left">
            <p className="flex items-center gap-2 text-xs font-semibold sl-muted">
              <ShieldCheck size={15} className="shrink-0 text-emerald-500" aria-hidden="true" />
              Seller accounts are reviewed before listings go live. Offer terms apply.
            </p>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold sl-soft sm:justify-end">
              <span className="inline-flex items-center gap-1.5"><Package size={14} className="text-[var(--sl-brand)]" /> Auto-parts focused</span>
              <span className="inline-flex items-center gap-1.5"><ClipboardCheck size={14} className="text-[var(--sl-brand)]" /> Orders in one hub</span>
              <span className="inline-flex items-center gap-1.5"><Wallet size={14} className="text-[var(--sl-brand)]" /> Clear payouts</span>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="sl-btn-primary min-h-12 px-7">
              Create your seller account <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link href="/login" className="sl-btn-ghost min-h-12 px-7">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Why sell here */}
      <section id="why" className="bg-[var(--sl-bg-2)]">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className="sl-eyebrow">Why sellers choose AcquireAuto</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-.7px] sm:text-4xl">
              <span className="text-[#0876d1]">Built for auto-parts sellers.</span> Ready for what’s next.
            </h2>
            <p className="mt-3 text-sm leading-6 sl-soft sm:text-base">
              List the right part with clear fitment details, then manage your catalog, stock, and
              orders from one seller account.
            </p>
          </div>
          <div className="mt-9 grid gap-5 lg:grid-cols-[1.35fr_.8fr] lg:items-stretch">
            <div className="grid gap-4 sm:grid-cols-2">
              {reasons.map(({ icon: Icon, tone, title, description }) => (
                <article
                  key={title}
                  className="sl-card p-5 sm:p-6"
                  style={{ boxShadow: "var(--sl-shadow-sm)" }}
                >
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${TONE_CLASS[tone]}`}>
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-extrabold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 sl-soft">{description}</p>
                </article>
              ))}
            </div>
            <figure className="relative min-h-[420px] overflow-hidden rounded-xl bg-[#eaf4fb] shadow-[var(--sl-shadow-sm)]">
              <img
                src="/seller-woman-mechanic.jpg"
                alt="Woman auto mechanic working beside an open car hood"
                className="absolute inset-0 h-full w-full object-cover object-top"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-5 pb-5 pt-20 text-white">
                <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-white/75">
                  Made for the people behind every part
                </p>
                <p className="mt-2 font-display text-xl font-extrabold leading-tight">
                  From the workshop to more customers online.
                </p>
                {/* <a
                  href="https://www.pexels.com/photo/woman-mechanic-in-front-of-a-car-14682210/"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-[10px] font-medium text-white/75 underline underline-offset-2"
                >
                  Photo by King Zubby on Pexels
                </a> */}
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* Success stories */}
      <section id="stories" className="border-y border-[#e5f1fb] bg-[#f0f8ff]">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div className="max-w-md">
            <p className="sl-eyebrow">A seller-first experience</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-.7px] sm:text-4xl">
              <span className="text-[#0876d1]">Your business.</span> All in one place.
            </h2>
            <p className="mt-4 text-sm leading-6 sl-soft sm:text-base">
              From a fitment-ready catalog to order updates and payouts, the tools are designed
              around the everyday needs of an auto-parts store.
            </p>
            <Link href="/register" className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#0876d1]">
              Start selling on AcquireAuto <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div>
            <div className="sl-story-carousel scrollbar-hide flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-[28px] shadow-[var(--sl-shadow-sm)]">
              {stories.map(({ icon: Icon, title, description, label }, index) => (
                <article
                  key={title}
                  id={`seller-story-${index}`}
                  className="relative flex min-h-[350px] min-w-full snap-center flex-col items-center justify-center bg-[var(--sl-bg-2)] px-10 py-10 text-center sm:px-16"
                >
                  <a
                    href={`#seller-story-${(index + stories.length - 1) % stories.length}`}
                    aria-label="Previous seller highlight"
                    className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--sl-border)] bg-[var(--sl-bg-2)] text-[#0876d1] shadow-sm transition hover:bg-[#f0f8ff]"
                  >
                    <ChevronLeft size={20} aria-hidden="true" />
                  </a>
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-[#fff3cf] text-[#0876d1]">
                    <Icon size={28} aria-hidden="true" />
                  </span>
                  <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#0876d1]">
                    {label}
                  </p>
                  <h3 className="mt-2 max-w-md font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {title}
                  </h3>
                  <p className="mt-4 max-w-md text-sm leading-6 sl-soft sm:text-base">
                    {description}
                  </p>
                  <a
                    href={`#seller-story-${(index + 1) % stories.length}`}
                    aria-label="Next seller highlight"
                    className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--sl-border)] bg-[var(--sl-bg-2)] text-[#0876d1] shadow-sm transition hover:bg-[#f0f8ff]"
                  >
                    <ChevronRight size={20} aria-hidden="true" />
                  </a>
                </article>
              ))}
            </div>
            <nav className="mt-4 flex justify-center gap-2" aria-label="Seller highlights">
              {stories.map((story, index) => (
                <a
                  key={story.title}
                  href={`#seller-story-${index}`}
                  aria-label={`Show ${story.title}`}
                  className="h-2.5 w-2.5 rounded-full bg-[#b8c5d1] transition hover:bg-[#0876d1] first:bg-[#0876d1]"
                />
              ))}
            </nav>
          </div>
        </div>
      </section>

      {/* Journey */}
      <section id="journey" className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="sl-eyebrow">Your journey on AcquireAuto</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-.7px] sm:text-4xl">
            From sign-up to your first payout
          </h2>
          <p className="mt-3 text-sm leading-6 sl-soft sm:text-base">
            Starting your online parts business is simple — five steps from account to payment.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {journey.map(({ icon: Icon, title, description }, index) => (
            <article key={title} className="relative rounded-xl bg-[#f0f8ff] p-5 sm:p-6">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--sl-bg-2)] text-xs font-extrabold text-[#0876d1] shadow-sm">
                {index + 1}
              </span>
              <span className="mt-4 grid h-12 w-12 place-items-center rounded-xl bg-[var(--sl-bg-2)] text-[#0876d1] shadow-sm">
                <Icon size={20} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-extrabold sm:min-h-12">{title}</h3>
              <p className="mt-2 text-sm leading-6 sl-soft">{description}</p>
            </article>
          ))}
        </div>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className="sl-btn-primary">
            Start selling <ArrowRight size={16} />
          </Link>
          <a
            href="/templates/seller-products-template.csv"
            download
            className="sl-btn-ghost"
          >
            Download product template
          </a>
        </div>
      </section>

      {/* Tools */}
      <section id="tools" className="border-y border-[#e5f1fb] bg-[#f0f8ff]">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className="sl-eyebrow">Access our tools</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-.7px] sm:text-4xl">
              Everything you need to grow faster
            </h2>
            <p className="mt-3 text-sm leading-6 sl-soft sm:text-base">
              With your AcquireAuto seller account you get a set of tools designed to help your
              parts business sell more online.
            </p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tools.map(({ icon: Icon, tone, title, description, href }) => (
              <article key={title} className="flex h-full flex-col rounded-xl bg-[var(--sl-bg-2)] p-6 shadow-[var(--sl-shadow-sm)]">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${TONE_CLASS[tone]}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-extrabold">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 sl-soft">{description}</p>
                <Link
                  href={href}
                  className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-[#0876d1] transition hover:text-[var(--sl-brand)]"
                >
                  Learn more <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Promo strip */}
      <section className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8">
        <div
          className="sl-card overflow-hidden"
          style={{ boxShadow: "var(--sl-shadow)" }}
        >
          <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div>
              <p className="sl-eyebrow">Your gateway to selling online</p>
              <h2 className="mt-3 font-display text-2xl font-extrabold tracking-[-.5px] sm:text-3xl">
                A marketplace that speaks auto parts
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 sl-soft">
                Fitment-aware listings, transparent fees, and a seller workspace built around the way
                parts actually sell.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="sl-btn-primary">
                  Create seller account
                </Link>
                <Link href="/login" className="sl-btn-ghost">
                  Seller login
                </Link>
              </div>
            </div>
            <div className="grid gap-3">
              {[
                { icon: Wrench, text: "Fitment-aware listings buyers can trust" },
                { icon: Wallet, text: "Low cost of doing business" },
                { icon: MapPin, text: "Reach buyers beyond your local area" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-3 rounded-xl bg-[var(--sl-surface-2)] px-4 py-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--sl-brand-soft)] text-[var(--sl-brand)]">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sneak peek */}
      <section className="border-y border-[var(--sl-border)] bg-[var(--sl-bg-2)]">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="sl-eyebrow">Take a sneak peek</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-.7px] sm:text-4xl">
              Inside the seller workspace
            </h2>
            <p className="mt-3 text-sm leading-6 sl-soft sm:text-base">
              A quick look at the tools you get the moment your seller account is approved.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {sneakPeek.map(({ icon: Icon, tone, eyebrow, title, description, points }) => (
              <article key={title} className="sl-card flex h-full flex-col p-6">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${TONE_CLASS[tone]}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.16em] sl-muted">
                  {eyebrow}
                </p>
                <h3 className="mt-1 text-base font-extrabold">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 sl-soft">{description}</p>
                <ul className="mt-4 space-y-2 border-t border-[var(--sl-border-soft)] pt-4">
                  {points.map((point) => (
                    <li key={point} className="flex items-center gap-2 text-xs font-semibold sl-soft">
                      <CheckCircle2 size={14} className="shrink-0 text-emerald-500" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Help */}
      <section className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="sl-card flex flex-col items-center gap-5 p-8 text-center sm:p-12">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--sl-brand-soft)] text-[var(--sl-brand)]">
            <BadgeCheck size={24} aria-hidden="true" />
          </span>
          <h2 className="font-display text-2xl font-extrabold tracking-[-.5px] sm:text-3xl">
            We are happy to help you
          </h2>
          <p className="max-w-2xl text-sm leading-6 sl-soft">
            Questions about listing, verification, payouts, or returns? Log in to your seller hub and
            our tools will guide you through every step.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="sl-btn-primary">
              Go to seller hub
            </Link>
            <Link href="/register" className="sl-btn-ghost">
              Create an account
            </Link>
          </div>
        </div>
      </section>

      {/* Popular categories */}
      <section className="border-t border-[var(--sl-border)] bg-[var(--sl-bg-2)]">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8">
          <p className="sl-eyebrow">Popular categories to sell</p>
          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-[-.5px] sm:text-3xl">
            Find your category on AcquireAuto
          </h2>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {categories.map((category) => (
              <span key={category} className="sl-chip">
                {category}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--sl-border)] bg-[#0f0f10] text-white">
        <div className="mx-auto grid w-full max-w-[1200px] gap-9 px-5 py-12 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Link href="/" aria-label="AcquireAuto seller home" className="inline-block">
              <Logo />
            </Link>
            <p className="max-w-sm text-xs leading-5 text-white/55">
              A dedicated seller hub for auto-parts businesses. List parts, manage orders, and grow your store with AcquireAuto.
            </p>
            <Link
              href={storeUrl}
              className="inline-flex items-center gap-2 text-xs font-bold text-[var(--sl-brand)] transition hover:text-white"
            >
              Visit AcquireAuto Store <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <nav className="flex flex-col items-start gap-3 text-xs font-semibold text-white/65" aria-label="Seller resources">
            <h2 className="mb-1 text-[11px] font-extrabold uppercase tracking-[.14em] text-white">Seller resources</h2>
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-white">{link.label}</a>
            ))}
          </nav>
          <nav className="flex flex-col items-start gap-3 text-xs font-semibold text-white/65" aria-label="Seller account">
            <h2 className="mb-1 text-[11px] font-extrabold uppercase tracking-[.14em] text-white">Your account</h2>
            <Link href="/register" className="transition hover:text-white">Create seller account</Link>
            <Link href="/login" className="transition hover:text-white">Seller login</Link>
            <a href="/templates/seller-products-template.csv" download className="transition hover:text-white">Product upload template</a>
          </nav>
          <div className="flex flex-col items-start gap-3 text-xs text-white/60">
            <h2 className="mb-1 text-[11px] font-extrabold uppercase tracking-[.14em] text-white">Need help?</h2>
            <span className="inline-flex items-center gap-2"><Clock size={14} aria-hidden="true" /> Support in your seller hub</span>
            <Link href="/login" className="font-bold text-[var(--sl-brand)] transition hover:text-white">Open seller hub</Link>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto w-full max-w-[1200px] px-5 py-4 text-[11px] text-white/40 sm:px-8">
            © {new Date().getFullYear()} AcquireAuto. Built for auto-parts sellers.
          </p>
        </div>
      </footer>
    </main>
  );
}
