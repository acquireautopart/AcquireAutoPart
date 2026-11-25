"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, DollarSign, PackageCheck, Store } from "lucide-react";
import { useMarket } from "@/features/storefront/lib/market";

const promises = [
  {
    title: "Reliable fitment",
    description: "Choose your vehicle to narrow down compatible parts.",
    icon: BadgeCheck,
  },
  {
    title: "Plenty of choice",
    description: "Compare replacement options from well-known brands.",
    icon: Store,
  },
  {
    title: "Clear pricing",
    description: "See product pricing before you decide what to buy.",
    icon: DollarSign,
  },
  {
    title: "Order updates",
    description: "Keep delivery and order details easy to find.",
    icon: PackageCheck,
  },
];

export default function MarketplaceHighlights() {
  const { country } = useMarket();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadSummary() {
      try {
        const params = new URLSearchParams({ country, pageSize: "1" });
        const response = await fetch(`/api/parts?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Unable to load marketplace totals.");
        setSummary({
          products: data?.total || 0,
          categories: data?.categories?.length || 0,
          brands: data?.brands?.length || 0,
          fitments: data?.fitments?.length || 0,
        });
        setError("");
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message);
      }
    }

    loadSummary();
    return () => controller.abort();
  }, [country]);

  const stats = summary
    ? [
        [summary.products, "Available products"],
        [summary.categories, "Listed categories"],
        [summary.brands, "Listed brands"],
        [summary.fitments, "Seller-listed fitments"],
      ]
    : [];

  return (
    <section className="bg-white py-14 text-[#171916] sm:py-[70px]">
      <div className="site-container">
        <div className="grid grid-cols-2 gap-5 border-b border-line-light pb-9 sm:grid-cols-4 sm:gap-8">
          {stats.map(([value, label]) => (
            <div key={label}>
              <strong className="font-display text-2xl font-extrabold tracking-tight text-brand sm:text-3xl">
                {value}
              </strong>
              <span className="mt-1 block text-xs text-muted">{label}</span>
            </div>
          ))}
          {!summary && !error && (
            <p className="col-span-full text-sm text-muted" role="status">
              Loading live marketplace totals…
            </p>
          )}
          {error && (
            <p className="col-span-full text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[.8fr_1.4fr] lg:items-end lg:gap-14">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-[.18em] text-brand">
              A BETTER WAY TO FIND PARTS
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-[-.05em] sm:text-4xl">
              Your next repair,
              <br />
              <em className="font-semibold text-brand">made simpler.</em>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted">
              Find the part, check the details and shop with more confidence.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-7">
            {promises.map(({ title, description, icon: Icon }) => (
              <article className="border-t border-line-light pt-4" key={title}>
                <Icon className="text-brand" size={21} strokeWidth={1.7} aria-hidden="true" />
                <h3 className="mt-3 text-sm font-extrabold">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
