"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Box,
  Calendar,
  CircleDollarSign,
  CreditCard,
  Heart,
  Headset,
  Car,
  Mail,
  MapPin,
  PackageOpen,
  Pencil,
  Phone,
  ReceiptText,
  ShieldCheck,
  Settings,
  Star,
  Undo2,
  Wrench,
  Wallet,
} from "lucide-react";
import { formatPrice } from "@/features/storefront/lib/format";
import { getImageUrl } from "@/features/storefront/lib/imageUrl";
import { brakeDiscImage } from "@/features/storefront/data/profileDemo";
import { Avatar } from "@/features/profile/components/ProfileSidebar";

/* ───────── small shared bits ───────── */

function SectionTitle({ icon: Icon, children, right }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-3 text-[15px] font-bold">
        <Icon size={22} className="text-[var(--pf-brand)]" strokeWidth={1.7} />
        {children}
      </h3>
      {right}
    </div>
  );
}

function ArrowLink({ href = "#", onClick, children, className = "" }) {
  const cls = `inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--pf-brand)] hover:underline ${className}`;
  if (onClick)
    return (
      <button type="button" className={cls} onClick={onClick}>
        {children} <ArrowRight size={13} />
      </button>
    );
  return (
    <Link href={href} className={cls}>
      {children} <ArrowRight size={13} />
    </Link>
  );
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const statusStyle = {
  Delivered: "bg-[var(--pf-ok-bg)] text-[var(--pf-ok)]",
  Processing: "bg-[var(--pf-warn-bg)] text-[var(--pf-warn)]",
  Shipped: "bg-[var(--pf-info-bg)] text-[var(--pf-info)]",
  Cancelled: "bg-red-500/15 text-red-500",
};

/* ───────── hero card ───────── */

export function ProfileHeroBanner({ onEdit }) {
  return (
    <section
      className="pf-hero-scene relative mx-2 mt-2 overflow-hidden rounded-lg border border-[var(--pf-border)] sm:mx-4 lg:mx-auto lg:max-w-[1280px]"
      style={{ background: "var(--pf-hero-bg)" }}
    >
      <div className="relative mx-auto flex min-h-[112px] max-w-[1280px] items-center px-3 py-3 min-[480px]:min-h-[94px] min-[480px]:px-4 sm:px-6 lg:min-h-[112px]">
        <div className="relative z-20 max-w-[68%] min-[480px]:max-w-[64%] sm:max-w-[58%]">
          <p className="mb-1 text-[9px] font-semibold tracking-[.02em] text-[var(--pf-text-2)] sm:text-[10px]">
            Acquire Routine
          </p>
          <h1 className="font-display text-[25px] font-extrabold leading-none tracking-tight min-[480px]:text-[30px] sm:text-[36px]">
            My <span className="text-[var(--pf-brand)]">Profile</span>
          </h1>
          <p className="mt-1.5 max-w-[150px] text-[10px] leading-tight text-[var(--pf-text-2)] min-[480px]:max-w-[180px] min-[480px]:text-[11px] sm:mt-2 sm:max-w-none sm:text-xs sm:leading-normal">
            Manage your account, orders, and preferences
          </p>
        </div>
        <img
          src="https://res.cloudinary.com/l8vkwojw/image/upload/v1794229943/acquireauto/project-images/44ff20825869df2bc3ab6da0448f8d29.png"
          alt=""
          aria-hidden="true"
          className="pf-hero-car pointer-events-none absolute right-[8%] top-1/2 z-10 w-[205px] -translate-y-1/2 object-contain opacity-80 min-[480px]:right-[14%] min-[480px]:w-[260px] sm:w-[300px] md:w-[360px] lg:w-[390px]"
        />
        <button
          onClick={onEdit}
          aria-label="Edit profile"
          title="Edit profile"
          className="absolute right-2 top-2 z-30 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--pf-border)] bg-[var(--pf-card)]/80 text-[var(--pf-text)] backdrop-blur hover:border-[var(--pf-brand)] hover:text-[var(--pf-brand)] min-[480px]:right-3 min-[480px]:top-1/2 min-[480px]:-translate-y-1/2 sm:right-5 sm:h-auto sm:w-auto sm:min-h-8 sm:gap-1.5 sm:px-3 sm:text-xs sm:font-semibold"
        >
          <Pencil size={14} />
          <span className="hidden sm:inline">Edit Profile</span>
        </button>
      </div>
    </section>
  );
}

export function ProfileCard({ customer, profile, memberSince }) {
  return (
    <section
      id="overview"
      className="pf-card relative scroll-mt-20 overflow-hidden p-3.5 min-[480px]:p-4 sm:scroll-mt-32 sm:p-6"
    >
      <img
        src={brakeDiscImage}
        alt=""
        aria-hidden="true"
        onError={(e) => (e.currentTarget.style.display = "none")}
        className="pointer-events-none absolute -right-6 top-0 hidden h-full w-[360px] object-cover opacity-30 [mask-image:linear-gradient(to_left,black,transparent)] sm:block"
      />
      <div className="relative flex min-w-0 items-center gap-3 text-left min-[480px]:gap-4 sm:gap-5">
        <Avatar size={64} className="sm:hidden" customer={customer} />
        <Avatar size={88} className="hidden sm:block" customer={customer} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="max-w-full break-words font-display text-base font-extrabold min-[480px]:text-lg sm:text-2xl">
              {customer.name}
            </h2>
            <span className="rounded bg-gradient-to-r from-[#ff8a00] to-[#f45a00] px-2 py-0.5 text-[9px] font-bold text-white sm:px-2.5 sm:py-1 sm:text-[10px]">
              {profile.tier}
            </span>
          </div>
          <ul className="mt-2 space-y-1.5 text-[10px] text-[var(--pf-text-2)] min-[480px]:text-[11px] sm:mt-3 sm:space-y-2 sm:text-xs">
            <li className="flex min-w-0 items-start gap-2">
              <Mail
                size={13}
                className="mt-0.5 shrink-0 text-[var(--pf-muted)] sm:h-[15px] sm:w-[15px]"
              />{" "}
              <span className="break-all">{customer.email}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone
                size={13}
                className="shrink-0 text-[var(--pf-muted)] sm:h-[15px] sm:w-[15px]"
              />{" "}
              <span>{profile.phone}</span>
            </li>
            <li className="flex items-center gap-2">
              <Calendar
                size={13}
                className="shrink-0 text-[var(--pf-muted)] sm:h-[15px] sm:w-[15px]"
              />{" "}
              <span>Member Since: {memberSince}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ───────── stats ───────── */

export function StatsRow({ stats }) {
  const items = [
    {
      icon: Box,
      label: "Total Orders",
      value: stats.orders,
      link: "View Orders",
      target: "orders",
    },
    {
      icon: Heart,
      label: "Wishlist Items",
      value: stats.wishlist,
      link: "View Wishlist",
      target: "wishlist",
    },
    {
      icon: Car,
      label: "Saved Vehicles",
      value: stats.vehicles,
      link: "Manage Vehicles",
      target: "vehicles",
    },
    {
      icon: CircleDollarSign,
      label: "Total Spent",
      value: `$ ${stats.spent.toFixed(2)}`,
      link: "View History",
      target: "orders",
      accent: true,
    },
  ];
  return (
    <div className="pf-stats-grid grid grid-cols-2 gap-2 min-[480px]:gap-3 sm:gap-4 xl:grid-cols-4">
      {items.map(({ icon: Icon, label, value, link, target, accent }) => (
        <div
          key={label}
          className="pf-stat-card pf-card flex min-w-0 gap-2 p-2.5 min-[480px]:gap-2.5 min-[480px]:p-3 sm:gap-3 sm:p-4"
        >
          <Icon
            size={34}
            className="mt-0.5 h-5 w-5 shrink-0 text-[var(--pf-brand)] min-[480px]:h-6 min-[480px]:w-6 sm:mt-1 sm:h-[34px] sm:w-[34px]"
            strokeWidth={1.5}
          />
          <div className="min-w-0">
            <p className="pf-stat-label text-[9px] leading-tight text-[var(--pf-text-2)] min-[480px]:text-[10px] sm:text-[11px]">
              {label}
            </p>
            <p
              className={`my-0.5 break-words text-base font-bold min-[480px]:text-lg sm:text-xl ${accent ? "text-[var(--pf-brand)]" : ""}`}
            >
              {value}
            </p>
            <ArrowLink
              onClick={() => scrollToSection(target)}
              className="pf-stat-link !text-[9px] !text-[var(--pf-text-2)] sm:!text-[11px]"
            >
              {link}
            </ArrowLink>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────── orders ───────── */

export function RecentOrders({ orders }) {
  return (
    <section id="orders" className="pf-card scroll-mt-20 lg:scroll-mt-32 p-5">
      <SectionTitle
        icon={Wrench}
        right={
          <ArrowLink href="/profile/orders" className="!text-[var(--pf-text-2)]">
            View All Orders
          </ArrowLink>
        }
      >
        Recent Orders
      </SectionTitle>
      <ul className="space-y-3 sm:hidden">
        {orders.map((o) => (
          <li
            key={o.id}
            className="rounded-lg border border-[var(--pf-border-soft)] bg-[var(--pf-card-2)] p-3 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{o.id}</span>
              <span
                className={`inline-block rounded px-2.5 py-1 text-[10px] font-semibold ${statusStyle[o.status]}`}
              >
                {o.status}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[var(--pf-text-2)]">
              <span>{o.date}</span>
              <span className="font-bold text-[var(--pf-text)]">{formatPrice(o.total)}</span>
            </div>
            <ArrowLink href="/profile/orders" className="mt-2">
              View Details
            </ArrowLink>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr className="text-[var(--pf-muted)]">
              {["Order ID", "Date", "Total", "Status", "Action"].map((h) => (
                <th key={h} className="pb-3 pr-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-[var(--pf-border-soft)]">
                <td className="py-3 pr-3 font-bold">{o.id}</td>
                <td className="py-3 pr-3 text-[var(--pf-text-2)]">{o.date}</td>
                <td className="py-3 pr-3">{formatPrice(o.total)}</td>
                <td className="py-3 pr-3">
                  <span
                    className={`inline-block rounded px-2.5 py-1 text-[10px] font-semibold ${statusStyle[o.status]}`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="py-3">
                  <ArrowLink href="/profile/orders">View Details</ArrowLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ───────── vehicles + wishlist ───────── */

export function SavedVehicles({ vehicles }) {
  const shown = vehicles.slice(0, 2);
  return (
    <section id="vehicles" className="pf-card scroll-mt-20 lg:scroll-mt-32 p-5">
      <SectionTitle
        icon={Car}
        right={
          <span className="text-[11px] text-[var(--pf-text-2)]">
            {vehicles.length} Vehicle{vehicles.length === 1 ? "" : "s"}
          </span>
        }
      >
        Saved Vehicles
      </SectionTitle>
      <div className="space-y-3">
        {shown.map((v) => (
          <div key={v.id} className="flex items-center gap-4">
            <div className="grid h-[76px] w-[98px] shrink-0 place-items-center overflow-hidden rounded-lg border border-[var(--pf-border)] bg-[var(--pf-card-2)] p-1">
              {v.image ? (
                <img
                  src={getImageUrl(v.image, { width: 240, quality: 80 })}
                  alt={v.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Car size={28} className="text-[var(--pf-muted)]" strokeWidth={1.4} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold">{v.name}</p>
                {v.isPrimary && (
                  <span className="rounded bg-[var(--pf-brand)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                    Primary
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-[var(--pf-text-2)]">{v.years}</p>
            </div>
          </div>
        ))}
      </div>
      {!vehicles.length && <p className="text-xs text-[var(--pf-muted)]">No vehicles saved yet.</p>}
      <Link href="/profile/vehicles" className="pf-outline-btn mt-4 w-full">
        View All Vehicles <ArrowRight size={12} />
      </Link>
    </section>
  );
}

function Stars({ value }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={11}
          className={n <= value ? "fill-[#facc15] text-[#facc15]" : "text-[var(--pf-muted)]"}
        />
      ))}
    </span>
  );
}

export function WishlistCard({ items, onAddToCart }) {
  const first = items[0];
  return (
    <section id="wishlist" className="pf-card scroll-mt-20 lg:scroll-mt-32 p-5">
      <SectionTitle
        icon={Heart}
        right={
          <span className="text-[11px] text-[var(--pf-text-2)]">
            {items.length} Item{items.length === 1 ? "" : "s"}
          </span>
        }
      >
        Wishlist
      </SectionTitle>
      {first ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-lg border border-[var(--pf-border)] bg-[var(--pf-card-2)]">
            {first.image ? (
              <img
                src={getImageUrl(first.image, { width: 240, quality: 80 })}
                alt={first.name}
                className="h-full w-full object-contain p-1"
                onError={(e) => (e.currentTarget.style.visibility = "hidden")}
              />
            ) : (
              <Heart size={26} className="text-[var(--pf-muted)]" strokeWidth={1.4} />
            )}
          </div>
          <div className="min-w-[140px] flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--pf-muted)]">
              {first.brand} · {first.category}
            </p>
            <p className="mt-0.5 text-xs font-bold">{first.name}</p>
            <div className="mt-1">
              <Stars value={first.rating} />
            </div>
            <p className="mt-1 text-lg font-extrabold text-[var(--pf-brand)]">
              {formatPrice(first.price)}
            </p>
          </div>
          <button
            className="shrink-0 rounded-lg bg-[var(--pf-brand)] px-4 py-2 text-[11px] font-bold text-white hover:brightness-110"
            onClick={() => onAddToCart(first)}
          >
            Add to Cart
          </button>
        </div>
      ) : (
        <p className="text-xs text-[var(--pf-muted)]">Your wishlist is empty.</p>
      )}
      <ArrowLink href="/profile/wishlist" className="mt-4 !text-[var(--pf-text-2)]">
        View All Wishlist
      </ArrowLink>
    </section>
  );
}

export function WalletCard({ wallet }) {
  const balance = wallet?.balance ?? 0;
  const pending = wallet?.pending ?? 0;
  return (
    <section id="wallet" className="pf-card scroll-mt-20 p-5 sm:scroll-mt-32">
      <SectionTitle icon={Wallet}>Wallet</SectionTitle>
      <p className="text-2xl font-extrabold text-[var(--pf-brand)]">{formatPrice(balance)}</p>
      <p className="mt-1 text-xs text-[var(--pf-text-2)]">
        {pending > 0
          ? `${formatPrice(pending)} awaiting confirmation`
          : "Available balance for your next order"}
      </p>
      <Link href="/profile/wallet" className="pf-outline-btn mt-4 w-full">
        Wallet details <ArrowRight size={12} />
      </Link>
    </section>
  );
}

export function LedgerCard() {
  return (
    <section id="ledger" className="pf-card scroll-mt-20 p-5 sm:scroll-mt-32">
      <SectionTitle icon={ReceiptText}>Ledger</SectionTitle>
      <p className="text-xs text-[var(--pf-text-2)]">
        Every wallet credit, debit and payment is recorded in your ledger.
      </p>
      <Link href="/profile/ledger" className="pf-outline-btn mt-4 w-full">
        View ledger <ArrowRight size={12} />
      </Link>
    </section>
  );
}

const kycTone = {
  Verified: "bg-[var(--pf-ok-bg)] text-[var(--pf-ok)]",
  "In progress": "bg-[var(--pf-warn-bg)] text-[var(--pf-warn)]",
  "Action needed": "bg-red-500/15 text-red-500",
  "Not started": "bg-[var(--pf-warn-bg)] text-[var(--pf-warn)]",
};

export function KycStatusCard({ kyc }) {
  const status = kyc?.status || "Not started";
  return (
    <section id="kyc" className="pf-card scroll-mt-20 p-5 sm:scroll-mt-32">
      <SectionTitle icon={BadgeCheck}>KYC Status</SectionTitle>
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
          kycTone[status] || "bg-[var(--pf-warn-bg)] text-[var(--pf-warn)]"
        }`}
      >
        {status}
      </span>
      <p className="mt-2 text-xs text-[var(--pf-text-2)]">
        Verification level {kyc?.level ?? 1} of {kyc?.maxLevel ?? 3}
      </p>
      <Link href="/profile/kyc" className="pf-outline-btn mt-4 w-full">
        Check status <ArrowRight size={12} />
      </Link>
    </section>
  );
}

export function ContactUsCard() {
  return (
    <section id="contact" className="pf-card scroll-mt-20 p-5 sm:scroll-mt-32">
      <SectionTitle icon={Headset}>Contact Us</SectionTitle>
      <p className="text-xs text-[var(--pf-text-2)]">Need help with an order or your account?</p>
      <a
        className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--pf-brand)] hover:underline"
        href="tel:+18665290412"
      >
        <Phone size={16} /> 1-866-529-0412
      </a>
      <Link href="/profile/contact" className="pf-outline-btn mt-4 w-full">
        Raise a request <ArrowRight size={12} />
      </Link>
    </section>
  );
}

/* ───────── addresses + payments ───────── */

export function AddressesCard({ addresses }) {
  return (
    <section id="addresses" className="pf-card scroll-mt-20 lg:scroll-mt-32 flex flex-col p-5">
      <SectionTitle
        icon={MapPin}
        right={
          <span className="text-[11px] text-[var(--pf-text-2)]">{addresses.length} Addresses</span>
        }
      >
        Addresses
      </SectionTitle>
      <div className="space-y-4">
        {addresses.map((a) => (
          <div key={a.id}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold">{a.label}</p>
              {a.isDefault && (
                <span className="rounded bg-[var(--pf-brand)] px-2 py-0.5 text-[9px] font-bold text-white">
                  Default
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-[var(--pf-text-2)]">
              {[a.line, a.city, a.region, a.postalCode].filter(Boolean).join(", ")}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-auto pt-5">
        <Link href="/profile/addresses" className="pf-outline-btn w-full">
          Manage Addresses <ArrowRight size={12} />
        </Link>
      </div>
    </section>
  );
}

export function PaymentsCard({ payments }) {
  return (
    <section id="payments" className="pf-card scroll-mt-20 lg:scroll-mt-32 flex flex-col p-5">
      <SectionTitle
        icon={CreditCard}
        right={
          <span className="text-[11px] text-[var(--pf-text-2)]">
            {payments.length} Method{payments.length === 1 ? "" : "s"}
          </span>
        }
      >
        Payment Methods
      </SectionTitle>
      {payments.map((p) => (
        <div key={p.id} className="flex items-center gap-4">
          <div className="grid h-[58px] w-[78px] place-items-center rounded-lg border border-[var(--pf-border)] bg-[#fff]">
            <span className="text-lg font-black italic tracking-tight text-[#1a1f71]">
              {p.brand.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold">
              {p.brand}
              {p.type.toLowerCase().includes("card") ? ` **** ${p.last4}` : ""}
            </p>
            <p className="mt-1 text-[11px] text-[var(--pf-text-2)]">
              {p.expires ? `Expires ${p.expires}` : p.type}
            </p>
          </div>
        </div>
      ))}
      <div className="mt-auto pt-5">
        <Link href="/profile/payments" className="pf-outline-btn w-full">
          Manage Payments <ArrowRight size={12} />
        </Link>
      </div>
    </section>
  );
}

/* ───────── returns + settings ───────── */

function ActionCard({ id, icon: Icon, title, text, buttonLabel, art: Art, href }) {
  return (
    <section id={id} className="pf-card scroll-mt-20 lg:scroll-mt-32 p-5">
      <SectionTitle icon={Icon}>{title}</SectionTitle>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Art size={64} strokeWidth={1.2} className="shrink-0 text-[var(--pf-brand)]" />
        <div>
          <p className="text-[11px] text-[var(--pf-text-2)]">{text}</p>
          <Link href={href} className="pf-outline-btn mt-3">
            {buttonLabel} <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ReturnsCard() {
  return (
    <ActionCard
      id="returns"
      icon={Undo2}
      title="Returns & Refunds"
      text="Track your returns and refunds"
      buttonLabel="View Returns"
      art={PackageOpen}
      href="/profile/returns"
    />
  );
}

export function SettingsCard() {
  return (
    <ActionCard
      id="settings"
      icon={Settings}
      title="Account Settings"
      text="Update your password and preferences"
      buttonLabel="Manage Settings"
      art={ShieldCheck}
      href="/profile/settings"
    />
  );
}
