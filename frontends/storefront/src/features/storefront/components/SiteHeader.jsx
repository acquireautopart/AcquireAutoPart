"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  ShoppingCart,
  Menu,
  X,
  ChevronDown,
  User,
  MapPin,
  Car,
  Plus,
  Cog,
  Disc3,
  Lightbulb,
  Droplet,
  Battery,
  CircleDot,
  Wrench,
  Filter,
  CarFront,
  Wind,
  Settings2,
  Gauge,
  LogOut,
  ShoppingBag,
} from "lucide-react";
import { navItems } from "@/features/storefront/data/storefront";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { formatPrice } from "@/features/storefront/lib/format";
import { AUTH_DIALOG_EVENT, requestAuth, requestCurrentCustomer } from "@/lib/authApi";
import AuthDialog from "@/features/storefront/components/AuthDialog";
import ThemeToggle from "@/features/storefront/components/ThemeToggle";
import { Avatar, sidebarItems } from "@/features/profile/components/ProfileSidebar";
import useCart from "@/features/storefront/hooks/useCart";
import { useMarket } from "@/features/storefront/lib/market";
import { uploadProfilePhoto } from "@/features/profile/lib/profilePhoto";

const categoryTiles = [
  { label: "For You", icon: ShoppingBag, href: "/" },
  { label: "Engine", icon: Cog, href: "/category/engine-drivetrain" },
  { label: "Brakes", icon: Disc3, href: "/category/brakes-suspension-steering" },
  { label: "Lighting", icon: Lightbulb, href: "/category/headlights-lighting" },
  { label: "Oils", icon: Droplet, href: "/parts?q=oil" },
  { label: "Battery", icon: Battery, href: "/parts?q=battery" },
  { label: "Steering", icon: CircleDot, href: "/category/brakes-suspension-steering" },
  { label: "Suspension", icon: Settings2, href: "/category/brakes-suspension-steering" },
  { label: "Body", icon: CarFront, href: "/category/auto-body-parts-mirrors" },
  { label: "Filters", icon: Filter, href: "/parts?q=filter" },
  { label: "A/C", icon: Wind, href: "/parts?q=air%20conditioning" },
  { label: "Tools", icon: Wrench, href: "/category/tools-garage" },
  { label: "Wheels", icon: CircleDot, href: "/category/wheels" },
  { label: "Performance", icon: Gauge, href: "/parts?q=performance" },
];

function CategoryNavLink({ label, icon: Icon, href, active, isScrolled, tabIndex }) {
  return (
    <Link
      className={`group relative flex items-center justify-center rounded-lg text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
        isScrolled
          ? "min-w-[68px] px-2 py-1 sm:min-w-[76px]"
          : "min-w-[68px] flex-col gap-1.5 px-2 py-1 sm:min-w-[76px]"
      } ${
        active ? "text-brand" : "text-[#272b2a]"
      }`}
      href={href}
      tabIndex={tabIndex}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={`grid h-10 w-10 place-items-center rounded-xl transition duration-200 group-hover:-translate-y-0.5 sm:h-11 sm:w-11 ${
          isScrolled ? "hidden" : ""
        } ${
          active ? "bg-[#fff3ed] text-brand" : "text-brand group-hover:bg-[#fff3ed]"
        }`}
        aria-hidden="true"
      >
        <Icon size={23} strokeWidth={2} />
      </span>
      <span
        className={`whitespace-nowrap font-semibold transition-[color,font-size] duration-200 ${
          isScrolled ? "text-xs sm:text-sm" : "text-[11px] sm:text-xs"
        } ${
          active ? "text-brand" : "group-hover:text-brand"
        }`}
      >
        {label}
      </span>
      <span
        className={`absolute bottom-0 h-0.5 rounded-full bg-brand transition-all duration-200 ${
          active ? "w-8" : "w-0 group-hover:w-8"
        }`}
      />
    </Link>
  );
}

export default function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { country, countries, selectCountry } = useMarket();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const { items: cart, count: cartCount } = useCart();
  const [notice, setNotice] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const avatarInputRef = useRef(null);

  const handleAuthenticated = useCallback((authenticatedCustomer) => {
    setCustomer(authenticatedCustomer);
  }, []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 80);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("storefront-scrollbar-hidden");
    return () => root.classList.remove("storefront-scrollbar-hidden");
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    requestCurrentCustomer({ signal: controller.signal })
      .then(({ customer: currentCustomer }) => setCustomer(currentCustomer))
      .catch((requestError) => {
        if (requestError.name === "AbortError") return;
        if (requestError.status === 401) setCustomer(null);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    function openAuthDialog() {
      setAuthOpen(true);
    }

    window.addEventListener(AUTH_DIALOG_EVENT, openAuthDialog);
    return () => window.removeEventListener(AUTH_DIALOG_EVENT, openAuthDialog);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      try {
        const params = new URLSearchParams({ country, q: term, pageSize: "6" });
        const response = await fetch(`/api/parts?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not search products.");
        setSearchResults(data.products || []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setSearchResults([]);
          setSearchError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [country, query]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    function handleEscape(event) {
      if (event.key === "Escape") setAccountMenuOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [accountMenuOpen]);

  async function handleSignOut() {
    setAccountMenuOpen(false);
    try {
      await requestAuth("logout", { method: "POST" });
      setCustomer(null);
      setNotice("You have been signed out.");
      setTimeout(() => setNotice(""), 2600);
    } catch (requestError) {
      setNotice(requestError.message);
    }
  }

  async function saveProfilePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !customer?.email) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Choose an image file for your profile photo.");
      return;
    }
    try {
      const updatedCustomer = await uploadProfilePhoto(file);
      setCustomer(updatedCustomer);
      window.dispatchEvent(new CustomEvent("profile-avatar-change", { detail: { photo: updatedCustomer.profilePhoto } }));
      setNotice("Profile photo updated.");
      setTimeout(() => setNotice(""), 2600);
    } catch (uploadError) {
      setNotice(uploadError.message || "This photo could not be saved. Please try another image.");
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    router.push(`/parts?${new URLSearchParams({ q: term, country })}`);
    setQuery("");
  }

  return (
    <>
      <header className="relative bg-white shadow-sm lg:sticky lg:top-0 lg:z-40">
        {/* Reserve the mobile top bar's space; the bar itself stays fixed while the rest scrolls. */}
        <div className="h-[56px] sm:h-[60px] lg:hidden" aria-hidden="true" />
        {/* Main header row */}
        <div className="fixed inset-x-0 top-0 z-50 bg-white shadow-sm lg:static lg:z-auto lg:bg-transparent lg:shadow-none">
          <div className="site-container flex items-center gap-2 py-2.5 sm:gap-3 sm:py-3">
            {/* Menu button (always visible) */}
            <button
              className="grid h-9 w-9 shrink-0 place-items-center text-[#171916] hover:text-brand"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={28} strokeWidth={2.5} />
            </button>

            {/* Logo */}
            <Link href="/" className="shrink-0" aria-label="CarParts home">
              <span className="font-display text-[22px] font-extrabold leading-none tracking-tight sm:text-[26px] md:text-[30px]">
                <span className="text-brand">Acquireauto</span>
                <span className="text-[#171916]">Part</span>
                <sup className="ml-0.5 text-[8px] font-bold text-brand">TM</sup>
              </span>
            </Link>

            {/* Add Vehicle dropdown (desktop only) */}
            <Link
              className="group ml-1 hidden min-w-[180px] items-center justify-between gap-2 rounded-md border border-line bg-white px-3 py-2.5 text-left text-sm font-semibold text-[#171916] hover:border-brand lg:flex lg:min-w-[220px]"
              href="/#vehicle-search"
            >
              <span className="flex items-center gap-2">
                <span className="relative grid h-6 w-6 place-items-center text-brand">
                  <Car size={22} strokeWidth={2} />
                  <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-brand text-white">
                    <Plus size={10} strokeWidth={3} />
                  </span>
                </span>
                <span>Add Vehicle</span>
              </span>
              <ChevronDown
                size={16}
                className="text-brand transition-transform group-hover:rotate-180"
              />
            </Link>

            {/* Search bar (desktop only) */}
            <div className="relative ml-1 hidden flex-1 lg:block">
              <form
                className="flex h-11 items-stretch overflow-hidden rounded-md border border-line focus-within:border-brand"
                onSubmit={submitSearch}
              >
                <input
                  className="min-w-0 flex-1 bg-white px-3 text-sm text-[#171916] outline-none placeholder:text-muted"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search parts, vehicle, brand, or part number"
                  aria-label="Search parts"
                />
                <button
                  type="submit"
                  className="grid w-12 shrink-0 place-items-center bg-brand text-white transition-colors hover:bg-brand-dark"
                  aria-label="Search"
                >
                  <Search size={20} strokeWidth={2.5} />
                </button>
              </form>
              {query.trim() && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 border border-line bg-white p-3 shadow-md">
                  <strong className="mb-2 block text-[10px] uppercase tracking-widest text-muted">
                    Products from the marketplace
                  </strong>
                  {searchLoading ? (
                    <p className="py-3 text-sm text-muted" role="status">
                      Searching products...
                    </p>
                  ) : searchError ? (
                    <p className="py-3 text-sm text-red-600" role="alert">
                      {searchError}
                    </p>
                  ) : searchResults.length ? (
                    searchResults.map((product) => (
                      <Link
                        className="flex w-full items-center justify-between gap-4 border-t border-line py-3 text-left text-sm text-[#171916] hover:text-brand"
                        key={product.id}
                        href={`/product/${encodeURIComponent(product.id)}?country=${country}`}
                        onClick={() => setQuery("")}
                      >
                        <span className="font-semibold">
                          {product.name}
                          <small className="mt-1 block font-normal text-muted">
                            {[product.brand, product.category, product.sku]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                        </span>
                        <b>{formatPrice(product.price, product.currency)}</b>
                      </Link>
                    ))
                  ) : (
                    <p className="py-3 text-sm text-muted">No matching products found.</p>
                  )}
                </div>
              )}
            </div>

            {/* Right side icons */}
            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3 md:ml-0 md:gap-3">
              {/* On desktop these stay in the header; mobile users find them in the side menus. */}
              <span className="hidden lg:block">
                <ThemeToggle />
              </span>
              <label className="hidden items-center gap-1.5 text-[11px] font-semibold text-[#171916] lg:flex">
                <MapPin size={18} className="text-brand" />
                <select
                  aria-label="Shopping country"
                  value={country}
                  onChange={(event) => selectCountry(event.target.value)}
                  className="max-w-[145px] rounded-md border border-line bg-white px-2 py-2 text-[11px]"
                >
                  {countries.map((entry) => (
                    <option key={entry.code} value={entry.code}>
                      {entry.name} ({entry.currency})
                    </option>
                  ))}
                </select>
              </label>
              {/* Signed-in customers see their avatar; guests are sent to sign in/register. */}
              <div className="relative">
                {customer ? (
                  <>
                    <a
                      href="/profile"
                      className="hidden items-center gap-2 text-[11px] font-semibold text-[#171916] hover:text-brand lg:flex"
                      aria-label={`Open ${customer.name}'s profile`}
                    >
                      <span className="max-w-[92px] truncate">{customer.name.split(/\s+/)[0]}</span>
                      <Avatar size={32} customer={customer} />
                      <ChevronDown size={14} className="text-brand" />
                    </a>
                    <button
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-[#171916] hover:text-brand sm:gap-2 lg:hidden"
                      onClick={() => setAccountMenuOpen((open) => !open)}
                      aria-label={`Open account menu for ${customer.name}`}
                      aria-haspopup="dialog"
                      aria-expanded={accountMenuOpen}
                    >
                      <span className="hidden max-w-[92px] truncate min-[480px]:inline">
                        {customer.name.split(/\s+/)[0]}
                      </span>
                      <Avatar size={32} customer={customer} />
                      <ChevronDown
                        size={14}
                        className={`text-brand transition-transform ${accountMenuOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </>
                ) : (
                  <button
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-[#171916] hover:text-brand sm:gap-2"
                    onClick={() => setAuthOpen(true)}
                    aria-label="Login or register"
                  >
                    <User size={19} className="text-brand" />
                    <span className="hidden whitespace-nowrap min-[480px]:inline">
                      Login / Register
                    </span>
                  </button>
                )}
              </div>
              {/* Cart */}
              <Link
                className="relative flex items-center gap-1.5 text-[11px] font-semibold text-[#171916] hover:text-brand"
                href="/cart"
                aria-label={`View cart, ${cartCount} items`}
              >
                <span className="relative inline-flex">
                  <ShoppingCart size={20} className="text-brand" />
                  {cartCount > 0 && (
                    <b className="absolute -right-1.5 -top-1.5 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-[#e11d48] px-1 text-[9px] font-bold leading-none text-white ring-1 ring-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </b>
                  )}
                </span>
                <span className="hidden sm:inline">Cart</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile search + Add Vehicle stacked row */}
        <div className="site-container flex flex-col gap-2 pb-2.5 lg:hidden">
          {/* Search bar (mobile) */}
          <div className="relative">
            <form
              className="flex h-11 items-stretch overflow-hidden rounded-md border border-line focus-within:border-brand"
              onSubmit={submitSearch}
            >
              <input
                className="min-w-0 flex-1 bg-white px-3 text-sm text-[#171916] outline-none placeholder:text-muted"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search parts, vehicle, brand, or part number"
                aria-label="Search parts"
              />
              <button
                type="submit"
                className="grid w-12 shrink-0 place-items-center bg-brand text-white transition-colors hover:bg-brand-dark"
                aria-label="Search"
              >
                <Search size={20} strokeWidth={2.5} />
              </button>
            </form>
            {query.trim() && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 border border-line bg-white p-3 shadow-md">
                <strong className="mb-2 block text-[10px] uppercase tracking-widest text-muted">
                  Products from the marketplace
                </strong>
                {searchLoading ? (
                  <p className="py-3 text-sm text-muted" role="status">
                    Searching products...
                  </p>
                ) : searchError ? (
                  <p className="py-3 text-sm text-red-600" role="alert">
                    {searchError}
                  </p>
                ) : searchResults.length ? (
                  searchResults.map((product) => (
                    <Link
                      className="flex w-full items-center justify-between gap-4 border-t border-line py-3 text-left text-sm text-[#171916] hover:text-brand"
                      key={product.id}
                      href={`/product/${encodeURIComponent(product.id)}?country=${country}`}
                      onClick={() => setQuery("")}
                    >
                      <span className="font-semibold">
                        {product.name}
                        <small className="mt-1 block font-normal text-muted">
                          {[product.brand, product.category, product.sku]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </span>
                      <b>{formatPrice(product.price, product.currency)}</b>
                    </Link>
                  ))
                ) : (
                  <p className="py-3 text-sm text-muted">No matching products found.</p>
                )}
              </div>
            )}
          </div>
          {/* Add Vehicle bar (mobile) */}
          <Link
            className="group flex w-full items-center justify-between gap-2 rounded-md border border-line bg-white px-3 py-2.5 text-left hover:border-brand"
            href="/#vehicle-search"
          >
            <span className="flex items-center gap-2.5">
              <span className="relative grid h-6 w-6 place-items-center text-brand">
                <Car size={22} strokeWidth={2} />
                <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-brand text-white">
                  <Plus size={10} strokeWidth={3} />
                </span>
              </span>
              <span className="text-sm font-semibold text-[#171916]">
                Add Vehicle To Guarantee Fit!
              </span>
            </span>
            <ChevronDown
              size={18}
              className="text-[#171916] transition-transform group-hover:rotate-180"
            />
          </Link>
        </div>

        {/* Category navigation */}
        <nav className="border-t border-line bg-white" aria-label="Category navigation">
          <div className="site-container py-1.5 sm:py-2">
            <div className="category-nav-viewport">
              <ul className="category-nav-list flex min-w-max items-center justify-start gap-2 py-1 sm:mx-auto sm:w-max sm:gap-3">
                {categoryTiles.map((tile) => (
                  <li className="shrink-0" key={tile.label}>
                    <CategoryNavLink
                      {...tile}
                      active={pathname === tile.href}
                      isScrolled={isScrolled}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>

        {/* CarParts+ Gold membership band */}
        {!isScrolled && (
          <div className="hidden border-b border-line bg-soft md:block">
            <div className="site-container flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 py-2.5 text-[12px] font-semibold text-white/90">
              <span className="flex items-center gap-1.5 font-bold text-brand">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-brand text-[10px] font-extrabold text-white">
                  +
                </span>
                CarParts+ Gold
              </span>
              <span className="hidden text-white/25 sm:inline">|</span>
              <span>✓ 24/7 Roadside Assistance</span>
              <span>✓ 1M+ Parts Ship Free</span>
              <span>✓ 3x Points Per $1 Spent</span>
              <span>✓ Extended 60-Day Returns</span>
              <span>✓ VIP Member Support</span>
              <span className="hidden text-white/25 md:inline">|</span>
              <a href="#" className="font-bold text-brand underline hover:text-brand-dark">
                Learn More
              </a>
            </div>
          </div>
        )}
      </header>

      {customer && accountMenuOpen && (
        <div
          className="fixed inset-0 z-[85] bg-black/60 lg:hidden"
          onClick={() => setAccountMenuOpen(false)}
        >
          <aside
            id="account-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Your account"
            className="app-drawer ml-auto flex h-full w-[min(390px,92vw)] flex-col overflow-y-auto shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dw-surface px-5 pb-5 pt-4 sm:px-6">
              <div className="mb-7 flex items-center justify-between gap-4">
                <button
                  className="grid h-10 w-10 place-items-center rounded-full dw-hover"
                  onClick={() => setAccountMenuOpen(false)}
                  aria-label="Close account menu"
                >
                  <X size={25} />
                </button>
                <button
                  className="inline-flex items-center gap-2 text-sm font-semibold dw-text-soft hover:text-brand"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    setMenuOpen(true);
                  }}
                  aria-label="Open browse menu on the opposite side"
                >
                  Browse <Menu size={22} />
                </button>
              </div>
              <h2 className="font-display text-2xl font-extrabold">
                Hello, {customer.name.split(/\s+/)[0]}
              </h2>
            </div>

            <div className="border-b dw-line px-5 py-5 sm:px-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold">Profile</h3>
                <a
                  href="/profile"
                  onClick={() => setAccountMenuOpen(false)}
                  className="rounded-md border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white"
                >
                  See All
                </a>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  onClick={() => avatarInputRef.current?.click()}
                  aria-label="Choose a profile photo"
                >
                  <Avatar size={58} customer={customer} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold">{customer.name}</p>
                  <p className="truncate text-sm dw-text-mute">Account holder</p>
                  <button
                    className="mt-1 text-xs font-semibold text-brand hover:underline"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    Change profile photo
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={saveProfilePhoto}
                  />
                </div>
              </div>
            </div>

            <nav className="flex-1 px-4 py-4 sm:px-5" aria-label="Account links">
              <ul className="space-y-1">
                {sidebarItems.map(({ id, label, icon: Icon }) => (
                  <li key={id}>
                    <Link
                      href={id === "overview" ? "/profile" : `/profile/${id}`}
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold dw-text-soft dw-hover hover:text-brand"
                    >
                      <Icon size={19} className="shrink-0 text-brand" strokeWidth={1.8} />
                      <span>{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleSignOut}
                className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-lg border-t dw-line px-3 pt-4 text-left text-sm font-semibold dw-text-soft hover:text-brand"
              >
                <LogOut size={19} className="shrink-0 text-brand" />
                Log Out
              </button>
            </nav>
            <div className="border-t dw-line px-5 py-4 sm:px-6">
              <ThemeToggle
                showLabel
                className="flex min-h-10 items-center text-sm font-semibold dw-text-soft hover:text-brand [&>svg]:text-brand"
              />
              <button
                className="mt-2 flex min-h-10 items-center gap-2 text-sm font-semibold dw-text-soft hover:text-brand"
                onClick={() => {
                  setAccountMenuOpen(false);
                  setNotice("Location services can be connected.");
                }}
              >
                <MapPin size={18} className="text-brand" />
                Location · La Salle, IL 61301
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Notice toast */}
      {notice && (
        <div
          className="fixed right-4 top-4 z-[70] max-w-sm border border-line bg-paper px-4 py-3 text-xs text-white shadow-card"
          role="status"
        >
          {notice}
          <button className="ml-3 font-bold text-brand" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}

      {/* Menu sidebar drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[80] bg-black/40" onClick={() => setMenuOpen(false)}>
          <aside
            className="app-drawer mr-auto flex h-full w-full max-w-xs flex-col p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
            aria-label="Main menu"
          >
            <div className="flex items-center justify-between border-b dw-line pb-4">
              <span className="font-display text-[20px] font-extrabold leading-none">
                <span className="text-brand">Acquireauto</span>
                <span className="dw-text">Part</span>
              </span>
              <button
                className="grid h-9 w-9 place-items-center dw-hover dw-text"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>
            <nav className="flex-1 overflow-auto py-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest dw-muted">
                Shop by Category
              </p>
              <ul className="flex flex-col">
                {navItems.map((item) => (
                  <li key={item.label}>
                    <Link
                      className="block border-b dw-line py-3 text-sm font-semibold dw-text hover:text-brand"
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex flex-col gap-3 border-t dw-line pt-4">
              <ThemeToggle
                showLabel
                className="flex items-center text-sm font-semibold dw-text hover:text-brand [&>svg]:text-brand"
              />
              {customer ? (
                <a
                  className="flex items-center gap-2 text-sm font-semibold dw-text hover:text-brand"
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                >
                  <User size={18} className="text-brand" />
                  My Profile
                </a>
              ) : (
                <button
                  className="flex items-center gap-2 text-sm font-semibold dw-text hover:text-brand"
                  onClick={() => {
                    setAuthOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  <User size={18} className="text-brand" />
                  Sign In
                </button>
              )}
              <button
                className="flex items-center gap-2 text-sm font-semibold dw-text hover:text-brand"
                onClick={() => {
                  setNotice("Location services can be connected.");
                  setMenuOpen(false);
                }}
              >
                <MapPin size={18} className="text-brand" />
                La Salle, IL
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-[80] bg-black/40" onClick={() => setCartOpen(false)}>
          <aside
            className="app-drawer ml-auto flex h-full w-full max-w-md flex-col p-5 shadow-2xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
            aria-label="Shopping cart"
          >
            <div className="flex items-center justify-between border-b dw-line pb-5">
              <h2 className="font-display text-2xl font-extrabold">
                Your cart <span className="dw-muted">({cartCount})</span>
              </h2>
              <button
                className="grid h-9 w-9 place-items-center dw-hover dw-text"
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
              >
                <X />
              </button>
            </div>
            {cart.length ? (
              <>
                <div className="flex-1 divide-y dw-divide overflow-auto">
                  {cart.map((item) => (
                    <div className="flex items-center justify-between gap-4 py-4" key={item.id}>
                      <div>
                        <strong className="text-sm">{item.name}</strong>
                        <small className="mt-1 block text-xs dw-muted">Qty: {item.quantity}</small>
                      </div>
                      <b className="text-sm">
                        {formatPrice(item.price * item.quantity, item.currency)}
                      </b>
                    </div>
                  ))}
                </div>
                <div className="border-t dw-line pt-5">
                  <div className="flex justify-between text-sm">
                    <span>Estimated subtotal</span>
                    <strong>
                      {formatPrice(
                        cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
                        cart[0]?.currency,
                      )}
                    </strong>
                  </div>
                  <p className="mt-4 text-xs dw-muted">
                    Demo cart only — checkout and payment are not connected.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <ShoppingCart size={34} className="dw-muted" />
                <h3 className="mt-4 text-lg font-extrabold">Your cart is waiting</h3>
                <p className="mt-2 text-sm dw-muted">Add a part to see it here.</p>
                <button
                  className="mt-5 inline-flex min-h-[46px] items-center justify-center px-5 text-xs font-extrabold bg-brand text-white hover:bg-brand-dark"
                  onClick={() => setCartOpen(false)}
                >
                  Keep shopping
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
      <AuthDialog
        isOpen={authOpen}
        customer={customer}
        onAuthenticated={handleAuthenticated}
        onClose={closeAuth}
      />
    </>
  );
}
