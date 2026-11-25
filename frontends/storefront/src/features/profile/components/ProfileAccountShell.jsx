"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import PromoStrip from "@/features/storefront/components/PromoStrip";
import SiteHeader from "@/features/storefront/components/SiteHeader";
import SiteFooter from "@/features/storefront/components/SiteFooter";
import ProfileSidebar, { sidebarItems } from "@/features/profile/components/ProfileSidebar";
import { ProfileHeroBanner } from "@/features/profile/components/ProfileSections";
import { requestAuth, requestCurrentCustomer } from "@/lib/authApi";

const titles = {
  overview: "Profile Overview",
  orders: "Your Orders",
  wishlist: "Wishlist",
  vehicles: "Saved Vehicles",
  addresses: "Addresses",
  payments: "Payment Methods",
  wallet: "Wallet",
  ledger: "Ledger",
  kyc: "KYC Status",
  returns: "Returns & Refunds",
  settings: "Account Settings",
  contact: "Contact Us",
};

export default function ProfileAccountShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const segment = pathname.split("/").filter(Boolean)[1] || "overview";
  const title = pathname.endsWith("/orders/filter")
    ? "Filter orders"
    : titles[segment] || "Your Account";
  const activeId = segment;
  const [customer, setCustomer] = useState(null);
  const [identityError, setIdentityError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    requestCurrentCustomer({ signal: controller.signal })
      .then(({ customer: me }) => setCustomer(me))
      .catch((error) => {
        if (error.name === "AbortError") return;
        if (error.status !== 401) setIdentityError(error.message);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    function syncCustomer(event) {
      setCustomer(event.detail);
      setIdentityError("");
    }
    window.addEventListener("profile-customer-change", syncCustomer);
    return () => window.removeEventListener("profile-customer-change", syncCustomer);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  async function logout() {
    try {
      await requestAuth("logout", { method: "POST" });
      setCustomer(null);
      window.dispatchEvent(new CustomEvent("profile-customer-change", { detail: null }));
      router.push("/");
    } catch (error) {
      setIdentityError(error.message);
    }
  }

  return (
    <>
      <PromoStrip />
      <SiteHeader />
      <div className="pf theme-keep min-h-[65vh]">
        <main className="mx-auto max-w-[1280px] px-3 py-4 sm:px-6 sm:py-8">
          <div className="mb-4 flex items-center gap-2 text-xs text-[var(--pf-muted)]">
            <span>My Account</span>
            <span aria-hidden="true">›</span>
            <span className="text-[var(--pf-text)]">{title}</span>
          </div>

          {/* Phones and tablets have no room for the sidebar, so section links scroll here. */}
          <nav
            aria-label="Account sections"
            className="-mx-3 mb-4 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden [&::-webkit-scrollbar]:hidden"
          >
            {sidebarItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeId === id;
              return (
                <Link
                  key={id}
                  href={id === "overview" ? "/profile" : `/profile/${id}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-[var(--pf-brand)] bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]"
                      : "border-[var(--pf-border)] text-[var(--pf-text-2)]"
                  }`}
                >
                  <Icon size={15} strokeWidth={1.9} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {identityError && (
            <p className="mb-4 text-sm text-red-600" role="alert">
              {identityError}
            </p>
          )}
          {notice && (
            <p className="mb-4 text-sm text-[var(--pf-brand)]" role="status">
              {notice}
            </p>
          )}
          <div className="grid min-w-0 gap-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-6">
            <div className="hidden lg:block">
              <ProfileSidebar
                customer={customer}
                onLogout={customer ? logout : undefined}
                onNotice={setNotice}
                routeNavigation
                activeId={activeId}
              />
            </div>
            <section className="min-w-0">
              {pathname === "/profile" && (
                <ProfileHeroBanner onEdit={() => router.push("/profile/settings")} />
              )}
              {children}
            </section>
          </div>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
