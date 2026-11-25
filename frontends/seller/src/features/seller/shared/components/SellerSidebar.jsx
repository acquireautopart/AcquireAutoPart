"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Tag,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cx } from "@/features/seller/shared/components/utils";

const navigation = [
  ["Dashboard", LayoutDashboard, "/seller"],
  ["Products", Package, "/seller/products"],
  ["Orders", ShoppingCart, "/seller/orders"],
  ["Inventory", Boxes, "/seller/inventory"],
  ["Returns", ArrowDownRight, "/seller/returns"],
  ["Payouts", Wallet, "/seller/payouts"],
  ["Analytics", BarChart3, "/seller/analytics"],
  ["Discounts", Tag, "/seller/discounts"],
  ["Customers", Users, "/seller/customers"],
  ["Store settings", Settings, "/seller/settings"],
];

export default function SellerSidebar({
  activeSection,
  mobileNav,
  pendingOrders,
  onClose,
  onLogout,
}) {
  return (
    <>
      {mobileNav && (
        <button
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-white px-4 py-5 transition-transform dark:bg-[#0b0b0b] lg:translate-x-0",
          mobileNav ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-start justify-between">
          <Link href="/" className="block px-2">
            <span className="block rounded-lg bg-[#101010] px-2 py-1">
              <img src="/logo.png" alt="AcquireAuto Parts" className="h-12 w-full object-contain" />
            </span>
            <small className="mt-2 block text-[8px] font-bold tracking-[.17em] text-neutral-400">
              SELLER HUB
            </small>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="rounded p-1 text-neutral-500 lg:hidden"
          >
            <X size={17} />
          </button>
        </div>
        <span className="ml-2 mt-3 w-fit rounded bg-orange-50 px-2 py-1 text-[9px] font-bold text-brand dark:bg-orange-950/40">
          Seller Hub
        </span>
        <nav aria-label="Seller navigation" className="mt-7 flex-1 space-y-1 overflow-y-auto">
          {navigation.map(([label, Icon, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={activeSection === label ? "page" : undefined}
              onClick={onClose}
              className={cx(
                "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-xs font-semibold transition",
                activeSection === label
                  ? "border-l-[3px] border-brand bg-orange-50 text-neutral-900 dark:bg-orange-950/40 dark:text-white"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900",
              )}
            >
              <Icon size={17} />
              {label}
              {label === "Orders" && pendingOrders > 0 && (
                <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-[9px] text-orange-700 dark:bg-orange-900 dark:text-orange-200">
                  {pendingOrders}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <Link
            href={process.env.NEXT_PUBLIC_STORE_URL || "/"}
            target="_blank"
            className="flex h-10 w-full items-center gap-3 px-3 text-xs font-semibold text-neutral-600 dark:text-neutral-400"
          >
            <span aria-hidden="true">↗</span> View storefront
          </Link>
          <button
            onClick={onLogout}
            className="flex h-10 w-full items-center gap-3 px-3 text-xs font-semibold text-neutral-600 hover:text-brand dark:text-neutral-400"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>
    </>
  );
}
