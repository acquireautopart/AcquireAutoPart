"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  PackageCheck,
  RefreshCw,
  ChevronRight,
  ShoppingBag,
  ArrowLeft,
  Loader2,
  ImageOff,
  Ban,
} from "lucide-react";
import { ordersApi } from "@/features/storefront/lib/shopApi";
import { formatPrice } from "@/features/storefront/lib/format";
import useCart from "@/features/storefront/hooks/useCart";
import ProfileSubpageFrame from "@/features/profile/components/ProfileSubpageFrame";
import { ProfileResourceState, ProfileModal } from "@/features/profile/components/ProfileFormKit";
import { getImageUrl } from "@/features/storefront/lib/imageUrl";

const STATUS_TEXT = {
  Processing: "We are preparing your order.",
  Shipped: "Your order is on its way.",
  Delivered: "Your order was delivered successfully.",
  Cancelled: "This order was cancelled.",
};

function shipmentEventLabel(status) {
  return (
    {
      Packed: "Seller has processed your order",
      "Ready for Pickup": "Shipment is ready for delivery partner pickup",
      "Picked Up": "Your item has been picked up by the delivery partner",
      "Arrived at Origin Hub": "Your item has arrived at a facility",
      "Arrived at Facility": "Your item has arrived at a facility",
      "Left Facility": "Your item has left a facility",
      "In Transit": "Your item has left a facility",
      "Reached Destination Hub": "Your item has reached the hub nearest to you",
      "Out for Delivery": "Your item is out for delivery",
      Delivered: "Your item has been delivered",
      "At Seller": "Your return has been received at the seller facility",
      "Replacement Shipped": "Your replacement has been shipped",
    }[status] || status
  );
}

/* Renders a product image, falling back to an icon when the URL is missing. */
function Thumb({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        className={`grid place-items-center bg-[var(--pf-card-2)] text-[var(--pf-muted)] ${className}`}
      >
        <ImageOff size={20} strokeWidth={1.5} />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`bg-white object-contain ${className}`}
    />
  );
}

function OrderCard({ order, onViewDetails, onBuyAgain }) {
  const router = useRouter();
  const first = order.items[0];
  const moreCount = order.items.length - 1;

  return (
    <>
      <article className="hidden overflow-hidden rounded-xl border border-[var(--pf-border)] bg-[var(--pf-card)] sm:block">
        <div className="grid gap-2 bg-[var(--pf-card-2)] px-4 py-3 text-xs sm:grid-cols-[1fr_.65fr_1.35fr_auto] sm:gap-4 sm:px-5">
          <div>
            <span className="block text-[10px] uppercase text-[var(--pf-muted)]">Order placed</span>
            <b className="mt-0.5 block">{order.date}</b>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-[var(--pf-muted)]">Total</span>
            <b className="mt-0.5 block">
              {formatPrice(order.totals.total, order.currency || "USD")}
            </b>
          </div>
          <div className="hidden sm:block">
            <span className="block text-[10px] uppercase text-[var(--pf-muted)]">Ship to</span>
            <b className="mt-0.5 block truncate">{order.address?.name || "—"}</b>
          </div>
          <div className="sm:text-right">
            <span className="text-[10px] uppercase text-[var(--pf-muted)]">
              Order # {order.code}
            </span>
            <div>
              <button
                className="mt-1 text-xs font-semibold text-[var(--pf-brand)] hover:underline"
                onClick={() => onViewDetails(order.id)}
              >
                View order details
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-bold">{order.status}</h2>
              <p className="mt-1 text-sm text-[var(--pf-text-2)]">
                {STATUS_TEXT[order.status] || ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {order.status === "Delivered" && (
                <button
                  className="rounded-full bg-[var(--pf-brand)] px-4 py-2 text-xs font-bold text-white hover:brightness-110"
                  onClick={() => router.push("/profile/returns")}
                >
                  Return / Refund
                </button>
              )}
              <button
                className="rounded-full border border-[var(--pf-border)] px-4 py-2 text-xs font-semibold hover:border-[var(--pf-brand)]"
                onClick={() => router.push("/profile/contact")}
              >
                Ask a question
              </button>
            </div>
          </div>
          <div className="mt-5 flex gap-3 sm:gap-4">
            <Thumb
              src={first?.image ? getImageUrl(first.image, { width: 240, quality: 80 }) : ""}
              alt={first?.name || ""}
              className="h-20 w-20 shrink-0 rounded-lg border border-[var(--pf-border)] p-1 sm:h-24 sm:w-24"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold tracking-wide text-[var(--pf-muted)]">
                {first?.category || "PART"}
              </span>
              <h3 className="mt-1 line-clamp-2 text-sm font-semibold sm:text-base">
                {first?.name || "Order item"}
              </h3>
              <p className="mt-1 text-xs text-[var(--pf-muted)]">
                {moreCount > 0
                  ? `+ ${moreCount} more item${moreCount === 1 ? "" : "s"}`
                  : "AcquireAuto marketplace"}
              </p>
              <p className="mt-2 font-bold">
                {formatPrice(order.totals.total, order.currency || "USD")}
              </p>
              {first && (
                <button
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--pf-brand-soft)] px-3 py-1.5 text-xs font-bold text-[var(--pf-brand)]"
                  onClick={() => onBuyAgain(first)}
                >
                  <RefreshCw size={13} /> Buy it again
                </button>
              )}
            </div>
          </div>
        </div>
      </article>
      <details className="overflow-hidden rounded-xl border border-[var(--pf-border)] bg-[var(--pf-card)] sm:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
          <Thumb
            src={first?.image ? getImageUrl(first.image, { width: 240, quality: 80 }) : ""}
            alt=""
            className="h-20 w-20 shrink-0 rounded-lg"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{first?.name || "Order item"}</span>
            <span className="mt-1 block text-xs text-[var(--pf-text-2)]">
              Ordered on {order.date}
            </span>
            <span className="mt-1 block text-xs font-semibold text-[var(--pf-brand)]">
              {order.status} · {formatPrice(order.totals.total, order.currency || "USD")}
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-[var(--pf-muted)]" />
        </summary>
        <div className="space-y-3 border-t border-[var(--pf-border)] p-3">
          <p className="text-xs text-[var(--pf-muted)]">Order # {order.code}</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="text-xs font-semibold text-[var(--pf-brand)]"
              onClick={() => onViewDetails(order.id)}
            >
              View order details
            </button>
            {order.status === "Delivered" && (
              <button
                className="rounded-full bg-[var(--pf-brand)] px-3 py-2 text-xs font-bold text-white"
                onClick={() => router.push("/profile/returns")}
              >
                Return / Refund
              </button>
            )}
            <button
              className="rounded-full border border-[var(--pf-border)] px-3 py-2 text-xs font-semibold"
              onClick={() => router.push("/profile/contact")}
            >
              Ask a question
            </button>
            {first && (
              <button
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--pf-brand-soft)] px-3 py-2 text-xs font-bold text-[var(--pf-brand)]"
                onClick={() => onBuyAgain(first)}
              >
                <RefreshCw size={13} /> Buy it again
              </button>
            )}
          </div>
        </div>
      </details>
    </>
  );
}

function OrderDetailsModal({ order, loading, error, cancelling, onClose, onCancel }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setConfirming(false);
  }, [order?.id]);

  return (
    <ProfileModal
      title={order ? `Order # ${order.code}` : "Order details"}
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--pf-text-2)]">
          <Loader2 size={18} className="animate-spin text-[var(--pf-brand)]" /> Loading order…
        </div>
      )}

      {!loading && error && (
        <p className="py-6 text-center text-sm text-[var(--pf-text-2)]">{error}</p>
      )}

      {!loading && !error && order && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[var(--pf-brand-soft)] px-3 py-1 text-xs font-bold text-[var(--pf-brand)]">
              {order.status}
            </span>
            <span className="text-xs text-[var(--pf-text-2)]">Placed on {order.date}</span>
          </div>

          {Boolean(order.timeline?.length) && (
            <ol className="space-y-3 rounded-lg border border-[var(--pf-border)] p-4">
              {order.timeline.map((step, index) => (
                <li key={`${step.label}-${index}`} className="flex items-start gap-3 text-sm">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      step.done ? "bg-[var(--pf-brand)]" : "bg-[var(--pf-border)]"
                    }`}
                  />
                  <span className="min-w-0">
                    <b className="block font-semibold">{step.label}</b>
                    <span className="text-xs text-[var(--pf-text-2)]">{step.date}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}

          {order.shipments?.map((shipment, shipmentIndex) => (
            <section
              key={shipmentIndex}
              className="rounded-lg border border-[var(--pf-border)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-[var(--pf-muted)]">
                  Package {shipmentIndex + 1} · {shipment.trackingStatus || shipment.status}
                </h3>
                {shipment.tracking &&
                  (shipment.trackingUrl ? (
                    <a
                      href={shipment.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[var(--pf-brand)] underline"
                    >
                      {shipment.carrier ? `${shipment.carrier}: ` : ""}
                      {shipment.tracking}
                    </a>
                  ) : (
                    <span className="text-xs text-[var(--pf-text-2)]">
                      {shipment.carrier ? `${shipment.carrier}: ` : ""}
                      {shipment.tracking}
                    </span>
                  ))}
              </div>
              {shipment.deliveryOtp && (
                <p className="mt-3 rounded-lg bg-[var(--pf-brand-soft)] p-3 text-xs">
                  <b>Delivery OTP:</b>{" "}
                  <span className="font-mono text-base font-extrabold tracking-[.2em]">
                    {shipment.deliveryOtp}
                  </span>
                  <span className="mt-1 block text-[var(--pf-text-2)]">
                    Share this code with the delivery agent only when you receive the package.
                  </span>
                </p>
              )}
              {shipment.events?.length > 0 && (
                <ol className="mt-3 space-y-3">
                  {shipment.events.map((event, eventIndex) => (
                    <li
                      key={`${event.status}-${event.occurredAt || eventIndex}`}
                      className="flex items-start gap-3 text-sm"
                    >
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--pf-brand)]" />
                      <span>
                        <b className="block font-semibold">
                          {shipmentEventLabel(event.status)}
                        </b>
                        <span className="text-xs text-[var(--pf-text-2)]">
                          {event.occurredAt
                            ? new Date(event.occurredAt).toLocaleString()
                            : "Update received"}
                          {event.source === "carrier" || event.source === "carrier_webhook"
                            ? " · Carrier update"
                            : ""}
                          {event.attemptReason ? ` · ${event.attemptReason}` : ""}
                          {event.location?.label ? ` · ${event.location.label}` : ""}
                        </span>
                        {event.location && (
                          <a
                            href={`https://www.google.com/maps?q=${event.location.latitude},${event.location.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs font-semibold text-[var(--pf-brand)] underline"
                          >
                            View scan location
                          </a>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}

          <div>
            <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--pf-muted)]">
              Items
            </h3>
            <ul className="divide-y divide-[var(--pf-border)] rounded-lg border border-[var(--pf-border)]">
              {order.items.map((item) => (
                <li key={item.productId} className="flex items-center gap-3 p-3">
                  <Thumb
                    src={item.image ? getImageUrl(item.image, { width: 240, quality: 80 }) : ""}
                    alt={item.name}
                    className="h-14 w-14 shrink-0 rounded-lg border border-[var(--pf-border)] p-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-[var(--pf-muted)]">
                      {[item.brand, item.category && item.category.toUpperCase()]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-1 text-xs text-[var(--pf-text-2)]">
                      Qty {item.quantity} ·{" "}
                      {formatPrice(item.lineTotal, item.currency || order.currency || "USD")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--pf-border)] p-4">
              <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--pf-muted)]">
                Delivery address
              </h3>
              <p className="text-sm font-semibold">{order.address?.name}</p>
              <p className="mt-1 text-xs text-[var(--pf-text-2)]">
                {[
                  order.address?.line,
                  order.address?.city,
                  order.address?.region,
                  order.address?.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {order.address?.phone && (
                <p className="mt-1 text-xs text-[var(--pf-text-2)]">{order.address.phone}</p>
              )}
            </div>
            <div className="rounded-lg border border-[var(--pf-border)] p-4">
              <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--pf-muted)]">
                Payment
              </h3>
              <p className="text-sm font-semibold">
                {order.payment?.method === "Card" && order.payment?.label
                  ? order.payment.label
                  : order.payment?.method}
              </p>
              {order.payment?.method === "Card" && (
                <p className="mt-1 text-xs text-[var(--pf-text-2)]">
                  {order.payment.paid ? "Paid" : "Payable on delivery"}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--pf-border)] p-4 text-sm">
            <div className="flex justify-between py-1 text-[var(--pf-text-2)]">
              <span>Subtotal</span>
              <span>{formatPrice(order.totals.subtotal, order.currency || "USD")}</span>
            </div>
            <div className="flex justify-between py-1 text-[var(--pf-text-2)]">
              <span>Shipping</span>
              <span>
                {order.totals.shipping > 0
                  ? formatPrice(order.totals.shipping, order.currency || "USD")
                  : "Free"}
              </span>
            </div>
            {order.totals.savings - (order.appliedDiscount?.amount || 0) > 0 && (
              <div className="flex justify-between py-1 text-emerald-700">
                <span>Savings vs original prices</span>
                <span>{formatPrice(order.totals.savings - (order.appliedDiscount?.amount || 0), order.currency || "USD")}</span>
              </div>
            )}
            {order.appliedDiscount?.amount > 0 && (
              <div className="flex justify-between py-1 text-emerald-700">
                <span>Coupon · {order.appliedDiscount.code}</span>
                <span>−{formatPrice(order.appliedDiscount.amount, order.currency || "USD")}</span>
              </div>
            )}
            {order.totals.tax > 0 && (
              <div className="flex justify-between py-1 text-[var(--pf-text-2)]">
                <span>Tax</span>
                <span>{formatPrice(order.totals.tax, order.currency || "USD")}</span>
              </div>
            )}
            {order.totals.platformFee > 0 && (
              <div className="flex justify-between py-1 text-[var(--pf-text-2)]">
                <span>Platform fee</span>
                <span>{formatPrice(order.totals.platformFee, order.currency || "USD")}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-[var(--pf-border)] pt-2 font-bold">
              <span>Total</span>
              <span>{formatPrice(order.totals.total, order.currency || "USD")}</span>
            </div>
          </div>

          {order.canCancel && (
            <div className="rounded-lg border border-[var(--pf-border)] p-4">
              {confirming ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Cancel this order?</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={() => onCancel(order.id)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-red-500 px-4 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60"
                    >
                      {cancelling && <Loader2 size={15} className="animate-spin" />} Yes, cancel
                      order
                    </button>
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={() => setConfirming(false)}
                      className="inline-flex min-h-10 items-center rounded-lg border border-[var(--pf-border)] px-4 text-sm font-semibold disabled:opacity-60"
                    >
                      Keep order
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--pf-border)] px-4 text-sm font-semibold hover:border-red-500 hover:text-red-500"
                >
                  <Ban size={15} /> Cancel order
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </ProfileModal>
  );
}

export default function OrdersPageClient({
  initialQuery = "",
  initialType = "orders",
  initialPeriod = "all",
}) {
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(
    initialType === "not-shipped" ? "not-shipped" : "orders",
  );
  const [period, setPeriod] = useState(
    ["30", "90"].includes(initialPeriod) ? initialPeriod : "all",
  );
  const [year, setYear] = useState(/^\d{4}$/.test(initialPeriod) ? initialPeriod : "all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftType, setDraftType] = useState(
    initialType === "not-shipped" ? "not-shipped" : "orders",
  );
  const [draftPeriod, setDraftPeriod] = useState(initialPeriod);
  const [notice, setNotice] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const { addItem } = useCart();

  const reload = async ({ silent = false } = {}) => {
    if (!silent) setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await ordersApi.list();
      setState({ loading: false, error: null, data });
      return data;
    } catch (error) {
      setState({ loading: false, error, data: null });
      return undefined;
    }
  };

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!detailId) return undefined;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const { order } = await ordersApi.get(detailId);
        if (active) {
          setDetail(order);
          setDetailError("");
        }
      } catch (pollError) {
        if (active) setDetailError(pollError.message);
      }
    }, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [detailId]);

  const orders = state.data?.orders || [];
  const summary = state.data?.summary || { total: 0, spent: 0 };
  const years = state.data?.years || [];
  const { loading, error } = state;

  const applyFilters = () => {
    setActiveTab(draftType);
    if (/^\d{4}$/.test(draftPeriod)) {
      setYear(draftPeriod);
      setPeriod("all");
    } else {
      setYear("all");
      setPeriod(draftPeriod);
    }
    setFilterOpen(false);
  };

  useEffect(() => {
    if (!filterOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event) {
      if (event.key === "Escape") setFilterOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [filterOpen]);

  const buyAgain = useMemo(() => {
    const seen = new Map();
    for (const order of orders) {
      for (const item of order.items) {
        if (!seen.has(item.productId)) seen.set(item.productId, item);
      }
    }
    return [...seen.values()];
  }, [orders]);

  const filtered = orders.filter((order) => {
    const term = query.trim().toLowerCase();
    const haystack = `${order.code} ${order.status} ${order.date} ${order.items
      .map((item) => `${item.name} ${item.brand} ${item.category}`)
      .join(" ")}`.toLowerCase();
    const matchesQuery = !term || haystack.includes(term);
    const matchesTab =
      activeTab !== "not-shipped" || ["Processing", "Shipped"].includes(order.status);
    const placedAt = new Date(order.placedAt);
    const matchesYear = year === "all" || placedAt.getFullYear() === Number(year);
    const days = period === "30" ? 30 : period === "90" ? 90 : null;
    const matchesPeriod = !days || (Date.now() - placedAt.getTime()) / 86400000 <= days;
    return matchesQuery && matchesTab && matchesYear && matchesPeriod;
  });

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const buyItAgainItem = (item) => {
    addItem({
      id: item.productId,
      name: item.name,
      brand: item.brand,
      category: item.category,
      variant: item.variant,
      price: item.price,
      oldPrice: item.oldPrice,
      image: item.image,
    });
    showNotice(`${item.name} added to your cart`);
  };

  const openDetails = async (id) => {
    setDetailId(id);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const { order } = await ordersApi.get(id);
      setDetail(order);
    } catch (detailError_) {
      setDetailError(detailError_.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailId(null);
    setDetail(null);
    setDetailError("");
  };

  const cancelOrder = async (id) => {
    setCancelling(true);
    try {
      const { order } = await ordersApi.cancel(id);
      setDetail(order);
      showNotice("Order cancelled");
      reload({ silent: true });
    } catch (cancelError) {
      setDetailError(cancelError.message);
    } finally {
      setCancelling(false);
    }
  };

  const content = (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Your Orders</h1>
        <span className="hidden text-xs text-[var(--pf-muted)] sm:block">
          {summary.total} orders placed
        </span>
      </div>
      <div className="mb-4 flex flex-row gap-0 sm:gap-3">
        <label className="relative min-w-0 flex-1">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pf-muted)]"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search all orders"
            aria-label="Search all orders"
            className="h-11 w-full rounded-l-lg border border-r-0 border-[var(--pf-border)] bg-[var(--pf-card)] pl-10 pr-3 text-sm outline-none focus:border-[var(--pf-brand)] sm:rounded-lg sm:border-r"
          />
        </label>
        <Link
          href="/profile/orders/filter"
          className="hidden h-11 items-center justify-center gap-2 rounded-lg border border-[var(--pf-border)] px-4 text-sm font-semibold hover:border-[var(--pf-brand)] hover:text-[var(--pf-brand)] sm:inline-flex"
        >
          <SlidersHorizontal size={16} /> Filter <ChevronRight size={16} />
        </Link>
        <button
          type="button"
          aria-expanded={filterOpen}
          onClick={() => {
            setDraftType(activeTab);
            setDraftPeriod(year !== "all" ? year : period);
            setFilterOpen((open) => !open);
          }}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-r-lg border border-[var(--pf-border)] px-3 text-sm font-semibold sm:hidden"
        >
          <SlidersHorizontal size={16} /> Filter <ChevronRight size={16} />
        </button>
        <button
          onClick={() => setQuery(query.trim())}
          className="hidden h-11 rounded-lg bg-[var(--pf-brand)] px-6 text-sm font-bold text-white hover:brightness-110 sm:inline-flex sm:items-center"
        >
          Search Orders
        </button>
      </div>
      {filterOpen && (
        <div
          className="pf fixed inset-0 z-[110] flex h-[100dvh] flex-col overflow-hidden bg-[var(--pf-bg)] sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-order-filter-title"
        >
          <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-[var(--pf-border)] bg-[var(--pf-card-2)] px-4">
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="inline-flex items-center gap-2 py-3 text-sm font-bold"
              aria-label="Back to orders"
            >
              <ArrowLeft size={20} /> Back
            </button>
            <h2 id="mobile-order-filter-title" className="sr-only">
              Filter orders
            </h2>
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-full bg-[var(--pf-brand)] px-4 py-2 text-xs font-bold text-white"
            >
              Apply
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <fieldset>
              <legend className="w-full border-b border-[var(--pf-border)] bg-[var(--pf-card)] px-5 py-4 text-sm font-extrabold uppercase tracking-wide text-[var(--pf-brand)]">
                Filter by order type
              </legend>
              {[
                ["orders", "Orders"],
                ["not-shipped", "Not Yet Shipped"],
                ["buy-again", "Buy Again"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className="flex min-h-[68px] cursor-pointer items-center gap-4 border-b border-[var(--pf-border)] bg-[var(--pf-card)] px-5 text-base"
                >
                  <input
                    type="radio"
                    name="mobile-order-type"
                    value={value}
                    checked={draftType === value}
                    onChange={() => setDraftType(value)}
                    className="h-6 w-6 accent-[var(--pf-brand)]"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend className="w-full border-b border-[var(--pf-border)] bg-[var(--pf-card)] px-5 py-4 text-sm font-extrabold uppercase tracking-wide text-[var(--pf-brand)]">
                Filter by order date
              </legend>
              {[
                ["30", "Last 30 days"],
                ["90", "Last 3 months"],
                ["all", "All dates"],
                ...years.map((value) => [String(value), String(value)]),
              ].map(([value, label]) => (
                <label
                  key={value}
                  className="flex min-h-[68px] cursor-pointer items-center gap-4 border-b border-[var(--pf-border)] bg-[var(--pf-card)] px-5 text-base"
                >
                  <input
                    type="radio"
                    name="mobile-order-period"
                    value={value}
                    checked={draftPeriod === value}
                    onChange={() => setDraftPeriod(value)}
                    className="h-6 w-6 accent-[var(--pf-brand)]"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          </div>
        </div>
      )}
      <div className="mb-4 hidden border-b border-[var(--pf-border)] sm:flex">
        {[
          ["orders", "Orders"],
          ["buy-again", "Buy Again"],
          ["not-shipped", "Not Yet Shipped"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === id ? "border-[var(--pf-brand)] text-[var(--pf-brand)]" : "border-transparent text-[var(--pf-text-2)]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mb-4 hidden items-center gap-2 text-sm sm:flex">
        {summary.total} orders placed in{" "}
        <select
          aria-label="Order year"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          className="rounded-lg border border-[var(--pf-border)] bg-[var(--pf-card)] px-3 py-2"
        >
          <option value="all">All years</option>
          {years.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:hidden">
        {buyAgain.slice(0, 2).map((item, index) => (
          <Link key={item.productId} href="/parts" className="pf-card overflow-hidden p-3">
            <h2 className="min-h-12 text-lg font-extrabold leading-tight">
              {index === 0 ? "Buy again" : "You might like"}
            </h2>
            <Thumb
              src={item.image ? getImageUrl(item.image, { width: 320, quality: 80 }) : ""}
              alt={item.name}
              className="mx-auto mt-2 h-28 w-full rounded-md"
            />
            <p className="mt-2 truncate text-xs font-semibold">{item.name}</p>
          </Link>
        ))}
      </div>
      <div className="mb-3 flex items-center justify-between sm:hidden">
        <h2 className="text-xl font-extrabold">Purchase history</h2>
        <select
          aria-label="Order year"
          value={year}
          onChange={(event) => {
            setYear(event.target.value);
            setPeriod("all");
          }}
          className="rounded-lg border border-[var(--pf-border)] bg-[var(--pf-card)] px-2 py-2 text-sm"
        >
          <option value="all">All years</option>
          {years.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>

      {activeTab === "buy-again" ? (
        buyAgain.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {buyAgain.map((item) => (
              <div key={item.productId} className="pf-card flex flex-col p-3">
                <Thumb
                  src={item.image ? getImageUrl(item.image, { width: 320, quality: 80 }) : ""}
                  alt={item.name}
                  className="mx-auto h-32 w-full rounded-md"
                />
                <p className="mt-3 line-clamp-2 text-sm font-semibold">{item.name}</p>
                <p className="mt-1 text-xs text-[var(--pf-muted)]">{item.brand}</p>
                <p className="mt-1 font-bold text-[var(--pf-brand)]">
                  {formatPrice(item.price, item.currency || order.currency || "USD")}
                </p>
                <button
                  onClick={() => buyItAgainItem(item)}
                  className="mt-auto inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--pf-brand)] px-3 text-xs font-bold text-white hover:brightness-110"
                >
                  <RefreshCw size={13} /> Add to cart
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="pf-card grid place-items-center px-5 py-12 text-center">
            <PackageCheck className="text-[var(--pf-brand)]" size={30} />
            <h2 className="mt-3 font-bold">Nothing to reorder yet</h2>
            <p className="mt-1 text-sm text-[var(--pf-muted)]">
              Items you have ordered before will appear here.
            </p>
          </div>
        )
      ) : (
        <>
          <div className="space-y-4">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onViewDetails={openDetails}
                onBuyAgain={buyItAgainItem}
              />
            ))}
          </div>
          {!filtered.length && (
            <div className="pf-card grid place-items-center px-5 py-12 text-center">
              <PackageCheck className="text-[var(--pf-brand)]" size={30} />
              <h2 className="mt-3 font-bold">No matching orders</h2>
              <p className="mt-1 text-sm text-[var(--pf-muted)]">
                Try another search or change your filters.
              </p>
            </div>
          )}
        </>
      )}

      <div className="mt-5 text-center text-xs text-[var(--pf-muted)]">
        <ShoppingBag className="mr-1 inline" size={14} /> Total spent{" "}
        {formatPrice(summary.spent || 0)} across your orders.
      </div>
    </>
  );

  return (
    <ProfileSubpageFrame title="Your Orders" activeId="orders">
      <ProfileResourceState
        loading={loading}
        error={error}
        onRetry={reload}
        signInLabel="Sign in to your account to see your orders."
      >
        {content}
      </ProfileResourceState>

      {notice && (
        <div
          role="status"
          className="pf-card fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm px-4 py-3 text-sm font-semibold pf-shadow"
        >
          {notice}
        </div>
      )}

      {detailId && (
        <OrderDetailsModal
          order={detail}
          loading={detailLoading}
          error={detailError}
          cancelling={cancelling}
          onClose={closeDetails}
          onCancel={cancelOrder}
        />
      )}
    </ProfileSubpageFrame>
  );
}
