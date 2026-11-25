"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

/** Home-page entry point: type an AWB and jump to /track/<awb>. */
export default function TrackSearch() {
  const router = useRouter();
  const [awb, setAwb] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const value = awb.trim().toUpperCase();
    if (!value) return;
    router.push(`/track/${encodeURIComponent(value)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-md">
      <label
        htmlFor="track-awb"
        className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.12em] text-slate-500"
      >
        Track a shipment
      </label>
      <div className="flex gap-2">
        <input
          id="track-awb"
          value={awb}
          onChange={(event) => setAwb(event.target.value)}
          placeholder="Enter AWB, e.g. FMPP1234567890"
          autoComplete="off"
          spellCheck={false}
          className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 font-mono text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />
        <button
          type="submit"
          disabled={!awb.trim()}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md bg-[#17212b] px-4 text-xs font-bold text-white transition hover:bg-black disabled:bg-slate-300"
        >
          <Search size={14} /> Track
        </button>
      </div>
    </form>
  );
}
