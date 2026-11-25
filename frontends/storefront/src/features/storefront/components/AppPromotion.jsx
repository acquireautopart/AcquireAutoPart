"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Battery,
  Check,
  ChevronRight,
  CircleDot,
  Disc3,
  Lightbulb,
  MapPin,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Truck,
} from "lucide-react";
import Image from "next/image";
import { formatPrice } from "@/features/storefront/lib/format";
import { useMarket } from "@/features/storefront/lib/market";
import { getImageUrl } from "@/features/storefront/lib/imageUrl";

const screens = [
  { title: "Browse parts", icon: ShoppingBag },
  { title: "Find your fit", icon: Search },
  { title: "Track delivery", icon: Truck },
];

const categoryStyles = [
  "bg-amber-50 text-amber-600",
  "bg-rose-50 text-rose-600",
  "bg-sky-50 text-sky-700",
  "bg-emerald-50 text-emerald-700",
];

const categoryIcons = [Lightbulb, Disc3, SlidersHorizontal, Battery];

function AppFeedPage({ catalog }) {
  const categories = (catalog?.categories || []).slice(0, 4);
  const products = (catalog?.products || []).slice(0, 2);
  const fitment = catalog?.fitments?.[0];

  return (
    <div className="app-feed-page space-y-4 px-4 pb-5 pt-3">
      <section className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[#777a73]">AcquireAuto marketplace</p>
          <h3 className="mt-0.5 text-base font-extrabold text-[#171916]">
            Find parts for your ride
          </h3>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff1e9] text-brand">
          <ShoppingBag size={17} aria-hidden="true" />
        </span>
      </section>

      <div className="flex items-center gap-2 rounded-xl border border-[#e6e7e2] bg-white px-3 py-3 text-[10px] text-[#8a8c85] shadow-sm">
        <Search size={15} className="text-brand" aria-hidden="true" />
        Search parts, brands or part number
        <SlidersHorizontal className="ml-auto text-[#55574f]" size={14} aria-hidden="true" />
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-[#f2d6c8] bg-[#fff8f4] px-3 py-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-brand shadow-sm">
          <MapPin size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[8px] font-bold uppercase tracking-wider text-[#92938d]">
            Seller-listed fitment
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-extrabold text-[#252620]">
            {fitment || "Choose a vehicle"}
          </span>
        </span>
        <ChevronRight size={15} className="text-[#777a73]" aria-hidden="true" />
      </div>

      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h4 className="text-[11px] font-extrabold text-[#171916]">Shop by category</h4>
          <span className="text-[9px] font-bold text-brand">See all</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {categories.map((name, index) => {
            const Icon = categoryIcons[index % categoryIcons.length];
            return (
              <div className="flex flex-col items-center gap-1.5" key={name}>
                <span
                  className={`grid h-11 w-11 place-items-center rounded-xl ${categoryStyles[index % categoryStyles.length]}`}
                >
                  <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="max-w-full truncate text-[8px] font-semibold text-[#53554f]">
                  {name}
                </span>
              </div>
            );
          })}
          {!categories.length && (
            <p className="col-span-4 text-center text-[9px] text-[#777a73]">
              Seller-listed categories will appear here.
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h4 className="text-[11px] font-extrabold text-[#171916]">Popular seller listings</h4>
          <ArrowRight size={14} className="text-brand" aria-hidden="true" />
        </div>
        <div className="flex gap-2.5">
          {products.map((product) => (
            <article
              className="min-w-0 flex-1 rounded-xl border border-[#ebede8] bg-white p-2.5 shadow-sm"
              key={product.id}
            >
              <span className="relative grid h-[58px] place-items-center overflow-hidden rounded-lg bg-[#f6f4ef]">
                {product.images?.[0] ? (
                  <Image
                    alt={product.name}
                    className="object-cover"
                    fill
                    sizes="120px"
                    src={getImageUrl(product.images[0], { width: 240, quality: 75 })}
                    unoptimized
                  />
                ) : (
                  <Disc3
                    className="text-[#b05a39]"
                    size={34}
                    strokeWidth={1.3}
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="mt-2 block truncate text-[9px] font-bold text-[#363832]">
                {product.name}
              </span>
              <span className="mt-1 block text-[10px] font-extrabold text-[#171916]">
                {formatPrice(product.price, product.currency || "USD")}
              </span>
            </article>
          ))}
          {!products.length && (
            <p className="w-full rounded-xl border border-[#ebede8] p-3 text-center text-[9px] text-[#777a73]">
              Seller-listed products will appear here.
            </p>
          )}
        </div>
      </section>

      <section className="flex items-center gap-2.5 rounded-xl bg-[#171916] p-3 text-white">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[#f08a66]">
          <ShoppingBag size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-bold">Browse available seller listings</span>
          <span className="mt-0.5 block text-[8px] text-white/60">
            {catalog?.total
              ? `${catalog.total} products in this market`
              : "Catalog updates from the marketplace"}
          </span>
        </span>
        <ArrowRight size={15} className="text-emerald-400" aria-hidden="true" />
      </section>
    </div>
  );
}

function PhonePreview({ catalog }) {
  return (
    <div className="app-phone-float relative mx-auto w-full max-w-[390px]">
      <div className="pointer-events-none absolute -left-12 top-20 h-48 w-48 rounded-full bg-[#ffd6c2]/70 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-16 h-44 w-44 rounded-full bg-[#e5d9cd]/70 blur-3xl" />

      <div
        className="app-phone-frame relative mx-auto w-[min(100%,310px)] rounded-[42px] border-[8px] border-[#20211e] bg-[#20211e] p-[5px] shadow-[0_35px_90px_rgba(23,25,22,.28)] sm:w-[320px]"
        role="img"
        aria-label="Illustrative mobile shopping preview; the app is not yet available"
      >
        <div className="overflow-hidden rounded-[32px] bg-[#fafaf8]">
          <div className="relative z-10 flex h-[30px] items-center justify-between bg-white px-5 text-[9px] font-extrabold text-[#242520]">
            <span>9:41</span>
            <span className="absolute left-1/2 top-0 h-[17px] w-[82px] -translate-x-1/2 rounded-b-[12px] bg-[#20211e]" />
            <span className="flex items-center gap-1" aria-hidden="true">
              <span className="text-[8px]">5G</span>
              <span className="h-2.5 w-4 rounded-[3px] border border-[#242520] p-[1px]">
                <span className="block h-full w-2/3 rounded-[1px] bg-[#242520]" />
              </span>
            </span>
          </div>

          <div className="flex h-12 items-center justify-between border-b border-[#eeefe9] bg-white px-4">
            <span className="font-display text-[13px] font-extrabold leading-none tracking-tight">
              <span className="text-brand">Acquireauto</span>
              <span className="text-[#171916]">Part</span>
              <sup className="ml-0.5 text-[6px] font-bold text-brand">TM</sup>
            </span>
            <span className="relative grid h-8 w-8 place-items-center rounded-full bg-[#f5f5f1] text-[#292a25]">
              <ShoppingBag size={15} aria-hidden="true" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand" />
            </span>
          </div>

          <div className="app-screen-window h-[440px] bg-[#fafaf8]">
            <div className="app-screen-feed">
              <AppFeedPage catalog={catalog} />
              <div aria-hidden="true" inert>
                <AppFeedPage catalog={catalog} />
              </div>
            </div>
          </div>

          <div className="grid h-12 grid-cols-4 items-center border-t border-[#eeefe9] bg-white px-2">
            {[
              ["Home", ShoppingBag, true],
              ["Parts", Search, false],
              ["Fitment", CircleDot, false],
              ["Orders", Truck, false],
            ].map(([label, Icon, active]) => (
              <span
                className={`flex flex-col items-center gap-0.5 text-[7px] font-semibold ${
                  active ? "text-brand" : "text-[#888a83]"
                }`}
                key={label}
              >
                <Icon size={14} strokeWidth={active ? 2.3 : 1.7} aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>
          <div className="mx-auto my-1 h-1 w-24 rounded-full bg-[#22231f]" />
        </div>
      </div>

      <div className="app-order-toast absolute -right-1 top-[34%] flex max-w-[188px] items-center gap-2.5 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-[0_12px_34px_rgba(23,25,22,.16)] sm:-right-8">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          <Check size={18} strokeWidth={2.5} aria-hidden="true" />
        </span>
        <span>
          <span className="block text-[9px] font-extrabold text-[#242520]">
            Seller-listed parts
          </span>
          <span className="mt-0.5 block text-[8px] text-[#777a73]">
            Browse current marketplace listings
          </span>
        </span>
      </div>

      <div className="app-fitment-toast absolute -left-1 bottom-[17%] flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-2 shadow-[0_10px_26px_rgba(23,25,22,.13)] sm:-left-7">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#fff1e9] text-brand">
          <Check size={14} strokeWidth={2.5} aria-hidden="true" />
        </span>
        <span className="text-[9px] font-extrabold text-[#363832]">
          {catalog?.fitments?.[0] ? `Fitment: ${catalog.fitments[0]}` : "Choose a vehicle"}
        </span>
      </div>
    </div>
  );
}

export default function AppPromotion() {
  const { country } = useMarket();
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadCatalog() {
      try {
        const params = new URLSearchParams({ country, pageSize: "4", sort: "popular" });
        const response = await fetch(`/api/parts?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Unable to load marketplace preview.");
        setCatalog(data);
        setError("");
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message);
      }
    }

    loadCatalog();
    return () => controller.abort();
  }, [country]);

  return (
    <section className="relative isolate overflow-hidden bg-[#f7f6f2] py-14 sm:py-[76px]">
      <div
        className="pointer-events-none absolute -left-32 top-0 -z-10 h-80 w-80 rounded-full bg-[#f1e8dc] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 -z-10 h-80 w-80 rounded-full bg-[#f7e2d7] blur-3xl"
        aria-hidden="true"
      />

      <div className="site-container grid items-center gap-12 lg:grid-cols-[.95fr_1.05fr] lg:gap-10 xl:gap-16">
        <div className="mx-auto max-w-xl lg:mx-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#eadfd5] bg-white/85 px-3 py-2 text-[9px] font-extrabold uppercase tracking-[.16em] text-brand shadow-sm sm:text-[10px]">
            <ShoppingBag size={14} aria-hidden="true" />
            Mobile shopping preview
          </span>
          <h2 className="mt-5 font-display text-4xl font-extrabold leading-[1.02] tracking-[-.065em] text-[#171916] sm:text-5xl lg:text-[54px]">
            Your garage,
            <br />
            right in your
            <br className="hidden sm:block" /> <em className="font-semibold text-brand">pocket.</em>
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[#686a63] sm:text-base">
            Browse real seller-listed products and vehicle fitments from the marketplace. The mobile
            app is not available yet; this preview reflects current catalog data.
          </p>

          <div className="mt-6 grid max-w-md gap-3 sm:grid-cols-3">
            {screens.map(({ title, icon: Icon }, index) => (
              <div
                className="flex items-center gap-2 rounded-xl border border-[#e9e6df] bg-white/80 px-3 py-3"
                key={title}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#fff0e7] text-brand">
                  <Icon size={15} aria-hidden="true" />
                </span>
                <span className="text-[10px] font-bold leading-tight text-[#454740]">{title}</span>
                <span className="ml-auto text-[9px] font-extrabold text-[#aaa9a2]">
                  0{index + 1}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              className="button rounded-lg bg-[#171916] text-white shadow-[0_8px_22px_rgba(23,25,22,.16)] transition hover:-translate-y-0.5 hover:bg-brand"
              href="#vehicle"
            >
              Find parts for your vehicle <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <span className="text-xs font-medium text-[#777a73]">Mobile app not available yet</span>
          </div>
          {error && (
            <p className="mt-3 text-xs text-red-600" role="status">
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center gap-2 text-[10px] font-semibold text-[#777a73]">
            <span className="flex -space-x-2">
              {["bg-[#f2d4bf]", "bg-[#d5e0d6]", "bg-[#d5dced]"].map((color) => (
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full border-2 border-[#f7f6f2] ${color}`}
                  key={color}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#52544d]" />
                </span>
              ))}
            </span>
            <span>Designed around your vehicle and your next repair</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[470px] pb-4 pt-2">
          <PhonePreview catalog={catalog} />
        </div>
      </div>
    </section>
  );
}
