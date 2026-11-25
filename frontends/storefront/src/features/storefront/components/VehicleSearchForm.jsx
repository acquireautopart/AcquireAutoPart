"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CarFront, Search, Wrench, ScanLine, ImagePlus } from "lucide-react";
import { requestCurrentCustomer } from "@/lib/authApi";
import { profileApi } from "@/features/storefront/lib/profileApi";
import { useMarket } from "@/features/storefront/lib/market";

export default function VehicleSearchForm() {
  const router = useRouter();
  const { country } = useMarket();
  const [mode, setMode] = useState("vehicle");
  const [query, setQuery] = useState("");
  const [garageVehicles, setGarageVehicles] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [decodingVin, setDecodingVin] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [vehicle, setVehicle] = useState({ year: "", make: "", model: "", trim: "", engine: "" });

  useEffect(() => {
    const controller = new AbortController();
    requestCurrentCustomer({ signal: controller.signal })
      .then((session) => session?.customer ? profileApi.vehicles({ signal: controller.signal }) : null)
      .then((result) => { if (!controller.signal.aborted) setGarageVehicles(result?.vehicles || []); })
      .catch((error) => { if (error.name !== "AbortError") setGarageVehicles([]); });
    return () => controller.abort();
  }, [country]);

  async function submitSearch(event) {
    event.preventDefault();
    if (mode === "vehicle" && (vehicle.make.trim() || vehicle.model.trim())) {
      if (!vehicle.make.trim() || !vehicle.model.trim()) {
        setSearchError("Enter both make and model for a vehicle fitment search.");
        return;
      }
      const params = new URLSearchParams({ country, make: vehicle.make.trim(), model: vehicle.model.trim() });
      for (const key of ["year", "trim", "engine"]) if (vehicle[key].trim()) params.set(key, vehicle[key].trim());
      if (query.trim()) params.set("q", query.trim());
      router.push(`/parts?${params}`);
      return;
    }
    if (mode === "photo") {
      if (!photo) {
        setSearchError("Choose a clear part photo first.");
        return;
      }
      setSearchError("");
      setDecodingVin(true);
      try {
        const form = new FormData();
        form.set("image", photo);
        const response = await fetch("/api/parts/image-search", { method: "POST", body: form });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || "Could not analyze this image.");
        router.push(`/parts?${new URLSearchParams({ q: result.query, country })}`);
      } catch (error) {
        setSearchError(error.message || "Photo search is temporarily unavailable.");
      } finally {
        setDecodingVin(false);
      }
      return;
    }
    const term = query.trim();
    if (!term) return;
    setSearchError("");
    if (mode === "vin") {
      if (country !== "US") {
        setSearchError("VIN decoding is currently available for US market vehicles.");
        return;
      }
      if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(term)) {
        setSearchError("Enter a valid 17-character VIN (letters I, O and Q are not used).");
        return;
      }
      setDecodingVin(true);
      try {
        const response = await fetch(`/api/vin?vin=${encodeURIComponent(term)}`);
        const payload = await response.json();
        const vehicle = payload?.vehicle;
        if (!response.ok || !vehicle) throw new Error(payload?.error || "We could not decode this VIN. Check it and try again.");
        const parts = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim, vehicle.displacement ? `${vehicle.displacement}L` : ""].filter((part) => part && part !== "Not Applicable");
        if (!parts.length) throw new Error("This VIN did not return searchable vehicle details.");
        router.push(`/parts?${new URLSearchParams({ q: parts.join(" "), country })}`);
      } catch (error) {
        setSearchError(error.message || "VIN lookup is temporarily unavailable.");
      } finally {
        setDecodingVin(false);
      }
      return;
    }
    router.push(`/parts?${new URLSearchParams({ q: term, country })}`);
  }

  function searchGarage(vehicle) {
    const term = vehicle.make && vehicle.model
      ? [vehicle.make, vehicle.model, vehicle.trim, vehicle.engine].filter(Boolean).join(" ")
      : [vehicle.name, vehicle.years, vehicle.engine].filter(Boolean).join(" ");
    const params = new URLSearchParams({ q: term, country });
    for (const key of ["year", "make", "model", "trim", "engine"]) if (vehicle[key]) params.set(key, vehicle[key]);
    router.push(`/parts?${params}`);
  }

  return (
    <div
      className="relative mx-auto w-full max-w-[500px] scroll-mt-24 pt-10 sm:pt-12 lg:mx-0"
      id="vehicle-search"
    >
      <img
        src="/car.png"
        alt="Black sports car"
        className="pointer-events-none absolute -top-2 right-1 z-20 h-20 w-auto object-contain drop-shadow-[0_0_18px_rgba(255,100,25,0.65)] sm:-top-5 sm:right-5 sm:h-28"
      />

      <div className="relative rounded-[25px] border border-orange-500/60 bg-[#10151d] p-3 pt-9 shadow-[0_20px_70px_rgba(0,0,0,0.55)] sm:p-4 sm:pt-11">
        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Product search type">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "vehicle"}
            onClick={() => setMode("vehicle")}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 py-3 text-center text-xs font-bold transition sm:text-sm ${
              mode === "vehicle"
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <CarFront size={17} aria-hidden="true" />
            Search by Vehicle
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "part"}
            onClick={() => setMode("part")}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 py-3 text-center text-xs font-bold transition sm:text-sm ${
              mode === "part"
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <Wrench size={17} aria-hidden="true" />
            Search by Part
          </button>
          <button type="button" role="tab" aria-selected={mode === "photo"} onClick={() => setMode("photo")} className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-center text-xs font-bold transition sm:text-sm ${mode === "photo" ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}>
            <ImagePlus size={16} aria-hidden="true" /> Search by photo
          </button>
          {country === "US" && (
            <button type="button" role="tab" aria-selected={mode === "vin"} onClick={() => setMode("vin")} className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-1 py-3 text-center text-[10px] font-bold transition sm:gap-2 sm:px-2 sm:text-sm ${mode === "vin" ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}>
              <ScanLine size={16} aria-hidden="true" /> VIN lookup
            </button>
          )}
        </div>

        <div className="mt-3 rounded-[19px] bg-white p-4 sm:p-5">
          <form onSubmit={submitSearch}>
            <label className="mb-1.5 block text-xs font-bold text-slate-800" htmlFor="vehicle-part-query">
              {mode === "photo" ? "Search using a part photo" : mode === "vehicle" ? "Search by vehicle or fitment" : mode === "vin" ? "Decode a US vehicle VIN" : "Search by part"}
            </label>
            {mode === "photo" ? (
              <label className="flex min-h-[60px] cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-600 hover:border-orange-400">
                <ImagePlus className="shrink-0 text-orange-600" size={19} />
                <span className="min-w-0 truncate">{photo ? photo.name : "Choose a JPEG, PNG, or WebP image (max 5 MB)"}</span>
                <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
              </label>
            ) : (
            <>
            {mode === "vehicle" && (
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[["year", "Year"], ["make", "Make *"], ["model", "Model *"], ["trim", "Trim"], ["engine", "Engine"]].map(([key, label]) => (
                  <label key={key} className="text-[9px] font-bold text-slate-600">{label}<input type={key === "year" ? "number" : "text"} min={key === "year" ? 1900 : undefined} max={key === "year" ? 2100 : undefined} value={vehicle[key]} onChange={(event) => setVehicle((current) => ({ ...current, [key]: event.target.value }))} placeholder={key === "year" ? "2020" : key === "make" ? "Toyota" : key === "model" ? "Camry" : key === "trim" ? "LE" : "2.5L"} className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-800" /></label>
                ))}
              </div>
            )}
            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/15">
              <Search className="shrink-0 text-orange-600" size={19} aria-hidden="true" />
              <input
                id="vehicle-part-query"
                className="h-[60px] w-full min-w-0 bg-transparent py-2 pl-1 pr-2 text-sm font-semibold text-slate-800 outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  mode === "vin"
                    ? "Enter your 17-character VIN"
                    : "e.g. brake pads, brand, or part number"
                }
                value={query}
              />
            </div>
            </>
            )}
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {mode === "photo" ? "Photo labels and visible part numbers suggest catalog terms; confirm the exact part with the seller." : mode === "vin" ? "VIN is sent to NHTSA vPIC to suggest vehicle details; seller fitment still needs confirmation." : "Search products currently listed by marketplace sellers."}
            </p>
            {searchError && <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{searchError}</p>}
            <button
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 text-sm font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none"
              type="submit"
              disabled={(mode === "photo" ? !photo : mode === "vehicle" ? (!query.trim() && !(vehicle.make.trim() && vehicle.model.trim())) : !query.trim()) || decodingVin}
            >
              <Search size={17} aria-hidden="true" />
              <span className="text-center">{decodingVin ? (mode === "photo" ? "Reading photo…" : "Decoding VIN…") : mode === "photo" ? "Find similar parts" : mode === "vin" ? "Decode and find parts" : "Find Parts"}</span>
            </button>
            {garageVehicles.length > 0 && mode !== "vin" && (
              <div className="mt-4 border-t border-slate-200 pt-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Your garage</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {garageVehicles.slice(0, 3).map((vehicle) => (
                    <button key={vehicle.id} type="button" onClick={() => searchGarage(vehicle)} className="rounded-full border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-700 transition hover:border-orange-400 hover:text-orange-700">
                      {vehicle.name} {vehicle.years ? `· ${vehicle.years}` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
