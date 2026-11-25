"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CarFront, ChevronRight } from "lucide-react";
import { formatPrice } from "@/features/storefront/lib/format";
import { getImageUrl } from "@/features/storefront/lib/imageUrl";
import { useMarket } from "@/features/storefront/lib/market";

function modelProduct(model, products) {
  const query = model.toLowerCase().trim();
  return products.find((product) => {
    const phrases = [
      product.fitment,
      ...(product.fitments || []).map((fitment) =>
        [fitment.make, fitment.model, fitment.trim, fitment.engine]
          .filter(Boolean)
          .join(" "),
      ),
    ].filter(Boolean);
    return phrases.some((phrase) => {
      const value = phrase.toLowerCase();
      return value.includes(query) || query.includes(value);
    });
  });
}

function ModelCard({ model, product, country }) {
  const href = `/parts?${new URLSearchParams({ q: model, country })}`;

  return (
    <Link
      className="theme-keep group w-[250px] shrink-0 snap-start sm:w-[278px]"
      href={href}
    >
      <article className="h-full overflow-hidden rounded-[22px] bg-white shadow-[0_5px_16px_rgba(120,65,15,.12)] transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_12px_26px_rgba(120,65,15,.18)]">
        <div className="relative aspect-square overflow-hidden rounded-[22px] bg-[#f1f1ef]">
          {product?.image ? (
            <Image
              alt={`${model} compatible auto parts`}
              className="object-cover transition duration-500 group-hover:scale-105"
              fill
              sizes="278px"
              src={getImageUrl(product.image)}
              unoptimized
            />
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-[#fff4e8] to-[#f6dfc7] text-brand">
              <CarFront size={82} strokeWidth={1.1} aria-hidden="true" />
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-brand px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
            Top Model
          </span>
        </div>
        <div className="flex min-h-[92px] flex-col px-3 pb-3 pt-2.5 sm:px-4">
          <h3 className="line-clamp-1 text-[17px] font-semibold leading-6 text-[#28251f] sm:text-xl">
            {model}
          </h3>
          <span className="mt-auto flex items-center justify-between gap-3 pt-1">
            <span className="text-base font-extrabold text-[#171916]">
              {product
                ? `Parts from ${formatPrice(product.price, product.currency || "USD")}`
                : "Browse compatible parts"}
            </span>
            <ArrowRight className="shrink-0 text-brand transition-transform group-hover:translate-x-1" size={20} aria-hidden="true" />
          </span>
        </div>
      </article>
    </Link>
  );
}

export default function PopularModels() {
  const { country } = useMarket();
  const [fitments, setFitments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const rowRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadModels() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ country, pageSize: "100", sort: "popular" });
        const response = await fetch(`/api/parts?${params}`, { signal: controller.signal });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Unable to load popular vehicle models.");
        setFitments(data.fitments || []);
        setProducts(
          (data.products || []).map((product) => ({
            ...product,
            image: product.images?.[0] || product.image || "",
          })),
        );
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadModels();
    return () => controller.abort();
  }, [country]);

  return (
    <section className="site-container py-8 sm:py-10" aria-label="Top vehicle models">
      <div className="theme-keep relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-[#ffb84d] via-[#ffc969] to-[#ffe0a5] p-3 shadow-sm sm:rounded-[22px] sm:p-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-4 z-0 select-none font-display text-[76px] font-black leading-none tracking-[-.09em] text-white/30 sm:right-5 sm:top-2 sm:text-[132px]"
        >
          MODELS
        </span>
        <div className="relative z-10 mb-3 flex items-center justify-between gap-3 px-1 sm:px-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#85400c]">
              Find parts that fit
            </span>
            <h2 className="font-display text-lg font-extrabold tracking-tight text-[#29231b] sm:text-xl">
              Top Models
            </h2>
          </div>
          <Link className="inline-flex items-center gap-1 text-xs font-bold text-[#6f350b] hover:underline" href="/parts">
            Browse all <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="relative z-10">
          <div
            ref={rowRef}
            className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-3"
          >
            {fitments.slice(0, 12).map((model) => (
              <ModelCard
                key={model}
                model={model}
                product={modelProduct(model, products)}
                country={country}
              />
            ))}
            {loading &&
              !fitments.length &&
              Array.from({ length: 3 }, (_, index) => (
                <div
                  className="theme-keep w-[250px] shrink-0 animate-pulse overflow-hidden rounded-[22px] bg-white p-2 sm:w-[278px]"
                  key={index}
                >
                  <div className="aspect-square rounded-[18px] bg-[#f1f1ef]" />
                  <div className="space-y-2 px-2 py-3">
                    <div className="h-4 w-2/3 rounded bg-[#eceeed]" />
                    <div className="h-4 w-1/2 rounded bg-[#eceeed]" />
                  </div>
                </div>
              ))}
            {!loading && !fitments.length && !error && (
              <p className="w-full rounded-xl bg-white/80 p-6 text-center text-sm text-[#554b3d]">
                No vehicle models are listed yet.
              </p>
            )}
            {error && <p className="w-full p-6 text-center text-sm text-red-800" role="alert">{error}</p>}
          </div>
          {fitments.length > 3 && (
            <button
              className="absolute -right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-[#242520] shadow-[0_3px_12px_rgba(67,45,22,.2)] transition hover:text-brand sm:-right-3"
              type="button"
              aria-label="Show more vehicle models"
              onClick={() => rowRef.current?.scrollBy({ left: 600, behavior: "smooth" })}
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
