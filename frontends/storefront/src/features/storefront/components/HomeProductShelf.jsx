"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, ChevronRight, Star } from "lucide-react";
import { formatPrice } from "@/features/storefront/lib/format";
import { getImageUrl } from "@/features/storefront/lib/imageUrl";
import { useMarket } from "@/features/storefront/lib/market";
import { requestCurrentCustomer } from "@/lib/authApi";

const RECENT_PRODUCTS_KEY = "acquireauto-recent-products";

function getDiscountPercent(product) {
  const price = Number(product.price);
  const oldPrice = Number(product.oldPrice);
  return oldPrice > price && oldPrice > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
}

function normaliseProduct(product) {
  return {
    id: String(product.id),
    name: product.name || "Auto part",
    brand: product.brand || "",
    category: product.category || "",
    image: product.images?.[0] || product.image || "",
    oldPrice: product.compareAtPrice || product.oldPrice || null,
    price: Number(product.price) || 0,
    currency: product.currency || "USD",
    ratingAverage: Number(product.ratingAverage) || 0,
    ratingCount: Number(product.ratingCount) || 0,
  };
}

export function RecentlyViewedTracker({ product }) {
  useEffect(() => {
    if (!product?.id) return;
    try {
      const previous = JSON.parse(window.localStorage.getItem(RECENT_PRODUCTS_KEY) || "[]");
      const entry = normaliseProduct({
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        image: product.image,
        oldPrice: product.oldPrice,
        price: product.price,
        currency: product.currency,
        ratingAverage: product.ratingAverage,
        ratingCount: product.ratingCount,
      });
      const next = [entry, ...(Array.isArray(previous) ? previous : []).filter((item) => String(item.id) !== String(entry.id))].slice(0, 12);
      window.localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(next));
    } catch {
      // Recent items are a convenience; product browsing still works without storage.
    }
  }, [product]);

  return null;
}

function ProductCard({ product, country, dealMode, recentMode }) {
  const discount = getDiscountPercent(product);
  const href = `/product/${encodeURIComponent(product.id)}?country=${country}`;

  return (
    <article
      className={`group shrink-0 snap-start overflow-hidden bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(23,25,22,.10)] ${
        recentMode
          ? "theme-keep w-[196px] rounded-xl border-[3px] border-white shadow-sm sm:w-[208px]"
          : "w-[190px] rounded-md border border-[#e7e8e7] hover:border-brand/40 sm:w-[212px]"
      }`}
    >
      <Link
        className={`relative block aspect-square overflow-hidden p-2 ${
          recentMode ? "rounded-lg bg-[#f0f0f0]" : "bg-[#f7f8f8] p-4"
        }`}
        href={href}
        aria-label={`View ${product.name}`}
      >
        {product.image ? (
          <Image
            alt={product.name}
            className="object-contain p-3 transition duration-300 group-hover:scale-105"
            fill
            sizes="212px"
            src={getImageUrl(product.image)}
            unoptimized
          />
        ) : (
          <span className="grid h-full place-items-center text-center text-xs text-muted">
            Product image unavailable
          </span>
        )}
        {(discount > 0 || !recentMode) && (
          <span
            className={`absolute left-2 top-2 rounded-sm px-2 py-1 text-[10px] font-bold ${
              recentMode ? "bg-brand text-white" : "bg-[#eaf7ef] text-[#16833c]"
            }`}
          >
            {discount ? `${discount}% off` : dealMode ? "Value pick" : "Popular part"}
          </span>
        )}
      </Link>

      {recentMode ? (
        <div className="flex min-h-[76px] flex-col px-1 pb-1 pt-1.5">
          <span className="truncate text-[11px] text-[#666a70]">
            {product.category || product.brand || "Auto parts"}
          </span>
          <Link className="mt-0.5 line-clamp-1 text-xs font-bold leading-4 text-[#171916] hover:text-brand" href={href}>
            {product.name}
          </Link>
          <span className="mt-auto flex items-center justify-between gap-2 pt-1">
            <strong className="truncate text-xs font-extrabold text-[#171916]">
              {formatPrice(product.price, product.currency || "USD")}
            </strong>
            <span className="shrink-0 text-[10px] font-bold text-brand">View Product</span>
          </span>
        </div>
      ) : (
        <div className="flex min-h-[142px] flex-col p-3">
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted">
            {product.brand || product.category || "Auto part"}
          </span>
          <Link className="mt-1 line-clamp-2 min-h-10 text-[13px] font-semibold leading-5 text-[#20221f] hover:text-brand" href={href}>
            {product.name}
          </Link>
          <span className="mt-1 flex items-center gap-1 text-[10px] text-muted">
            <Star size={12} className={Number(product.ratingCount) > 0 ? "fill-amber-400 text-amber-400" : "text-[#a4a7a1]"} aria-hidden="true" />
            {Number(product.ratingCount) > 0 ? `${Number(product.ratingAverage).toFixed(1)} (${product.ratingCount})` : "No ratings yet"}
          </span>
          <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-2">
            <strong className="text-base font-extrabold text-[#171916]">
              {formatPrice(product.price, product.currency || "USD")}
            </strong>
            {discount > 0 && (
              <del className="text-[11px] text-muted">
                {formatPrice(product.oldPrice, product.currency || "USD")}
              </del>
            )}
          </div>
          {dealMode && discount > 0 && (
            <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-[#16833c]">
              <BadgePercent size={13} aria-hidden="true" /> Special price
            </span>
          )}
          <Link className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline" href={href}>
            View details <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      )}
    </article>
  );
}

export default function HomeProductShelf({ title, mode = "popular", sort = "popular" }) {
  const { country } = useMarket();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const dealMode = mode === "deals";
  const recentMode = mode === "recent";
  const shelfRef = useRef(null);
  const heading =
    recentMode && customerName
      ? `${customerName}, ${title.charAt(0).toLowerCase()}${title.slice(1)}`
      : title;

  useEffect(() => {
    if (!recentMode) return undefined;
    const controller = new AbortController();
    requestCurrentCustomer({ signal: controller.signal })
      .then(({ customer }) => {
        setCustomerName(customer?.name?.trim().split(/\s+/)[0] || "");
      })
      .catch(() => {});
    return () => controller.abort();
  }, [recentMode]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setLoading(true);
      setError("");
      if (mode === "recent") {
        try {
          const recent = JSON.parse(window.localStorage.getItem(RECENT_PRODUCTS_KEY) || "[]");
          if (Array.isArray(recent) && recent.length) {
            setProducts(recent.slice(0, 8).map(normaliseProduct));
            setLoading(false);
            return;
          }
        } catch {
          // Fall back to popular products when browser storage is unavailable.
        }
      }

      try {
        const params = new URLSearchParams({ country, page: "1", pageSize: "12", sort });
        const response = await fetch(`/api/parts?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || "Could not load marketplace products.");
        const next = (data?.products || []).map(normaliseProduct);
        if (dealMode) {
          next.sort(
            (a, b) =>
              getDiscountPercent(b) - getDiscountPercent(a) || Number(a.price) - Number(b.price),
          );
        }
        setProducts(next.slice(0, 8));
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadProducts();
    return () => controller.abort();
  }, [country, dealMode, mode, sort]);

  return (
    <section
      className={`border-b border-[#ececea] ${
        recentMode ? "bg-white py-4 sm:py-5" : "bg-white py-8 sm:py-10"
      }`}
      aria-label={heading}
    >
      <div
        className={`site-container ${
          recentMode
            ? "theme-keep rounded-2xl border border-[#f2ded3] bg-gradient-to-br from-[#fff1e9] via-[#faf5f1] to-[#f3edff] p-3 sm:p-4 md:p-5"
            : ""
        }`}
      >
        <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
          <div>
            {!recentMode && <span className="eyebrow">SMART SAVINGS</span>}
            <h2
              className={`${recentMode ? "" : "mt-1"} font-display text-xl font-extrabold tracking-tight text-[#171916] sm:text-2xl`}
            >
              {heading}
            </h2>
          </div>
          {!recentMode && (
            <Link
              className="hidden shrink-0 items-center gap-1 text-xs font-bold text-brand sm:inline-flex"
              href="/parts"
            >
              View all <ArrowRight size={15} aria-hidden="true" />
            </Link>
          )}
        </div>

        <div className="relative">
          <div
            ref={shelfRef}
            className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                country={country}
                dealMode={dealMode}
                recentMode={recentMode}
              />
            ))}
            {loading &&
              !products.length &&
              Array.from({ length: 4 }, (_, index) => (
                <div
                  className={`shrink-0 animate-pulse overflow-hidden border border-line-light ${
                    recentMode
                      ? "w-[196px] rounded-xl border-[3px] border-white sm:w-[208px]"
                      : "w-[190px] rounded-md sm:w-[212px]"
                  }`}
                  key={index}
                >
                  <div className="aspect-square bg-[#f1f2f2]" />
                  <div className="space-y-2 p-3">
                    <div className="h-3 w-1/3 rounded bg-[#eceeed]" />
                    <div className="h-4 rounded bg-[#eceeed]" />
                    <div className="h-4 w-1/2 rounded bg-[#eceeed]" />
                  </div>
                </div>
              ))}
            {!loading && !products.length && !error && (
              <p className="w-full rounded-md border border-line-light p-6 text-center text-sm text-muted">
                No active, in-stock products are available yet.
              </p>
            )}
            {error && (
              <p className="w-full py-6 text-center text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
          {recentMode && products.length > 4 && (
            <button
              className="absolute -right-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white text-[#242520] shadow-[0_2px_12px_rgba(23,25,22,.18)] transition hover:text-brand md:grid"
              type="button"
              aria-label="Scroll to more recently viewed products"
              onClick={() => shelfRef.current?.scrollBy({ left: 440, behavior: "smooth" })}
            >
              <ChevronRight size={25} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
