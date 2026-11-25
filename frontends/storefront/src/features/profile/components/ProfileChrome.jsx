"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Facebook,
  Heart,
  Instagram,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  Package,
  Search,
  ShoppingCart,
  Sun,
  Truck,
  User,
  X,
  Youtube,
} from "lucide-react";

export function BrandLogo({ theme, size = "md" }) {
  const imgHeight = size === "sm" ? "h-12" : "h-16";
  if (theme === "dark") {
    // logo.png has white lettering – made for dark backgrounds
    return (
      <img src="https://res.cloudinary.com/l8vkwojw/image/upload/v1794229944/acquireauto/project-images/2563ce9d24339d6a1155dae32dd3e736.png" alt="AcquireAutoPart" className={`${imgHeight} w-auto object-contain`} />
    );
  }
  return (
    <span className="flex flex-col leading-none">
      <span className="font-display text-[24px] font-extrabold tracking-tight">
        <span className="text-[#171916]">Acquire</span>
        <span className="text-[var(--pf-brand)]">autoPart</span>
      </span>
      <span className="mt-1 text-[8px] font-bold uppercase tracking-[.14em] text-[var(--pf-muted)]">
        Quality parts. Smoother journeys.
      </span>
    </span>
  );
}

function HeaderIconLink({ href, icon: Icon, label, badge }) {
  return (
    <Link
      href={href}
      className="relative flex items-center gap-1.5 text-xs font-semibold hover:text-[var(--pf-brand)]"
    >
      <span className="relative">
        <Icon size={22} strokeWidth={1.8} />
        {badge > 0 && (
          <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--pf-brand)] px-1 text-[9px] font-bold text-white">
            {badge}
          </span>
        )}
      </span>
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}

function AccountMenu({ onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function close(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const items = [
    { label: "My Profile", href: "/profile", icon: User },
    { label: "My Orders", href: "/profile/orders", icon: Package },
    { label: "Wishlist", href: "/profile/wishlist", icon: Heart },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-1.5 text-xs font-semibold hover:text-[var(--pf-brand)]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <User size={22} strokeWidth={1.8} />
        <span className="hidden md:inline">My Account</span>
        <ChevronDown
          size={14}
          className={`hidden transition-transform md:block ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="pf-card absolute right-0 top-full z-50 mt-3 w-48 overflow-hidden py-1 pf-shadow"
        >
          {items.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold hover:bg-[var(--pf-brand-soft)] hover:text-[var(--pf-brand)]"
            >
              <Icon size={15} /> {label}
            </Link>
          ))}
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2.5 border-t border-[var(--pf-border)] px-4 py-2.5 text-left text-xs font-semibold hover:bg-[var(--pf-brand-soft)] hover:text-[var(--pf-brand)]"
          >
            <LogOut size={15} /> Log Out
          </button>
        </div>
      )}
    </div>
  );
}

const mainLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/parts" },
  { label: "Brands", href: "/#brands" },
  { label: "About", href: "/#guides" },
  { label: "Contact", href: "/#contact" },
];

export function ProfileHeader({
  theme,
  onToggleTheme,
  wishlistCount,
  cartCount,
  onLogout,
  signedIn,
}) {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <header className="border-b border-[var(--pf-border)] bg-[var(--pf-bg)]">
      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6">
        <button
          className="grid h-9 w-9 place-items-center lg:hidden"
          onClick={() => setMobileNav(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <Link href="/" aria-label="AcquireAutoPart home" className="shrink-0">
          <BrandLogo theme={theme} />
        </Link>

        <form
          className="relative hidden flex-1 md:block lg:mx-6 lg:max-w-[520px]"
          action="/parts"
          role="search"
        >
          <input
            name="q"
            className="h-11 w-full rounded-lg border border-[var(--pf-border)] bg-[var(--pf-input)] pl-4 pr-14 text-xs text-[var(--pf-text)] outline-none placeholder:text-[var(--pf-muted)] focus:border-[var(--pf-brand)]"
            placeholder="Search for parts, brands, vehicles..."
            aria-label="Search parts"
          />
          <button
            className="absolute right-0 top-0 grid h-11 w-12 place-items-center rounded-r-lg bg-[var(--pf-brand)] text-white hover:brightness-110"
            aria-label="Search"
          >
            <Search size={18} strokeWidth={2.4} />
          </button>
        </form>

        <div className="ml-auto flex items-center gap-4 sm:gap-6">
          <button
            onClick={onToggleTheme}
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--pf-border)] hover:border-[var(--pf-brand)] hover:text-[var(--pf-brand)]"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Light theme" : "Dark theme"}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {signedIn ? (
            <AccountMenu onLogout={onLogout} />
          ) : (
            <Link
              href="/profile"
              className="flex items-center gap-1.5 text-xs font-semibold hover:text-[var(--pf-brand)]"
            >
              <User size={22} strokeWidth={1.8} /> <span className="hidden md:inline">Sign In</span>
            </Link>
          )}
          <HeaderIconLink
            href="/profile#wishlist"
            icon={Heart}
            label="Wishlist"
            badge={wishlistCount}
          />
          <HeaderIconLink href="/parts" icon={ShoppingCart} label="" badge={cartCount} />
        </div>
      </div>

      {/* Second row: categories + nav + shipping */}
      <div className="hidden border-t border-[var(--pf-border)] bg-[var(--pf-panel)] lg:block">
        <div className="mx-auto flex max-w-[1280px] items-center gap-8 px-6">
          <Link
            href="/parts"
            className="my-3 flex min-w-[190px] items-center gap-2.5 rounded-lg bg-[var(--pf-brand)] px-4 py-2.5 text-sm font-bold text-white hover:brightness-110"
          >
            <LayoutGrid size={18} /> All Categories <ChevronDown size={15} className="ml-auto" />
          </Link>
          <nav className="flex items-center gap-8" aria-label="Main">
            {mainLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-semibold hover:text-[var(--pf-brand)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 border-l border-[var(--pf-border)] py-3 pl-6">
            <Truck size={30} className="text-[var(--pf-brand)]" strokeWidth={1.5} />
            <span className="leading-tight">
              <b className="block text-xs text-[var(--pf-brand)]">Free Shipping</b>
              <small className="text-[11px] text-[var(--pf-muted)]">On orders over $50</small>
            </span>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="fixed inset-0 z-[90] bg-black/60" onClick={() => setMobileNav(false)}>
          <aside
            className="pf-card h-full w-72 max-w-[85%] rounded-none p-5"
            onClick={(e) => e.stopPropagation()}
            aria-label="Menu"
          >
            <div className="mb-4 flex items-center justify-between">
              <BrandLogo theme={theme} size="sm" />
              <button onClick={() => setMobileNav(false)} aria-label="Close menu">
                <X size={22} />
              </button>
            </div>
            <form action="/parts" className="mb-4">
              <input
                name="q"
                className="h-10 w-full rounded-lg border border-[var(--pf-border)] bg-[var(--pf-input)] px-3 text-xs outline-none focus:border-[var(--pf-brand)]"
                placeholder="Search parts, brands..."
              />
            </form>
            {mainLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileNav(false)}
                className="block border-b border-[var(--pf-border)] py-3 text-sm font-semibold hover:text-[var(--pf-brand)]"
              >
                {link.label}
              </Link>
            ))}
          </aside>
        </div>
      )}
    </header>
  );
}

const footerColumns = [
  {
    title: "Quick Links",
    links: [
      ["Home", "/"],
      ["Shop", "/parts"],
      ["Brands", "/#brands"],
      ["About", "/#guides"],
      ["Contact", "/#contact"],
    ],
  },
  {
    title: "Customer Service",
    links: [
      ["Track Order", "/profile/orders"],
      ["Returns & Refunds", "/profile/returns"],
      ["Shipping Policy", "#"],
      ["FAQs", "#"],
      ["Help Center", "#"],
    ],
  },
];

export function ProfileFooter({ theme }) {
  return (
    <footer className="border-t border-[var(--pf-border)] bg-[var(--pf-panel)]">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr_1.2fr]">
        <div>
          <BrandLogo theme={theme} />
        </div>
        {footerColumns.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 text-sm font-bold">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-xs text-[var(--pf-text-2)] hover:text-[var(--pf-brand)]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h4 className="mb-3 text-sm font-bold">Follow Us</h4>
          <div className="flex gap-2">
            {[Facebook, Instagram, Youtube].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="Social link"
                className="grid h-8 w-8 place-items-center rounded-full border border-[var(--pf-border)] hover:border-[var(--pf-brand)] hover:text-[var(--pf-brand)]"
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
          <h4 className="mb-3 mt-6 text-sm font-bold">Secure Payment</h4>
          <div className="flex flex-wrap gap-2 text-[10px] font-extrabold">
            <span className="rounded bg-white px-2.5 py-1.5 italic text-[#1a1f71]">VISA</span>
            <span className="rounded bg-white px-2.5 py-1.5 text-[#eb001b]">Mastercard</span>
            <span className="rounded bg-white px-2.5 py-1.5 text-[#003087]">PayPal</span>
            <span className="rounded bg-[#635bff] px-2.5 py-1.5 text-white">stripe</span>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--pf-border)]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-[11px] text-[var(--pf-muted)] sm:px-6">
          <span>© {new Date().getFullYear()} AcquireautoPart. All rights reserved.</span>
          <span className="flex gap-3">
            <Link href="#" className="hover:text-[var(--pf-brand)]">
              Privacy Policy
            </Link>
            <span>|</span>
            <Link href="#" className="hover:text-[var(--pf-brand)]">
              Terms &amp; Conditions
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
