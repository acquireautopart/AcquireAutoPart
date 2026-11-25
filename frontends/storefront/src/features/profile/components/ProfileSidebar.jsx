"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  CreditCard,
  BadgeCheck,
  Heart,
  Car,
  Headset,
  ReceiptText,
  LogOut,
  MapPin,
  Pencil,
  Settings,
  Undo2,
  UserRound,
  Wallet,
} from "lucide-react";
import { uploadProfilePhoto } from "@/features/profile/lib/profilePhoto";

export const sidebarItems = [
  { id: "overview", label: "Profile Overview", icon: UserRound },
  { id: "orders", label: "My Orders", icon: Box },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "vehicles", label: "Saved Vehicles", icon: Car },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "payments", label: "Payment Methods", icon: CreditCard },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "ledger", label: "Ledger", icon: ReceiptText },
  { id: "kyc", label: "KYC Status", icon: BadgeCheck },
  { id: "returns", label: "Returns & Refunds", icon: Undo2 },
  { id: "settings", label: "Account Settings", icon: Settings },
  { id: "contact", label: "Contact Us", icon: Headset },
];

export function Avatar({ size = 104, onEdit, className = "", customer }) {
  const [photo, setPhoto] = useState(customer?.profilePhoto || "");

  useEffect(() => {
    setPhoto(customer?.profilePhoto || "");
    const updatePhoto = (event) => {
      if (event?.detail?.photo) setPhoto(event.detail.photo);
    };
    window.addEventListener("profile-avatar-change", updatePhoto);
    return () => window.removeEventListener("profile-avatar-change", updatePhoto);
  }, [customer?.profilePhoto]);

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <div className="grid h-full w-full place-items-center overflow-hidden rounded-full border-2 border-[var(--pf-border)] bg-[var(--pf-card-2)] text-[var(--pf-muted)]">
        {photo ? (
          <img
            src={photo}
            alt={`${customer?.name || "Profile"} profile`}
            className="h-full w-full object-cover"
          />
        ) : customer?.name ? (
          <span className="font-bold text-[var(--pf-brand)]" style={{ fontSize: size * 0.34 }}>
            {customer.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase()}
          </span>
        ) : (
          <UserRound size={size * 0.5} strokeWidth={1.6} />
        )}
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          aria-label="Change profile photo"
          className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--pf-card)] bg-[var(--pf-brand)] text-white hover:brightness-110"
        >
          <Pencil size={12} />
        </button>
      )}
    </div>
  );
}

export default function ProfileSidebar({
  customer,
  onLogout,
  onNotice,
  routeNavigation = false,
  activeId,
}) {
  const [active, setActive] = useState("overview");
  const photoInputRef = useRef(null);
  const pathname = usePathname();
  const customerName = customer?.name || "Your Account";
  const customerEmail = customer?.email || "Sign in to view account";

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const updatedCustomer = await uploadProfilePhoto(file);
      window.dispatchEvent(
        new CustomEvent("profile-avatar-change", { detail: { photo: updatedCustomer.profilePhoto } }),
      );
      onNotice?.("Profile photo updated.");
    } catch (error) {
      onNotice?.(error.message || "Could not update your profile photo.");
    }
  }

  useEffect(() => {
    if (routeNavigation) {
      const current = sidebarItems.find((item) => pathname === `/profile/${item.id}`);
      setActive(activeId || current?.id || "overview");
      return undefined;
    }
    // On the profile landing page, keep highlighting the section in view.
    const targets = sidebarItems.map((item) => document.getElementById(item.id)).filter(Boolean);
    if (!targets.length || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [activeId, pathname, routeNavigation]);

  function go(id) {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", id === "overview" ? "/profile" : `/profile#${id}`);
  }

  const itemClass = (isActive) =>
    `flex min-w-0 items-center gap-3 rounded-lg px-4 py-3 text-xs font-semibold transition-colors lg:w-full ${
      isActive
        ? "bg-[image:var(--pf-active-bg)] text-[var(--pf-brand)] shadow-[inset_3px_0_0_var(--pf-brand)]"
        : "text-[var(--pf-text-2)] hover:bg-[var(--pf-brand-soft)] hover:text-[var(--pf-brand)]"
    }`;

  return (
    <aside
      className="pf-card h-fit p-4 lg:sticky lg:top-32 lg:min-h-[640px] lg:p-5"
      aria-label="Profile navigation"
    >
      <div className="hidden flex-col items-center border-b border-[var(--pf-border)] pb-5 text-center lg:flex">
        <Avatar
          size={96}
          customer={customer}
          onEdit={customer ? () => photoInputRef.current?.click() : undefined}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoChange}
        />
        <h2 className="mt-3 text-sm font-bold">{customerName}</h2>
        <p className="mt-0.5 break-all text-[11px] text-[var(--pf-muted)]">{customerEmail}</p>
      </div>

      <nav className="pf-mobile-nav -mx-1 grid grid-cols-2 gap-1 px-1 lg:mx-0 lg:mt-4 lg:flex lg:flex-col lg:px-0">
        {sidebarItems.map(({ id, label, icon: Icon }) =>
          routeNavigation ? (
            <Link
              key={id}
              href={id === "overview" ? "/profile" : `/profile/${id}`}
              className={itemClass((activeId || active) === id)}
              aria-current={(activeId || active) === id ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          ) : (
            <button
              key={id}
              className={itemClass(active === id)}
              onClick={() => go(id)}
              aria-current={active === id}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          ),
        )}
        {onLogout && (
          <button className={itemClass(false)} onClick={onLogout}>
            <LogOut size={18} strokeWidth={1.8} />
            <span className="whitespace-nowrap">Log Out</span>
          </button>
        )}
      </nav>
    </aside>
  );
}
