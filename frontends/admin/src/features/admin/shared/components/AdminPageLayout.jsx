"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Users,
  X,
} from "lucide-react";
import { adminApi } from "@/features/admin/lib/adminApi";
import { AdminSignIn } from "@/features/admin/shared/components/SignIn";
import { cx } from "@/features/admin/shared/components/utils";

const navigation = [
  { label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Sellers", href: "/admin/sellers", icon: Store },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Categories", href: "/admin/categories", icon: Layers3 },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Delivery operations", href: "/admin/delivery", icon: Truck },
  { label: "Payments & payouts", href: "/admin/payments", icon: CreditCard },
  { label: "Disputes & returns", href: "/admin/returns", icon: Scale },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Banners & content", href: "/admin/banners", icon: Megaphone },
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
  { label: "Audit log", href: "/admin/audit", icon: ScrollText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminPageLayout({ children, activeSection }) {
  const pathname = usePathname();
  const [admin, setAdmin] = useState(null);
  const [busy, setBusy] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [dark, setDark] = useState(true);
  const [themeInitialized, setThemeInitialized] = useState(false);

  useEffect(() => {
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
        Loading admin console?
      </div>
    );
  }

  if (!admin) {
    return <AdminSignIn onSuccess={(value) => setAdmin(value)} />;
  }

  const currentSection =
    activeSection ?? navigation.find((item) => item.href === pathname)?.label ?? "Overview";

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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-neutral-200 bg-white px-4 py-5 transition-transform dark:border-neutral-800 dark:bg-[#0c0c0c] lg:translate-x-0",
          mobileNav ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-start justify-between px-2">
          <Link href="/admin/overview" className="block">
            <span className="block rounded-lg bg-[#101010] px-2 py-1">
              <img src="/logo.png" alt="AcquireAuto Parts" className="h-12 w-full object-contain" />
            </span>
            <b className="mt-2 inline-flex rounded bg-orange-50 px-2 py-1 text-[9px] text-brand dark:bg-orange-950/50">
              Admin Console
            </b>
          </Link>
          <button
            aria-label="Close menu"
            onClick={() => setMobileNav(false)}
            className="rounded p-1 lg:hidden"
          >
            <X size={17} />
          </button>
        </div>

        <nav className="mt-7 flex-1 space-y-1 overflow-y-auto">
          {navigation.map(({ label, href, icon: Icon }) => {
            const isActive =
              pathname === href || (href === "/admin/overview" && pathname === "/admin");
            return (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileNav(false)}
                className={cx(
                  "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold transition",
                  isActive
                    ? "border-l-[3px] border-brand bg-orange-50 text-neutral-900 dark:bg-orange-950/40 dark:text-white"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900",
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <Link
            href={process.env.NEXT_PUBLIC_STORE_URL || "/"}
            className="block rounded-lg px-3 py-2 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            ? View storefront
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/90 px-4 backdrop-blur-xl dark:border-neutral-800 dark:bg-[#0c0c0c]/90 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileNav(true)}
              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
            >
              <Menu size={18} />
            </button>
            <span className="truncate text-xs font-bold">{currentSection}</span>
          </div>

          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <Bell size={17} />
            </button>
            <button
              onClick={() => setDark((value) => !value)}
              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div className="hidden items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 sm:flex dark:border-neutral-800 dark:bg-neutral-900">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
                {admin?.name?.slice(0, 2)?.toUpperCase() || "AD"}
              </div>
              <div className="text-left leading-tight">
                <strong className="block text-[10px] font-bold">{admin?.name || "Admin"}</strong>
                <small className="text-[9px] text-neutral-400">Marketplace ops</small>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 xl:p-8">
          <div className="mx-auto max-w-[1600px] space-y-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
