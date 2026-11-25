"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, LogIn, RefreshCw, UserRound, X } from "lucide-react";
import AuthDialog from "@/features/storefront/components/AuthDialog";
import { requestCurrentCustomer } from "@/lib/authApi";
import profileApi from "@/features/storefront/lib/profileApi";
import { ordersApi } from "@/features/storefront/lib/shopApi";
import useCart from "@/features/storefront/hooks/useCart";
import { demoProfile } from "@/features/storefront/data/profileDemo";
import {
  AddressesCard,
  ContactUsCard,
  KycStatusCard,
  LedgerCard,
  PaymentsCard,
  ProfileCard,
  RecentOrders,
  ReturnsCard,
  SavedVehicles,
  SettingsCard,
  StatsRow,
  WalletCard,
  WishlistCard,
} from "@/features/profile/components/ProfileSections";

function formatMemberSince(createdAt) {
  if (!createdAt) return demoProfile.memberSince;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return demoProfile.memberSince;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function ProfilePage() {
  const [customer, setCustomer] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | guest | ready | error
  const [errorMessage, setErrorMessage] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [account, setAccount] = useState({ wallet: null, kyc: null });
  const [vehicles, setVehicles] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderSummary, setOrderSummary] = useState({ total: 0, spent: 0 });
  const { addItem: addCartItem } = useCart();

  const loadCustomer = useCallback(async (signal) => {
    setStatus("loading");
    try {
      const { customer: me } = await requestCurrentCustomer({ signal });
      setCustomer(me);
      window.dispatchEvent(new CustomEvent("profile-customer-change", { detail: me }));
      setStatus("ready");

      /* Account summary plus the lists shown on the overview page. */
      const [overview, vehicleList, wishlist, addressList, paymentList, orderList] =
        await Promise.all([
          profileApi.overview({ signal }),
          profileApi.vehicles({ signal }),
          profileApi.wishlist({}, { signal }),
          profileApi.addresses({ signal }),
          profileApi.payments({ signal }),
          ordersApi.list({}, { signal }),
        ]);
      if (signal?.aborted) return;
      setAccount({ wallet: overview.wallet, kyc: overview.kyc });
      setVehicles(vehicleList.vehicles || []);
      setWishlist(wishlist.items || []);
      setAddresses(addressList.addresses || []);
      setPayments(paymentList.payments || []);
      setOrders(orderList.orders || []);
      setOrderSummary(orderList.summary || { total: 0, spent: 0 });
    } catch (error) {
      if (error.name === "AbortError") return;
      if (error.status === 401) {
        setCustomer(null);
        window.dispatchEvent(new CustomEvent("profile-customer-change", { detail: null }));
        setStatus("guest");
      } else {
        setErrorMessage(error.message);
        setStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadCustomer(controller.signal);
    return () => controller.abort();
  }, [loadCustomer]);

  // jump to /profile#orders etc. once the sections exist
  useEffect(() => {
    if (status !== "ready" || !window.location.hash) return;
    const id = window.location.hash.slice(1);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
  }, [status]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleAuthenticated = useCallback(
    (me) => {
      setCustomer(me);
      window.dispatchEvent(new CustomEvent("profile-customer-change", { detail: me }));
      setStatus(me ? "ready" : "guest");
      if (me) loadCustomer();
    },
    [loadCustomer],
  );
  const closeAuth = useCallback(() => setAuthOpen(false), []);

  const addToCart = useCallback(
    (item) => {
      addCartItem(item);
      setNotice(`${item.name} added to your cart`);
    },
    [addCartItem],
  );

  const stats = useMemo(
    () => ({
      orders: orderSummary.total || 0,
      wishlist: wishlist.length,
      vehicles: vehicles.length,
      spent: orderSummary.spent || 0,
    }),
    [orderSummary, wishlist.length, vehicles.length],
  );

  const recentOrders = useMemo(
    () =>
      orders.slice(0, 4).map((order) => ({
        id: order.code,
        status: order.status,
        date: order.date,
        total: order.totals.total,
      })),
    [orders],
  );

  const profile = useMemo(
    () => ({
      tier: demoProfile.tier,
      phone: customer?.phone || "Add a mobile number",
    }),
    [customer?.phone],
  );

  return (
    <>
      {status === "loading" && (
        <div
          className="grid min-h-[380px] place-items-center text-sm text-[var(--pf-muted)]"
          role="status"
        >
          <span className="flex items-center gap-3">
            <LoaderCircle className="animate-spin text-[var(--pf-brand)]" size={22} /> Loading your
            profile…
          </span>
        </div>
      )}

      {status === "guest" && (
        <div className="pf-card mx-auto grid max-w-xl place-items-center px-6 py-14 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
            <UserRound size={30} />
          </span>
          <h2 className="mt-5 font-display text-2xl font-extrabold">
            Sign in to view your profile
          </h2>
          <p className="mt-2 max-w-sm text-sm text-[var(--pf-text-2)]">
            Your orders, wishlist, saved vehicles and addresses live in your account.
          </p>
          <button
            onClick={() => setAuthOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--pf-brand)] px-6 py-3 text-sm font-bold text-white hover:brightness-110"
          >
            <LogIn size={17} /> Sign In / Register
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="pf-card mx-auto grid max-w-xl place-items-center px-6 py-14 text-center">
          <h2 className="font-display text-xl font-extrabold">Couldn’t load your profile</h2>
          <p className="mt-2 text-sm text-[var(--pf-text-2)]">{errorMessage}</p>
          <button
            onClick={() => loadCustomer()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[var(--pf-brand)] px-5 py-2.5 text-sm font-bold text-[var(--pf-brand)] hover:bg-[var(--pf-brand)] hover:text-white"
          >
            <RefreshCw size={16} /> Try again
          </button>
        </div>
      )}

      {status === "ready" && customer && (
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <ProfileCard
            customer={customer}
            profile={profile}
            memberSince={formatMemberSince(customer.createdAt)}
          />
          <StatsRow stats={stats} />
          <RecentOrders orders={recentOrders} />
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            <SavedVehicles vehicles={vehicles} />
            <WishlistCard items={wishlist} onAddToCart={addToCart} />
          </div>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            <AddressesCard addresses={addresses} />
            <PaymentsCard payments={payments} />
          </div>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            <ReturnsCard />
            <SettingsCard />
          </div>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            <WalletCard wallet={account.wallet} />
            <LedgerCard />
            <KycStatusCard kyc={account.kyc} />
            <ContactUsCard />
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="pf-card pf-shadow fixed inset-x-4 bottom-4 z-[95] flex items-start justify-between gap-3 px-4 py-3 text-xs sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-w-sm"
        >
          <span>{notice}</span>
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss"
            className="text-[var(--pf-brand)]"
          >
            <X size={14} />
          </button>
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
