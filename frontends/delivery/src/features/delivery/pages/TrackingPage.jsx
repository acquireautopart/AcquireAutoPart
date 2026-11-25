"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  PackageSearch,
  RefreshCw,
  Route,
  Truck,
} from "lucide-react";
import { trackShipment } from "@/features/delivery/lib/trackingApi";
import {
  formatTrackingDate,
  formatTrackingDay,
  formatTrackingTime,
} from "@/features/delivery/lib/trackingFormat";

const REFRESH_MS = 30 * 1000;
const COURIER_NAME = "Ekart Logistics";

/* "In Transit" is not its own timeline node: every hub scan is listed inside
   "Shipped", like the Flipkart app does. */
const TIMELINE_NODES = ["Order Confirmed", "Shipped", "Out For Delivery", "Delivered"];

function eventsFor(groupedStatus, group) {
  return (
    (groupedStatus || []).find((entry) => entry.group === group)?.events || []
  );
}

/** "Arrived at Lucknow Mother Hub - Sat, 7th Nov 26 - 7:40am" */
function scanLine(event) {
  const hub = event.hubName;
  const message = event.message || event.eventCode;
  const labelled =
    hub && !message.includes(hub) ? `${message} - ${hub}` : message;
  return `${labelled} - ${formatTrackingDate(event.scannedAt)}`;
}

function statusTone(status) {
  if (status === "DELIVERED") return "bg-emerald-50 text-emerald-700";
  if (status === "RTO_INITIATED") return "bg-rose-50 text-rose-700";
  if (status === "OUT_FOR_DELIVERY" || status === "DELIVERY_ATTEMPTED") {
    return "bg-orange-50 text-orange-700";
  }
  return "bg-slate-100 text-slate-600";
}

function dotTone(status) {
  if (status === "current") {
    return "border-orange-600 bg-orange-600 ring-4 ring-orange-100";
  }
  if (status === "visited") return "border-emerald-500 bg-emerald-500";
  return "border-slate-300 bg-white";
}

function labelTone(status) {
  if (status === "current") return "font-bold text-orange-700";
  if (status === "visited") return "font-semibold text-emerald-700";
  return "text-slate-400";
}

function RouteProgress({ progress }) {
  if (!progress?.length) return null;
  const reached = progress.filter((hub) => hub.status !== "upcoming").length;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">
          <Route size={13} /> Route progress
        </h2>
        <span className="text-[10px] font-semibold text-slate-400">
          {reached} of {progress.length} hubs
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-start">
          {progress.map((hub, index) => (
            <div key={hub.code} className="flex items-start">
              <div className="flex w-14 shrink-0 flex-col items-center gap-1.5">
                <span
                  className={`h-3.5 w-3.5 rounded-full border-2 ${dotTone(hub.status)}`}
                  title={`${hub.name} (${hub.status})`}
                />
                <span
                  className={`text-center text-[9px] leading-tight ${labelTone(hub.status)}`}
                >
                  {hub.city}
                </span>
              </div>
              {index < progress.length - 1 && (
                <span
                  className={`mt-[6px] h-1 w-6 shrink-0 rounded-full sm:w-10 ${
                    progress[index + 1].status === "upcoming"
                      ? "bg-slate-200"
                      : "bg-emerald-500"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-[10px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Visited
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-600" /> Current hub
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-slate-300 bg-white" />
          Upcoming
        </span>
      </div>
    </section>
  );
}

function EventList({ events }) {
  if (!events?.length) return null;
  return (
    <ul className="space-y-1.5">
      {events.map((event, index) => (
        <li
          key={`${event.eventCode}-${index}`}
          className="text-xs leading-5 text-slate-600"
        >
          {scanLine(event)}
        </li>
      ))}
    </ul>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-2">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="text-right text-[11px] font-semibold text-slate-800">
        {value}
      </dd>
    </div>
  );
}

function TimelineNode({ title, events, children, isLast, done }) {
  const firstAt = events[0]?.scannedAt;

  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      {!isLast && (
        <span className="absolute left-[6px] top-4 h-full w-px bg-slate-200" />
      )}
      <span
        className={`relative mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full ${
          done
            ? "bg-emerald-500 ring-4 ring-emerald-50"
            : "border-2 border-slate-300 bg-white"
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <h3
            className={`text-sm font-bold ${done ? "text-slate-900" : "text-slate-400"}`}
          >
            {title}
          </h3>
          <span className="text-[11px] font-medium text-slate-500">
            {firstAt ? formatTrackingDay(firstAt) : "Pending"}
          </span>
        </div>
        {children ?? (
          <div className="mt-1.5">
            <EventList events={events} />
          </div>
        )}
      </div>
    </li>
  );
}

function ShippedDetail({ summary, inTransit, estimatedDeliveryDate }) {
  return (
    <div className="mt-2.5 space-y-3">
      <dl className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
        <DetailRow label="AWB number" value={summary?.awb || "—"} />
        <DetailRow label="Courier" value={COURIER_NAME} />
        <DetailRow
          label="Estimated delivery"
          value={
            estimatedDeliveryDate
              ? formatTrackingDate(estimatedDeliveryDate)
              : "Calculating…"
          }
        />
      </dl>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">
          In Transit
        </p>
        {inTransit.length === 0 ? (
          <p className="px-3 py-3 text-xs text-slate-400">
            No hub scans recorded yet.
          </p>
        ) : (
          <ol className="divide-y divide-slate-100">
            {inTransit.map((event, index) => (
              <li key={`${event.eventCode}-${index}`} className="px-3 py-2.5">
                <p className="text-xs font-medium leading-5 text-slate-800">
                  {scanLine(event)}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                  {event.hubCity ? `${event.hubCity} · ` : ""}
                  {event.eventCode}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function LoadingState({ awb }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f5f6] px-6 text-[#17212b]">
      <div className="text-center">
        <RefreshCw className="mx-auto animate-spin text-orange-600" size={22} />
        <p className="mt-3 text-sm font-bold">Fetching tracking details…</p>
        <p className="mt-1 text-xs text-slate-500">{awb}</p>
      </div>
    </main>
  );
}

function ErrorState({ awb, error, onRetry }) {
  const notFound = error?.status === 404;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f5f6] px-6 text-[#17212b]">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center">
        <PackageSearch className="mx-auto text-slate-400" size={28} />
        <h1 className="mt-3 text-base font-extrabold">
          {notFound ? "Shipment not found" : "We could not load this shipment"}
        </h1>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {notFound ? (
            <>
              No shipment matches the AWB{" "}
              <span className="font-semibold text-slate-700">{awb}</span>. Check
              the number and try again.
            </>
          ) : (
            error?.message || "Something went wrong. Please try again."
          )}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          {!notFound && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-9 items-center rounded-md bg-orange-600 px-4 text-xs font-bold text-white transition hover:bg-orange-700"
            >
              Try again
            </button>
          )}
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-md border border-slate-300 px-4 text-xs font-bold transition hover:bg-slate-50"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function TrackingPage({ awb }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const load = async () => {
      try {
        const result = await trackShipment(awb);
        if (!active) return;
        setData(result);
        setError(null);
        setUpdatedAt(new Date());
      } catch (fetchError) {
        if (!active) return;
        setError(fetchError);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [awb, reloadToken]);

  if (loading && !data) return <LoadingState awb={awb} />;
  if (!data) {
    return (
      <ErrorState
        awb={awb}
        error={error}
        onRetry={() => setReloadToken((token) => token + 1)}
      />
    );
  }

  const summary = data.summary || {};
  const inTransit = eventsFor(data.groupedStatus, "In Transit");

  const nodeEvents = Object.fromEntries(
    TIMELINE_NODES.map((node) => [node, eventsFor(data.groupedStatus, node)]),
  );

  return (
    <main className="min-h-screen bg-[#f4f5f6] text-[#17212b]">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            aria-label="Back to home"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">
              Track your parcel
            </p>
            <p className="truncate text-[11px] text-slate-500">
              {summary.awb || awb} · {COURIER_NAME}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone(summary.currentStatus)}`}
          >
            {(summary.currentStatus || "UNKNOWN").replace(/_/g, " ")}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Truck size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">
                Delivering to{" "}
                <span className="font-semibold text-slate-700">
                  {summary.destinationCity || "your city"}
                </span>
                {summary.orderId ? ` · Order ${summary.orderId}` : ""}
              </p>
              <p className="mt-1 text-sm font-bold">
                {summary.currentStatus === "DELIVERED"
                  ? "Delivered"
                  : data.estimatedDeliveryDate
                    ? `Arriving by ${formatTrackingDate(data.estimatedDeliveryDate)}`
                    : "Preparing your delivery"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {summary.paymentType === "COD"
                  ? "Cash on delivery"
                  : "Prepaid"}
              </p>
            </div>
          </div>
        </section>

        <RouteProgress progress={data.progress} />

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">
            Shipment journey
          </h2>
          <ol>
            {TIMELINE_NODES.map((node, index) => {
              const events = nodeEvents[node];
              const isLast = index === TIMELINE_NODES.length - 1;

              if (node === "Shipped") {
                return (
                  <TimelineNode
                    key={node}
                    title={node}
                    events={events}
                    isLast={isLast}
                    done={events.length > 0}
                  >
                    <div className="mt-1.5">
                      <EventList events={events} />
                      <ShippedDetail
                        summary={summary}
                        inTransit={inTransit}
                        estimatedDeliveryDate={data.estimatedDeliveryDate}
                      />
                    </div>
                  </TimelineNode>
                );
              }

              return (
                <TimelineNode
                  key={node}
                  title={node}
                  events={events}
                  isLast={isLast}
                  done={events.length > 0}
                />
              );
            })}
          </ol>
        </section>

        <p className="pb-6 text-center text-[10px] text-slate-400">
          Refreshes every 30 seconds
          {updatedAt ? ` · last updated ${formatTrackingTime(updatedAt)}` : ""}
        </p>
      </div>
    </main>
  );
}
