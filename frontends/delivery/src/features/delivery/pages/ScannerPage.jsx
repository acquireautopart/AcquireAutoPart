"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ScanLine,
  XCircle,
} from "lucide-react";
import {
  getHubs,
  hasStaffKey,
  recordScan,
} from "@/features/delivery/lib/trackingApi";
import { formatTrackingTime } from "@/features/delivery/lib/trackingFormat";

const MAX_LOG = 20;
const SCAN_TYPES = ["INBOUND", "OUTBOUND"];

export default function ScannerPage() {
  const [hubs, setHubs] = useState([]);
  const [hubCode, setHubCode] = useState("");
  const [loadingHubs, setLoadingHubs] = useState(true);
  const [hubsError, setHubsError] = useState(null);
  const [scanType, setScanType] = useState("INBOUND");
  const [awb, setAwb] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [log, setLog] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await getHubs();
        if (!active) return;
        const list = data?.hubs || [];
        setHubs(list);
        setHubCode(list[0]?.code || "");
        setHubsError(null);
      } catch (error) {
        if (!active) return;
        setHubsError(error);
      } finally {
        if (active) setLoadingHubs(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const addToLog = useCallback((entry) => {
    setLog((current) => [entry, ...current].slice(0, MAX_LOG));
  }, []);

  const hub = hubs.find((item) => item.code === hubCode) || null;

  async function handleSubmit(event) {
    event.preventDefault();
    const value = awb.trim().toUpperCase();
    if (!value || !hubCode || busy) return;

    setBusy(true);
    const at = new Date();

    try {
      const result = await recordScan({
        awb: value,
        hubCode,
        scanType,
        scannedBy: "hub-scanner",
      });
      const message = result?.event?.message || `${scanType} scan recorded.`;
      setFeedback({ type: "success", text: `${value} · ${message}` });
      addToLog({ awb: value, hubCode, scanType, ok: true, message, at });
      setAwb("");
    } catch (error) {
      setFeedback({ type: "error", text: `${value} · ${error.message}` });
      addToLog({
        awb: value,
        hubCode,
        scanType,
        ok: false,
        message: error.message,
        at,
      });
    } finally {
      setBusy(false);
      /* Keep the caret in the box so the next parcel can be scanned right away. */
      inputRef.current?.focus();
    }
  }

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
            <p className="truncate text-sm font-extrabold">Hub scanner</p>
            <p className="truncate text-[11px] text-slate-500">
              {hub ? `${hub.name} · ${hub.city}` : "Select a hub to start"}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
            <ScanLine size={12} /> Staff
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        {!hasStaffKey() && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              <span className="font-bold">
                NEXT_PUBLIC_STAFF_API_KEY is not set.
              </span>{" "}
              Add it to frontends/delivery/.env.local (same value as
              STAFF_API_KEY in server/.env) or every scan will be rejected.
            </span>
          </p>
        )}

        {hubsError && (
          <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] leading-5 text-rose-700">
            <XCircle size={14} className="mt-0.5 shrink-0" />
            <span>Could not load hubs: {hubsError.message}</span>
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div>
            <label
              htmlFor="hub"
              className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.12em] text-slate-500"
            >
              Current hub
            </label>
            <select
              id="hub"
              value={hubCode}
              disabled={loadingHubs || hubs.length === 0}
              onChange={(event) => setHubCode(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-400"
            >
              {loadingHubs && <option value="">Loading hubs…</option>}
              {!loadingHubs && hubs.length === 0 && (
                <option value="">No hubs available</option>
              )}
              {hubs.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} · {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">
              Scan type
            </span>
            <div className="grid grid-cols-2 gap-2">
              {SCAN_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setScanType(type)}
                  aria-pressed={scanType === type}
                  className={`h-10 rounded-lg text-xs font-bold transition ${
                    scanType === type
                      ? "bg-orange-600 text-white"
                      : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="awb"
              className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.12em] text-slate-500"
            >
              AWB number
            </label>
            <input
              id="awb"
              ref={inputRef}
              autoFocus
              value={awb}
              onChange={(event) => setAwb(event.target.value)}
              placeholder="FMPP1234567890"
              autoComplete="off"
              spellCheck={false}
              className="h-12 w-full rounded-lg border border-slate-300 px-3 font-mono text-base tracking-wide outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
            <p className="mt-1.5 text-[10px] text-slate-400">
              Scan the parcel barcode or type the AWB, then press Enter. The box
              stays ready for the next parcel.
            </p>
          </div>

          <button
            type="submit"
            disabled={busy || !awb.trim() || !hubCode}
            className="h-11 w-full rounded-lg bg-orange-600 text-xs font-bold text-white transition hover:bg-orange-700 disabled:bg-slate-300"
          >
            {busy ? "Saving scan…" : `Record ${scanType} scan`}
          </button>
        </form>

        {feedback && (
          <p
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[11px] font-medium leading-5 ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={14} className="mt-0.5 shrink-0" />
            )}
            <span className="min-w-0 break-words">{feedback.text}</span>
          </p>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <h2 className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">
              Last {MAX_LOG} scans
            </h2>
            {log.length > 0 && (
              <button
                type="button"
                onClick={() => setLog([])}
                className="text-[10px] font-bold text-slate-400 transition hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {log.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-slate-400">
              No scans in this session yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {log.map((entry, index) => (
                <li
                  key={`${entry.at.getTime()}-${index}`}
                  className="flex items-start gap-3 px-4 py-2.5"
                >
                  {entry.ok ? (
                    <CheckCircle2
                      size={14}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />
                  ) : (
                    <XCircle
                      size={14}
                      className="mt-0.5 shrink-0 text-rose-600"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs font-semibold">
                      {entry.awb}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {entry.hubCode} · {entry.message}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-bold text-slate-600">
                      {entry.scanType}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatTrackingTime(entry.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
