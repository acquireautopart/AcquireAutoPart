"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Tag } from "lucide-react";
import { useMarket } from "@/features/storefront/lib/market";
import useProgressiveList from "@/features/storefront/hooks/useProgressiveList";

export default function BrandShowcase() {
  const { country } = useMarket();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { visibleItems, sentinelRef, hasMore } = useProgressiveList(brands, 12);

  useEffect(() => {
    const controller = new AbortController();
    async function loadBrands() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ country, pageSize: "1" });
        const response = await fetch(`/api/parts?${params}`, { signal: controller.signal });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Unable to load product brands.");
        setBrands(data?.brands || []);
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadBrands();
    return () => controller.abort();
  }, [country]);

  return (
    <section className="bg-white py-14 sm:py-[76px]">
      <div className="site-container">
        <div className="mb-6">
          <span className="eyebrow">MARKETPLACE BRANDS</span>
          <h2 className="section-title mt-2">Brands listed by sellers</h2>
          <p className="mt-2 text-sm text-muted">
            Browse brands currently available in the marketplace.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {visibleItems.map((brand) => (
            <Link
              className="group flex min-h-24 items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-card"
              href={`/parts?${new URLSearchParams({ brand, country })}`}
              key={brand}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Tag className="shrink-0 text-brand" size={17} aria-hidden="true" />
                <span className="truncate text-sm font-bold text-ink">{brand}</span>
              </span>
              <ArrowUpRight
                className="shrink-0 text-brand transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                size={15}
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
        {hasMore && <div className="mt-1 h-1" ref={sentinelRef} aria-hidden="true" />}
        {!brands.length && loading && (
          <p
            className="rounded-lg border border-line-light p-6 text-center text-sm text-muted"
            role="status"
          >
            Loading seller-listed brands…
          </p>
        )}
        {!brands.length && !loading && !error && (
          <p className="rounded-lg border border-line-light p-6 text-center text-sm text-muted">
            No product brands are listed in this marketplace yet.
          </p>
        )}
        {error && (
          <p className="text-center text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
