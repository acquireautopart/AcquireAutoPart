"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ordersApi } from "@/features/storefront/lib/shopApi";
import ProfileSubpageFrame from "@/features/profile/components/ProfileSubpageFrame";

export default function OrderFilterPage() {
  const router = useRouter();
  const [years, setYears] = useState([]);
  const [type, setType] = useState("orders");
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    let active = true;
    ordersApi
      .list()
      .then(({ years: list }) => {
        if (active) setYears([...(list || [])].sort((a, b) => b - a));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  function apply() {
    router.push(`/profile/orders?type=${type}&period=${period}`);
  }

  return (
    <ProfileSubpageFrame title="Filter orders" activeId="orders">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-[var(--pf-border)] bg-[var(--pf-card)]">
        <div className="flex items-center justify-between border-b border-[var(--pf-border)] px-4 py-4 sm:px-6">
          <Link
            href="/profile/orders"
            className="inline-flex items-center gap-2 text-sm font-semibold"
          >
            <ArrowLeft size={18} /> Back
          </Link>
          <h1 className="text-lg font-extrabold sm:text-xl">Filter orders</h1>
          <button
            onClick={apply}
            className="rounded-lg bg-[var(--pf-brand)] px-4 py-2 text-sm font-bold text-white hover:brightness-110"
          >
            Apply
          </button>
        </div>
        <fieldset>
          <legend className="w-full border-b border-[var(--pf-border)] bg-[var(--pf-card-2)] px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-[var(--pf-brand)]">
            Filter by order type
          </legend>
          {[
            ["orders", "Orders"],
            ["not-shipped", "Not Yet Shipped"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-[62px] cursor-pointer items-center gap-3 border-b border-[var(--pf-border)] px-5 text-base"
            >
              <input
                type="radio"
                name="type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
                className="h-5 w-5 accent-[var(--pf-brand)]"
              />
              {label}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend className="w-full border-b border-[var(--pf-border)] bg-[var(--pf-card-2)] px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-[var(--pf-brand)]">
            Filter by order date
          </legend>
          {[
            ["30", "Last 30 days"],
            ["90", "Last 3 months"],
            ["all", "All dates"],
            ...years.map((year) => [String(year), String(year)]),
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-[62px] cursor-pointer items-center gap-3 border-b border-[var(--pf-border)] px-5 text-base last:border-0"
            >
              <input
                type="radio"
                name="period"
                value={value}
                checked={period === value}
                onChange={() => setPeriod(value)}
                className="h-5 w-5 accent-[var(--pf-brand)]"
              />
              {label}
            </label>
          ))}
        </fieldset>
      </div>
    </ProfileSubpageFrame>
  );
}
