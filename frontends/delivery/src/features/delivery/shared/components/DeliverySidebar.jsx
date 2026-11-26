"use client";

import { useEffect, useState } from "react";
import {
  Clock3,
  Home,
  ListTodo,
  LogOut,
  PackageCheck,
  Truck,
  UserRound,
  X,
} from "lucide-react";

export const DELIVERY_SECTIONS = [
  { key: "Dashboard", label: "Dashboard", hint: "Today's route", icon: Home },
  {
    key: "New orders",
    label: "New orders",
    hint: "Waiting for pickup",
    icon: ListTodo,
  },
  {
    key: "My deliveries",
    label: "My deliveries",
    hint: "In progress",
    icon: PackageCheck,
  },
  {
    key: "Earnings",
    label: "Earnings",
    hint: "Daily and period payouts",
    icon: Clock3,
  },
  {
    key: "Profile",
    label: "Profile",
    hint: "Account and password",
    icon: UserRound,
  },
];

export function getDeliverySections(role) {
  if (role === "hub_staff") {
    return [
      { key: "Dashboard", label: "Hub scans", hint: "Facility arrivals and dispatch", icon: PackageCheck },
      DELIVERY_SECTIONS[3],
      DELIVERY_SECTIONS[4],
    ];
  }
  return DELIVERY_SECTIONS;
}

export default function DeliverySidebar({
  agent,
  activeSection,
  onSelectSection,
  onLogout,
}) {
  const [sidebarPromoVisible, setSidebarPromoVisible] = useState(false);
  const sections = getDeliverySections(agent?.staffRole);

  useEffect(() => {
    setSidebarPromoVisible(
      localStorage.getItem("acquireauto-sidebar-promo-dismissed") !== "true",
    );
  }, []);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col overflow-y-auto border-r border-slate-200 bg-white md:flex">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700">
          <Truck size={19} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-extrabold tracking-tight">
            Acquire<span className="text-orange-600">Auto</span>
          </p>
          <p className="text-[10px] font-semibold text-slate-400">
            {agent?.staffRole === "hub_staff" ? "Hub staff" : "Delivery partner"}
          </p>
        </div>
      </div>

      {agent && (
        <div className="mx-4 mt-4 rounded-xl bg-slate-50 px-4 py-3">
          <p className="truncate text-xs font-bold">{agent.name}</p>
          <p className="truncate text-[10px] font-semibold text-slate-400">
            {agent.phone || "Delivery agent"}
          </p>
        </div>
      )}

      <nav className="mt-4 flex-1 space-y-1 px-3 pb-3">
        <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          Workspace
        </p>
        {sections.map(({ key, label, hint, icon: Icon }) => {
          const active = activeSection === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectSection(key)}
              aria-current={active ? "page" : undefined}
              className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                active
                  ? "bg-orange-50 text-orange-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon size={16} className="mt-0.5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-xs font-bold">{label}</span>
                <span className="block truncate text-[10px] font-medium text-slate-400">
                  {hint}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {sidebarPromoVisible && (
        <div className="relative mx-3 mb-3 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950 p-3 text-white">
          <button
            type="button"
            aria-label="Dismiss sidebar promotion"
            onClick={() => {
              localStorage.setItem("acquireauto-sidebar-promo-dismissed", "true");
              setSidebarPromoVisible(false);
            }}
            className="absolute right-2 top-2 rounded-md p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X size={13} />
          </button>
          <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-orange-300">
            Marketplace control
          </p>
          <p className="mt-1 pr-5 text-[10px] leading-relaxed text-slate-300">
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

      <div className="border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </aside>
  );
}
