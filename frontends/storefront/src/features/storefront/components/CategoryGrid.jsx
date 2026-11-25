"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Boxes } from "lucide-react";
import { useMarket } from "@/features/storefront/lib/market";
import useProgressiveList from "@/features/storefront/hooks/useProgressiveList";

export default function CategoryGrid() {
  const { country } = useMarket();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { visibleItems, sentinelRef, hasMore } = useProgressiveList(categories, 8);

  useEffect(() => {
    const controller = new AbortController();
    async function loadCategories() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ country, pageSize: "100", sort: "popular" });
        const response = await fetch(`/api/parts?${params}`, { signal: controller.signal });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Unable to load product categories.");
        setCategories(
          (data?.categories || []).map((name) => ({
            name,
            image: data?.products?.find((product) => product.category === name)?.image || "",
          })),
        );
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadCategories();
    return () => controller.abort();
  }, [country]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" id="categories">
      {visibleItems.map(({ name, image }) => (
        <Link
          className="group overflow-hidden border border-line-light bg-white transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card"
          href={`/parts?${new URLSearchParams({ category: name, country })}`}
          key={name}
        >
          <div className="relative grid aspect-[1.28] place-items-center overflow-hidden bg-[#171916]">
            {image ? (
              <Image
                alt={`${name} auto parts`}
                className="object-cover transition duration-500 group-hover:scale-105"
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                src={image}
                unoptimized
              />
            ) : (
              <Boxes className="text-white/60" size={40} aria-hidden="true" />
            )}
            {image && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/20" />
            )}
            <span className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-white/80 transition group-hover:bg-brand group-hover:text-white">
              <ArrowUpRight size={16} />
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 p-3 sm:p-4">
            <h3 className="text-sm font-extrabold sm:text-base">{name}</h3>
            <span className="text-brand">↗</span>
          </div>
        </Link>
      ))}
      {hasMore && <div className="col-span-full h-1" ref={sentinelRef} aria-hidden="true" />}
      {!categories.length && loading && (
        <p
          className="col-span-full rounded-lg border border-line-light bg-white p-6 text-center text-sm text-muted"
          role="status"
        >
          Loading seller-listed categories…
        </p>
      )}
      {!categories.length && !loading && !error && (
        <p className="col-span-full rounded-lg border border-line-light bg-white p-6 text-center text-sm text-muted">
          No product categories are listed in this marketplace yet.
        </p>
      )}
      {error && (
        <p className="col-span-full text-center text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
