"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PackageSearch,
  RefreshCw,
  Route,
  Warehouse,
} from "lucide-react";
import { formatTrackingDate } from "@/features/delivery/lib/trackingFormat";
import {
  getHubLoad,
  hasStaffKey,
  listShipments,
  listStuckShipments,
} from "@/features/delivery/lib/adminApi";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  "ORDER_PLACED",
  "SELLER_PROCESSED",
  "PICKED_UP",
  "SHIPPED",
  "ARRIVED_AT_HUB",
  "REACHED_DELIVERY_HUB",
  "DISPATCHED_FROM_HUB",
  "OUT_FOR_DELIVERY",
  "DELIVERY_ATTEMPTED",
  "DELIVERED",
  "RTO_INITIATED",
];

function statusLabel(status) {
  return (status || "UNKNOWN").replace(/_/g, " ");
}

function statusTone(status) {
  if (status === "DELIVERED") return "bg-emerald-50 text-emerald-700";
  if (status === "RTO_INITIATED") return "bg-rose-50 text-rose-700";
  if (status === "OUT_FOR_DELIVERY" || status === "DELIVERY_ATTEMPTED") {
    return "bg-orange-50 text-orange-700";
  }
  return "bg-slate-100 text-slate-600";
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusTone(status)}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function SectionCard({ title, icon: Icon, meta, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">
          <Icon size={13} /> {title}
        </h2>
        {meta && <span className="text-[10px] font-semibold text-slate-400">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

function HubLoad({ hubs }) {
  if (!hubs.length) {
    return <p className="px-4 py-4 text-xs text-slate-400">No parcels are inside a hub right now.</p>;
  }
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {hubs.map((hub) => (
        <div key={hub.hubId} className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{hub.name}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                {hub.code} · {hub.city}
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-bold text-white">
              {hub.parcels}
            </span>
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">
            {hub.hubType}
          </p>
        </div>
      ))}
    </div>
  );
}

function StuckList({ shipments, onOpen }) {
  if (!shipments.length) {
    return (
      <p className="px-4 py-4 text-xs text-slate-400">
        No parcels are stuck — every in-transit shipment had a scan in the last 24 hours.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-slate-100">
      {shipments.map((shipment) => (
        <li key={shipment.awb}>
          <button
            type="button"
            onClick={() => onOpen(shipment.awb)}
            className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left transition hover:bg-slate-50"
          >
            <span className="text-xs font-bold">{shipment.awb}</span>
            <span className="text-[11px] text-slate-500">
              {shipment.destinationCity}
            </span>
            <span className="text-[11px] text-slate-500">
              {shipment.currentHub?.name || "—"}
            </span>
            <span className="ml-auto inline-flex items-center gap-2">
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                {shipment.hoursIdle} h idle
              </span>
              <StatusBadge status={shipment.status} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ShipmentsTable({ shipments, onOpen }) {
  if (!shipments.length) {
    return (
      <p className="px-4 py-6 text-center text-xs text-slate-400">
        No shipments match these filters.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <th className="px-4 py-2.5">AWB</th>
            <th className="px-4 py-2.5">Order</th>
            <th className="px-4 py-2.5">Destination</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Current hub</th>
            <th className="px-4 py-2.5">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {shipments.map((shipment) => (
            <tr
              key={shipment.awb}
              role="link"
              tabIndex={0}
              title="Open the full tracking timeline"
              onClick={() => onOpen(shipment.awb)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpen(shipment.awb);
                }
              }}
              className="cursor-pointer transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
            >
              <td className="px-4 py-3 text-xs font-bold">{shipment.awb}</td>
              <td className="px-4 py-3 text-[11px] text-slate-600">
                {shipment.orderId}
              </td>
              <td className="px-4 py-3 text-[11px] text-slate-600">
                {shipment.destinationCity}
                <span className="block text-[10px] text-slate-400">
                  {shipment.destinationPincode}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={shipment.status} />
              </td>
              <td className="px-4 py-3 text-[11px] text-slate-600">
                {shipment.currentHub ? (
                  <>
                    {shipment.currentHub.name}
                    <span className="block text-[10px] text-slate-400">
                      {shipment.currentHub.code}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400">Not scanned yet</span>
                )}
              </td>
              <td className="px-4 py-3 text-[11px] text-slate-500">
                {formatTrackingDate(shipment.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();

  const [filters, setFilters] = useState({ status: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [table, setTable] = useState({ shipments: [], pagination: null });
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState(null);

  const [stuck, setStuck] = useState([]);
  const [hubLoad, setHubLoad] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);

  const openTimeline = useCallback(
    (awb) => router.push(`/track/${encodeURIComponent(awb)}`),
    [router],
  );

  /* Shipment table: refetched whenever the page or a filter changes. */
  useEffect(() => {
    let active = true;
    setTableLoading(true);

    listShipments({ page, limit: PAGE_SIZE, ...filters })
      .then((result) => {
        if (!active) return;
        setTable(result);
        setTableError(null);
        setUpdatedAt(new Date());
      })
      .catch((error) => {
        if (active) setTableError(error);
      })
      .finally(() => {
        if (active) setTableLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, filters, reloadToken]);

  /* Stuck parcels + hub load: the two aggregations on the page. */
  useEffect(() => {
    let active = true;
    setOverviewLoading(true);

    Promise.all([listStuckShipments(), getHubLoad()])
      .then(([stuckResult, loadResult]) => {
        if (!active) return;
        setStuck(stuckResult.shipments || []);
        setHubLoad(loadResult.hubs || []);
        setOverviewError(null);
      })
      .catch((error) => {
        if (active) setOverviewError(error);
      })
      .finally(() => {
        if (active) setOverviewLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const pagination = table.pagination;
  const totalParcels = hubLoad.reduce((sum, hub) => sum + hub.parcels, 0);

  return (
    <main className="min-h-screen bg-[#f4f5f6] text-[#17212b]">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            aria-label="Back to home"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">Operations dashboard</p>
            <p className="truncate text-[11px] text-slate-500">
              Shipments, hub load and stuck parcels
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-[11px] font-bold transition hover:bg-slate-50"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
        {!hasStaffKey() && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[11px] leading-5 text-amber-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <p>
              <span className="font-bold">NEXT_PUBLIC_STAFF_API_KEY</span> is not
              set. Every operations request will be rejected with a 401 — add the
              key to <span className="font-semibold">.env.local</span> and restart
              the dev server.
            </p>
          </div>
        )}

        {overviewError && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-[11px] text-rose-700">
            {overviewError.message}
          </p>
        )}

        <SectionCard
          title="Parcels inside each hub"
          icon={Warehouse}
          meta={
            overviewLoading
              ? "Loading…"
              : `${totalParcels} in transit · ${hubLoad.length} hubs`
          }
        >
          {overviewLoading ? (
            <p className="inline-flex items-center gap-2 px-4 py-4 text-xs text-slate-400">
              <Loader2 size={13} className="animate-spin" /> Counting parcels…
            </p>
          ) : (
            <HubLoad hubs={hubLoad} />
          )}
        </SectionCard>

        <SectionCard
          title="Stuck shipments"
          icon={AlertTriangle}
          meta={
            overviewLoading ? "Loading…" : `${stuck.length} with no scan for 24 h+`
          }
        >
          {overviewLoading ? (
            <p className="inline-flex items-center gap-2 px-4 py-4 text-xs text-slate-400">
              <Loader2 size={13} className="animate-spin" /> Checking scan history…
            </p>
          ) : (
            <StuckList shipments={stuck} onOpen={openTimeline} />
          )}
        </SectionCard>

        <SectionCard
          title="All shipments"
          icon={Route}
          meta={
            pagination
              ? `${pagination.total} shipments`
              : undefined
          }
        >
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-4 py-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Status
              </span>
              <select
                value={filters.status}
                onChange={(event) => updateFilter("status", event.target.value)}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                From
              </span>
              <input
                type="date"
                value={filters.from}
                onChange={(event) => updateFilter("from", event.target.value)}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                To
              </span>
              <input
                type="date"
                value={filters.to}
                onChange={(event) => updateFilter("to", event.target.value)}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
              />
            </label>
            {(filters.status || filters.from || filters.to) && (
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setFilters({ status: "", from: "", to: "" });
                }}
                className="h-9 rounded-md px-3 text-[11px] font-bold text-orange-700 transition hover:bg-orange-50"
              >
                Clear filters
              </button>
            )}
          </div>

          {tableError ? (
            <div className="flex items-start gap-2.5 px-4 py-4 text-xs text-rose-700">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>{tableError.message}</span>
            </div>
          ) : tableLoading && !table.shipments.length ? (
            <p className="inline-flex items-center gap-2 px-4 py-6 text-xs text-slate-400">
              <Loader2 size={13} className="animate-spin" /> Loading shipments…
            </p>
          ) : (
            <div className={tableLoading ? "opacity-60 transition" : "transition"}>
              <ShipmentsTable
                shipments={table.shipments}
                onOpen={openTimeline}
              />
            </div>
          )}

          {pagination && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <p className="text-[10px] text-slate-400">
                Page {pagination.page} of {pagination.totalPages}
                {updatedAt
                  ? ` · updated ${formatTrackingDate(updatedAt)}`
                  : ""}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || tableLoading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2.5 text-[11px] font-bold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <button
                  type="button"
                  disabled={
                    pagination.page >= pagination.totalPages || tableLoading
                  }
                  onClick={() => setPage((current) => current + 1)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2.5 text-[11px] font-bold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </SectionCard>

        <p className="flex items-center justify-center gap-1.5 pb-6 text-[10px] text-slate-400">
          <PackageSearch size={12} /> Click any row to open its full tracking
          timeline.
        </p>
      </div>
    </main>
  );
}
