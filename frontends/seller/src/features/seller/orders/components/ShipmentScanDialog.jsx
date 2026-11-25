"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ScanLine, X } from "lucide-react";

export function ShipmentScanDialog({ onClose, onScan }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const scanningRef = useRef(false);
  const inputRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleScan = useCallback(
    async (rawValue) => {
      const token = String(rawValue || "").trim();
      if (!token || scanningRef.current) return;
      scanningRef.current = true;
      setBusy(true);
      setError("");
      setNotice("");
      setCameraActive(false);
      controlsRef.current?.stop();
      try {
        const result = await onScan(token);
        setNotice(
          `Package updated to ${result.fulfillment}. ${
            result.fulfillment === "Shipped"
              ? "Delivery tracking continues in the delivery workspace."
              : "Scan the same label again at the next step."
          }`,
        );
        setScanValue("");
      } catch (scanError) {
        setError(scanError.message || "Could not update this package.");
      } finally {
        setBusy(false);
        scanningRef.current = false;
      }
    },
    [onScan],
  );

  useEffect(() => {
    if (!cameraActive || !videoRef.current) return undefined;
    let active = true;

    async function startCamera() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (!active) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result) handleScan(result.getText());
          },
        );
        if (active) controlsRef.current = controls;
        else controls.stop();
      } catch (cameraError) {
        if (active) {
          setError(
            cameraError.message ||
              "Camera scanner is unavailable. Use the handheld scanner input below.",
          );
        }
      }
    }

    startCamera();
    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [cameraActive, handleScan]);

  function resumeScan() {
    setError("");
    setNotice("");
    setCameraActive(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-neutral-950/70 p-3"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="shipment-scan-title"
        className="w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-[#151515]"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-extrabold tracking-[.15em] text-neutral-400">
              SELLER HUB
            </p>
            <h2 id="shipment-scan-title" className="mt-1 text-xl font-extrabold dark:text-white">
              Scan package
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Each scan advances one step: Packed, Shipped, then Delivered.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close scanner"
          >
            <X size={18} />
          </button>
        </header>

        <div className="mt-4 overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
        </div>
        {!cameraActive && !busy && (
          <button
            type="button"
            onClick={resumeScan}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-3 text-xs font-bold text-white"
          >
            <Camera size={15} /> Scan another package
          </button>
        )}

        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleScan(scanValue);
          }}
        >
          <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300">
            Handheld barcode scanner
            <span className="mt-1.5 flex gap-2">
              <input
                ref={inputRef}
                value={scanValue}
                onChange={(event) => setScanValue(event.target.value)}
                placeholder="Scan barcode or enter the package code"
                disabled={busy}
                autoComplete="off"
                className="h-10 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-orange-400 dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                type="submit"
                disabled={busy || !scanValue.trim()}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-3 text-xs font-bold text-white disabled:opacity-50"
              >
                <ScanLine size={15} />
                {busy ? "Updating…" : "Scan"}
              </button>
            </span>
          </label>
        </form>

        {notice && (
          <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
