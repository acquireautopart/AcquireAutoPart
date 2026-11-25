"use client";

import { useEffect, useState } from "react";
import { deliveryApi } from "@/features/delivery/lib/deliveryApi";

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "15days", label: "Last 15 days" },
  { key: "month", label: "This month" },
];

function getRange(period, now) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "week") {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  } else if (period === "15days") {
    start.setDate(start.getDate() - 14);
  } else if (period === "month") {
    start.setDate(1);
  }
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatCurrency(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
  }
}

function formatAmounts(currencies, field = "amount") {
  if (!currencies?.length) return "—";
  return currencies
    .map(({ currency, [field]: amount }) =>
      formatCurrency(Number(amount) || 0, currency),
    )
    .join(" · ");
}

function SummaryCard({ label, value, accent = false }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-extrabold ${accent ? "text-orange-700" : ""}`}>
        {value}
      </p>
    </article>
  );
}

export default function EarningsPanel({ staffRole }) {
  const [period, setPeriod] = useState("today");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isHubStaff = staffRole === "hub_staff";

  useEffect(() => {
    let active = true;
    const range = getRange(period, new Date());
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setLoading(true);
    setReport(null);
    setError("");
    deliveryApi
      .earnings(range.from, range.to, timeZone)
      .then((data) => {
        if (active) setReport(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold">Earnings overview</h3>
          <p className="mt-1 text-xs text-slate-500">
            Only customer-OTP-verified deliveries count toward payouts.
          </p>
        </div>
        <label className="text-xs font-bold">
          Period
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="ml-2 h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700"
          >
            {PERIODS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
          Could not load earnings: {error}
        </p>
      )}
      {report?.summary?.unconfiguredCount > 0 && (
        <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          {report.summary.unconfiguredCount} completed{" "}
          {report.summary.unconfiguredCount === 1 ? "delivery has" : "deliveries have"} no matching
          payout rule. Ask an administrator to configure a country, city, and weight range.
        </p>
      )}
      {report?.summary?.estimatedCount > 0 && (
        <p role="status" className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
          {report.summary.estimatedCount} legacy{" "}
          {report.summary.estimatedCount === 1 ? "delivery is" : "deliveries are"} estimated using
          current rates because no payout snapshot exists for that delivery.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label={isHubStaff ? "Hub net earnings" : "Delivery earnings"}
          value={loading ? "Loading…" : formatAmounts(report?.summary?.currencies)}
          accent
        />
        <SummaryCard
          label="Completed deliveries"
          value={loading ? "…" : report?.summary?.completedDeliveries ?? 0}
        />
        {isHubStaff && (
          <>
            <SummaryCard
              label="Hub gross payout"
              value={
                loading
                  ? "Loading…"
                  : formatAmounts(report?.summary?.currencies, "grossAmount")
              }
            />
            <SummaryCard
              label="Delivery partner share"
              value={
                loading
                  ? "Loading…"
                  : formatAmounts(report?.summary?.currencies, "riderShareAmount")
              }
            />
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-extrabold">Daily delivery earnings</h3>
        </div>
        {loading ? (
          <p className="p-5 text-xs text-slate-500">Loading daily totals…</p>
        ) : report?.days?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Deliveries</th>
                  {isHubStaff && <th className="px-4 py-3">Gross</th>}
                  {isHubStaff && <th className="px-4 py-3">Rider share</th>}
                  <th className="px-4 py-3">{isHubStaff ? "Hub net" : "Earnings"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.days.map((day) => (
                  <tr key={day.date}>
                    <td className="px-4 py-3 font-semibold">
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">{day.completedDeliveries}</td>
                    {isHubStaff && (
                      <td className="px-4 py-3">
                        {formatAmounts(day.currencies, "grossAmount")}
                      </td>
                    )}
                    {isHubStaff && (
                      <td className="px-4 py-3">
                        {formatAmounts(day.currencies, "riderShareAmount")}
                      </td>
                    )}
                    <td className="px-4 py-3 font-bold text-orange-700">
                      {formatAmounts(day.currencies)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-xs text-slate-500">
            No completed deliveries in this period.
          </p>
        )}
      </div>
    </section>
  );
}
