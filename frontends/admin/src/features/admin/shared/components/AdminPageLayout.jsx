"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  CreditCard,
  LayoutDashboard,
  Layers3,
  LifeBuoy,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Package,
  Scale,
  Settings,
  ShoppingBag,
  Store,
  Truck,
  Sun,
  ScrollText,
  Search,
  Users,
  X,
} from "lucide-react";
import { adminApi } from "@/features/admin/lib/adminApi";
import { AdminSignIn } from "@/features/admin/shared/components/SignIn";
import { cx } from "@/features/admin/shared/components/utils";

const navigation = [
  { label: "Dashboard", href: "/admin/overview", icon: LayoutDashboard },
  { label: "Manage products", href: "/admin/products", icon: Package },
  { label: "Categories", href: "/admin/categories", icon: Layers3 },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Sellers", href: "/admin/sellers", icon: Store },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Delivery operations", href: "/admin/delivery", icon: Truck },
  { label: "Payments & payouts", href: "/admin/payments", icon: CreditCard },
  { label: "Disputes & returns", href: "/admin/returns", icon: Scale },
  { label: "Analytics", href: "/admin/reports", icon: BarChart3 },
  { label: "Offers & content", href: "/admin/banners", icon: Megaphone },
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
  { label: "Audit log", href: "/admin/audit", icon: ScrollText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminPageLayout({ children, activeSection }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [busy, setBusy] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarPromoVisible, setSidebarPromoVisible] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [dark, setDark] = useState(true);
  const [themeInitialized, setThemeInitialized] = useState(false);
  const searchResults = globalSearch.trim()
    ? navigation
        .filter((item) =>
          item.label.toLowerCase().includes(globalSearch.trim().toLowerCase()),
        )
        .slice(0, 5)
    : [];

  useEffect(() => {
    setSidebarPromoVisible(
      localStorage.getItem("acquireauto-sidebar-promo-dismissed") !== "true",
    );
    const stored = localStorage.getItem("acquireauto-theme");
    const isDark = stored !== "light";
    setDark(isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", isDark);
    setThemeInitialized(true);

    adminApi
      .me()
      .then(({ admin: value }) => setAdmin(value))
      .catch(() => setAdmin(null))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    if (!themeInitialized) return;
    localStorage.setItem("acquireauto-theme", dark ? "dark" : "light");
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", dark);
  }, [dark, themeInitialized]);

  async function logout() {
    await adminApi.logout().catch(() => {});
    setAdmin(null);
  }

  if (busy) {
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-50 text-sm text-neutral-500 dark:bg-[#090909]">
        Loading admin console…
      </div>
    );
  }

  if (!admin) {
    return <AdminSignIn onSuccess={(value) => setAdmin(value)} />;
  }

  const currentSection =
    activeSection ??
    navigation.find((item) => item.href === pathname)?.label ??
    "Dashboard";

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-neutral-900 dark:bg-[#090909] dark:text-neutral-100">
      {mobileNav && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-neutral-800 bg-[#101010] px-3 py-4 text-white transition-all duration-200 lg:translate-x-0",
          collapsed ? "lg:w-[76px]" : "lg:w-[224px]",
          mobileNav ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-start justify-between gap-2 px-1">
          <Link
            href="/admin/overview"
            className={cx("block min-w-0 flex-1", collapsed && "lg:hidden")}
          >
            <span className="block rounded-lg bg-[#101010] px-1 py-1">
              <img
                src="/logo.png"
                alt="AcquireAuto Parts"
                className="h-12 w-full object-contain"
              />
            </span>
            <b className="mt-2 inline-flex rounded bg-orange-500/15 px-2 py-1 text-[9px] text-orange-300">
              Admin Console
            </b>
          </Link>
          <button
            aria-label="Close menu"
            onClick={() => setMobileNav(false)}
            className="rounded p-1 text-neutral-400 hover:bg-white/10 lg:hidden"
          >
            <X size={17} />
          </button>
          {collapsed && (
            <Link
              href="/admin/overview"
              title="AcquireAuto admin dashboard"
              className="hidden h-10 w-full items-center justify-center rounded-lg bg-orange-500 font-display text-lg font-black text-white lg:flex"
            >
              A
            </Link>
          )}
        </div>

        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
          {navigation.map(({ label, href, icon: Icon }) => {
            const isActive =
              pathname === href || (href === "/admin/overview" && pathname === "/admin");
            return (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileNav(false)}
                title={collapsed ? label : undefined}
                className={cx(
                  "flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold transition",
                  collapsed && "lg:justify-center lg:px-0",
                  isActive
                    ? "border-l-[3px] border-orange-300 bg-orange-500 text-white shadow-[0_5px_16px_rgba(249,115,22,.24)]"
                    : "text-neutral-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon size={17} className={isActive ? "text-white" : "text-neutral-400"} />
                <span className={cx("truncate", collapsed && "lg:hidden")}>{label}</span>
              </Link>
            );
          })}
        </nav>

        {!collapsed && sidebarPromoVisible && (
          <div className="relative mb-3 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-900 to-orange-950/80 p-3 lg:block">
            <button
              type="button"
              aria-label="Dismiss sidebar promotion"
              onClick={() => {
                localStorage.setItem("acquireauto-sidebar-promo-dismissed", "true");
                setSidebarPromoVisible(false);
              }}
              className="absolute right-2 top-2 rounded-md p-1 text-neutral-400 transition hover:bg-white/10 hover:text-white"
            >
              <X size={13} />
            </button>
            <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-orange-300">
              Marketplace control
            </p>
            <p className="mt-1 pr-5 text-[10px] leading-relaxed text-neutral-300">
              Manage your catalog, partners and operations from one place.
            </p>
            <img
              src="/car.png"
              alt=""
              aria-hidden="true"
              className="mt-2 h-16 w-full rounded-md object-cover object-[center_48%]"
            />
          </div>
        )}

        <div className="space-y-1 border-t border-white/10 pt-3">
          <Link
            href={process.env.NEXT_PUBLIC_STORE_URL || "/"}
            title={collapsed ? "View storefront" : undefined}
            className={cx(
              "flex items-center gap-3 rounded-md px-3 py-2 text-xs font-semibold text-neutral-400 hover:bg-white/10 hover:text-white",
              collapsed && "lg:justify-center lg:px-0",
            )}
          >
            <Store size={15} />
            <span className={collapsed ? "lg:hidden" : ""}>View storefront</span>
          </Link>
          <button
            onClick={logout}
            title={collapsed ? "Log out" : undefined}
            className={cx(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs font-semibold text-neutral-400 hover:bg-white/10 hover:text-white",
              collapsed && "lg:justify-center lg:px-0",
            )}
          >
            <LogOut size={15} />
            <span className={collapsed ? "lg:hidden" : ""}>Log out</span>
          </button>
        </div>
      </aside>

      <div className={cx("min-h-screen transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-[224px]")}>
        <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-neutral-200 bg-white/95 px-3 backdrop-blur-xl dark:border-neutral-800 dark:bg-[#0c0c0c]/95 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              onClick={() => {
                if (window.matchMedia("(min-width: 1024px)").matches) {
                  setCollapsed((value) => !value);
                } else {
                  setMobileNav(true);
                }
              }}
              aria-label="Toggle navigation"
              className="shrink-0 rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Menu size={18} />
            </button>
            <div className="relative min-w-0 max-w-[520px] flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setGlobalSearch("");
                  if (event.key === "Enter" && searchResults[0]) {
                    router.push(searchResults[0].href);
                    setGlobalSearch("");
                  }
                }}
                placeholder="Search anything..."
                aria-label="Search admin pages"
                className="h-10 w-full rounded-full border border-neutral-200 bg-neutral-100/80 pl-10 pr-4 text-xs outline-none transition focus:border-orange-400 focus:bg-white dark:border-neutral-800 dark:bg-neutral-900 dark:focus:bg-[#111]"
              />
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-xl dark:border-neutral-700 dark:bg-[#151515]">
                  {searchResults.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setGlobalSearch("")}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-orange-50 hover:text-brand dark:hover:bg-orange-950/30"
                    >
                      <item.icon size={14} />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <span className="hidden text-[10px] font-semibold text-neutral-400 xl:block">
              {currentSection}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/admin/support"
              aria-label="Support and notifications"
              title="Support and notifications"
              className="relative rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Bell size={17} />
            </Link>
            <button
              onClick={() => setDark((value) => !value)}
              aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
              title={`Switch to ${dark ? "light" : "dark"} theme`}
              className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-neutral-900 text-[10px] font-bold text-white dark:bg-neutral-100 dark:text-neutral-900">
                {admin?.name?.slice(0, 2)?.toUpperCase() || "AD"}
              </div>
              <div className="text-left leading-tight">
                <strong className="block text-[10px] font-bold">{admin?.name || "Admin"} ▾</strong>
                <small className="text-[9px] text-neutral-400">Administrator</small>
              </div>
            </div>
          </div>
        </header>

        <main className="p-3 sm:p-5 xl:p-6">
          <div className="mx-auto max-w-[1600px] space-y-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
