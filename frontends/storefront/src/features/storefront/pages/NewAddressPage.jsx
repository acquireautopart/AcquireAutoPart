"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Building2, Crosshair, Home, Plus, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import profileApi from "@/features/storefront/lib/profileApi";
import { requestCustomerAuthDialog } from "@/lib/authApi";

const AddressMap = dynamic(() => import("@/features/storefront/components/address/AddressMap"), {
  ssr: false,
});

/* The account API stores one of these labels for each saved address. */
const ADDRESS_TYPE_LABELS = { Home: "Home", Work: "Office" };

function locationParts(address = {}) {
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    address.state_district ||
    "";
  return { city, region: address.state || address.province || "" };
}

export default function NewAddressPage() {
  const router = useRouter();
  const [mode, setMode] = useState("");
  const [showChoice, setShowChoice] = useState(true);
  const [coordinates, setCoordinates] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [query, setQuery] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [house, setHouse] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressType, setAddressType] = useState("Home");
  const [editingLocation, setEditingLocation] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [lookingUpPoint, setLookingUpPoint] = useState(false);
  const [saving, setSaving] = useState(false);

  async function reverseGeocode(point) {
    setCoordinates(point);
    setMapCenter(point);
    setLocationError("");
    setLookingUpPoint(true);
    try {
      const params = new URLSearchParams({
        kind: "reverse",
        lat: String(point.latitude),
        lon: String(point.longitude),
      });
      const response = await fetch(`/api/geocoding?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not find this place.");
      if (data.display_name) {
        setAddressLine(data.display_name);
        setQuery(data.display_name);
      }
      setPostalCode(data.address?.postcode || "");
      const parts = locationParts(data.address);
      if (parts.city) setCity(parts.city);
      if (parts.region) setRegion(parts.region);
      setMode("manual");
      setEditingLocation(false);
      setShowChoice(false);
    } catch (error) {
      setLocationError(error.message);
      setMode("manual");
      setEditingLocation(false);
      setShowChoice(false);
    } finally {
      setLookingUpPoint(false);
    }
  }

  async function searchPlaces(event) {
    event.preventDefault();
    if (query.trim().length < 3) {
      setLocationError("Enter at least 3 characters to search.");
      return;
    }
    setSearching(true);
    setLocationError("");
    try {
      const params = new URLSearchParams({ kind: "search", q: query.trim() });
      const response = await fetch(`/api/geocoding?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search is temporarily unavailable.");
      setSearchResults(data);
      if (data.length === 0)
        setLocationError("No matching places found. Try a nearby area or postal code.");
    } catch (error) {
      setLocationError(error.message);
    } finally {
      setSearching(false);
    }
  }

  function selectSearchResult(result) {
    const point = { latitude: Number(result.lat), longitude: Number(result.lon) };
    setCoordinates(point);
    setMapCenter(point);
    setAddressLine(result.display_name || "");
    setPostalCode(result.address?.postcode || "");
    const parts = locationParts(result.address);
    if (parts.city) setCity(parts.city);
    if (parts.region) setRegion(parts.region);
    setQuery(result.display_name || "");
    setSearchResults([]);
    setLocationError("");
    setMode("manual");
    setEditingLocation(false);
    setShowChoice(false);
  }

  function useCurrentLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location is not available in this browser. Enter your address manually.");
      setMode("manual");
      setEditingLocation(true);
      setShowChoice(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
        setMapCenter({ latitude: coords.latitude, longitude: coords.longitude });
        setMode("current");
        setEditingLocation(false);
        setShowChoice(false);
        reverseGeocode({ latitude: coords.latitude, longitude: coords.longitude });
      },
      () => {
        setLocationError("We couldn't access your location. You can enter the address manually.");
        setMode("manual");
        setEditingLocation(true);
        setShowChoice(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function saveAddress(event) {
    event.preventDefault();
    if (!addressLine.trim()) {
      setLocationError("Choose a map location or search for your area before saving.");
      setEditingLocation(true);
      return;
    }

    setSaving(true);
    setLocationError("");
    const values = new FormData(event.currentTarget);
    const payload = {
      label: ADDRESS_TYPE_LABELS[addressType] || "Home",
      name: String(values.get("name") || "").trim(),
      line: [String(values.get("house") || "").trim(), addressLine.trim()]
        .filter(Boolean)
        .join(", "),
      city: String(values.get("city") || "").trim(),
      region: String(values.get("region") || "").trim(),
      postalCode: postalCode.trim(),
      phone: String(values.get("phone") || "").trim(),
    };

    try {
      await profileApi.createAddress(payload);
      router.push("/cart");
    } catch (error) {
      if (error.status === 401) requestCustomerAuthDialog();
      setLocationError(
        error.status === 401
          ? "Please sign in to your account before saving an address."
          : error.message,
      );
      setSaving(false);
    }
  }

  const formPanel = (
    <form onSubmit={saveAddress} className="space-y-3">
      <label className="relative block text-[11px] font-semibold text-[#2165f5]">
        Flat/House/building name *
        <input
          name="house"
          required
          autoComplete="address-line1"
          value={house}
          onChange={(event) => setHouse(event.target.value)}
          className="mt-1 h-12 w-full rounded-lg border border-[#2165f5] px-3 text-sm text-[#202124] outline-none focus:ring-2 focus:ring-[#2165f5]/15"
        />
      </label>
      <div className="rounded-lg bg-[#f4f5f7] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#8a8a8a]">Area / Sector / Locality</p>
            <p className="mt-1 line-clamp-3 text-sm leading-5 text-[#303030]">
              {addressLine || "Choose a map location or search for your area"}
            </p>
            {postalCode && (
              <p className="mt-1 text-xs font-semibold text-[#303030]">{postalCode}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingLocation(true);
              setLocationError("");
            }}
            className="shrink-0 rounded-lg border border-[#2165f5] px-3 py-1.5 text-xs font-semibold text-[#2165f5]"
          >
            Change
          </button>
        </div>
      </div>
      <label className="relative block text-[11px] font-semibold text-[#8a8a8a]">
        Enter your full name *
        <input
          name="name"
          required
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Full name"
          className="mt-1 h-12 w-full rounded-lg border border-[#d4d4d8] px-3 text-sm text-[#202124] outline-none focus:border-[#2165f5]"
        />
      </label>
      <label className="relative block text-[11px] font-semibold text-[#8a8a8a]">
        10-digit mobile number *
        <input
          name="phone"
          required
          autoComplete="tel"
          inputMode="numeric"
          pattern="[0-9]{10}"
          maxLength={10}
          value={phone}
          onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Mobile number"
          className="mt-1 h-12 w-full rounded-lg border border-[#d4d4d8] px-3 text-sm text-[#202124] outline-none focus:border-[#2165f5]"
        />
      </label>
      <label className="relative block text-[11px] font-semibold text-[#8a8a8a]">
        City *
        <input
          name="city"
          required
          autoComplete="address-level2"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="City"
          className="mt-1 h-12 w-full rounded-lg border border-[#d4d4d8] px-3 text-sm text-[#202124] outline-none focus:border-[#2165f5]"
        />
      </label>
      <label className="relative block text-[11px] font-semibold text-[#8a8a8a]">
        State / Region
        <input
          name="region"
          autoComplete="address-level1"
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          placeholder="State or region (optional)"
          className="mt-1 h-12 w-full rounded-lg border border-[#d4d4d8] px-3 text-sm text-[#202124] outline-none focus:border-[#2165f5]"
        />
      </label>
      <label className="relative block text-[11px] font-semibold text-[#8a8a8a]">
        Postal code
        <input
          name="postalCode"
          readOnly
          value={postalCode}
          placeholder="Filled from the map location"
          className="mt-1 h-12 w-full rounded-lg border border-[#d4d4d8] bg-[#f4f5f7] px-3 text-sm text-[#202124] outline-none"
        />
      </label>
      <div>
        <p className="mb-2 text-[11px] text-[#8a8a8a]">Type of address</p>
        <div className="flex gap-2">
          {[
            { label: "Home", Icon: Home },
            { label: "Work", Icon: Building2 },
          ].map(({ label, Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => setAddressType(label)}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs ${addressType === label ? "border-[#2165f5] bg-[#eff6ff] text-[#2165f5]" : "border-[#d4d4d8] text-[#52525b]"}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>
      {locationError && (
        <p role="status" className="text-xs text-[#b42318]">
          {locationError}
        </p>
      )}
      <button
        disabled={saving || lookingUpPoint}
        className="min-h-12 w-full rounded-lg bg-[#2165f5] px-5 text-sm font-bold text-white hover:bg-[#1555dc] disabled:cursor-wait disabled:opacity-60"
        type="submit"
      >
        {saving ? "Saving address…" : "Save address"}
      </button>
    </form>
  );

  return (
    <main className="min-h-dvh bg-white text-[#202124]">
      <header className="relative z-10 flex h-16 items-center gap-3 border-b border-[#e4e4e7] bg-white px-4 sm:px-8">
        <Link
          href="/cart"
          aria-label="Back to cart"
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-[#f4f4f5]"
        >
          <ArrowLeft size={23} />
        </Link>
        <h1 className="text-lg font-bold sm:text-xl">Add new address</h1>
      </header>

      <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
        <section
          aria-label="Map location"
          className="relative h-[calc(100dvh-4rem)] min-h-[420px] overflow-hidden bg-[#e6e4dc]"
        >
          <div className="absolute inset-0 z-0">
            <AddressMap center={mapCenter} onMapLocation={reverseGeocode} />
          </div>
          {mode && !editingLocation && (
            <div className="absolute inset-0 z-[5] bg-black/45" aria-hidden="true" />
          )}
          {(!mode || editingLocation) && (
            <>
              <form
                onSubmit={searchPlaces}
                className="absolute left-4 right-4 top-4 z-[500] flex h-12 items-center gap-2 rounded-xl bg-white px-3 shadow-lg lg:left-6 lg:right-6"
              >
                <Search size={19} className="shrink-0 text-[#71717a]" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSearchResults([]);
                    setLocationError("");
                  }}
                  placeholder="Search by area, name, street."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8b8b93]"
                  aria-label="Search address or area"
                />
                <button
                  disabled={searching}
                  className="shrink-0 rounded-md bg-[#2165f5] px-3 py-2 text-xs font-bold text-white hover:bg-[#1555dc] disabled:opacity-60"
                  type="submit"
                >
                  {searching ? "Searching" : "Search"}
                </button>
              </form>
              {searchResults.length > 0 && (
                <div className="absolute left-4 right-4 top-[4.25rem] z-[500] max-h-64 overflow-y-auto rounded-xl bg-white p-2 shadow-xl lg:left-6 lg:right-6">
                  {searchResults.map((result) => (
                    <button
                      type="button"
                      key={`${result.osm_type}-${result.osm_id}-${result.lat}`}
                      onClick={() => selectSearchResult(result)}
                      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-[#3f3f46] hover:bg-[#f4f7fb]"
                    >
                      {result.display_name}
                    </button>
                  ))}
                </div>
              )}
              {locationError && (
                <p
                  role="status"
                  className="absolute left-4 right-4 top-[4.25rem] z-[500] rounded-lg bg-white px-3 py-2 text-xs text-[#b42318] shadow-lg lg:left-6 lg:right-6"
                >
                  {locationError}
                </p>
              )}
              <button
                onClick={useCurrentLocation}
                className="absolute bottom-8 left-1/2 z-[500] inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-3 text-sm font-bold text-[#1766c1] shadow-lg hover:bg-[#f6faff]"
              >
                <Crosshair size={18} /> Use my current location
              </button>
            </>
          )}
          <span className="absolute bottom-1 left-2 z-[500] rounded bg-white/85 px-1.5 py-1 text-[10px] text-[#4b5563]">
            Search via OpenStreetMap Nominatim. Map data © OpenStreetMap contributors.
          </span>
        </section>

        <aside className="hidden bg-white p-6 lg:block lg:p-8">
          {mode ? (
            editingLocation ? (
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Choose location</h2>
                  <button
                    onClick={() => {
                      setMode("");
                      setEditingLocation(false);
                      setShowChoice(true);
                    }}
                    aria-label="Close location panel"
                    className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#f4f4f5]"
                  >
                    <X size={21} />
                  </button>
                </div>
                <p className="mt-3 text-sm text-[#52525b]">
                  Search for an area or click the map to place your delivery pin.
                </p>
                {lookingUpPoint && (
                  <p className="mt-3 text-xs text-[#71717a]">Finding this map location…</p>
                )}
                {locationError && (
                  <p role="status" className="mt-3 text-xs text-[#b42318]">
                    {locationError}
                  </p>
                )}
                <button
                  onClick={useCurrentLocation}
                  className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#2165f5] px-4 text-sm font-bold text-[#2165f5]"
                >
                  <Crosshair size={18} /> Use current location
                </button>
                {coordinates && !lookingUpPoint && (
                  <button
                    onClick={() => setEditingLocation(false)}
                    className="mt-3 min-h-12 w-full rounded-xl bg-[#2165f5] text-sm font-bold text-white"
                  >
                    Use this location
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-bold">Deliver To</h2>
                  <button
                    onClick={() => {
                      setMode("");
                      setShowChoice(true);
                    }}
                    aria-label="Close delivery form"
                    className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#f4f4f5]"
                  >
                    <X size={21} />
                  </button>
                </div>
                <div className="mb-4 rounded-xl bg-[#fff6e7] px-3 py-2.5 text-xs leading-4 text-[#8b5a13]">
                  ⓘ &nbsp; Ensure your address details are accurate for a smooth delivery experience
                </div>
                {formPanel}
              </div>
            )
          ) : (
            <div className="pt-3">
              <h2 className="text-lg font-bold leading-6">
                Where do you want us to deliver the order?
              </h2>
              <p className="mt-4 text-sm text-[#52525b]">
                This will help with the right map location
              </p>
              <button
                onClick={() => {
                  setMode("manual");
                  setEditingLocation(true);
                  setShowChoice(false);
                }}
                className="mt-5 min-h-12 w-full rounded-xl bg-[#2165f5] px-4 text-sm font-bold text-white hover:bg-[#1555dc]"
              >
                Away from my location
              </button>
              <button
                onClick={useCurrentLocation}
                className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#2165f5] px-4 text-sm font-bold text-[#2165f5] hover:bg-[#f5f9ff]"
              >
                <Crosshair size={18} /> Use current location
              </button>
              {locationError && (
                <p role="status" className="mt-3 text-xs text-[#b42318]">
                  {locationError}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>

      {showChoice && (
        <div
          className="fixed inset-x-0 bottom-0 top-16 z-20 flex items-end bg-black/60 lg:hidden"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-choice-title"
            className="w-full rounded-t-[22px] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:px-8"
          >
            <div className="mx-auto mb-5 h-1 w-14 rounded-full bg-[#e4e4e7]" />
            <h2 id="location-choice-title" className="text-xl font-bold leading-7">
              Where do you want us to deliver the order?
            </h2>
            <p className="mt-4 text-sm text-[#52525b]">
              This will help with the right map location
            </p>
            <button
              onClick={() => {
                setMode("manual");
                setEditingLocation(true);
                setShowChoice(false);
              }}
              className="mt-6 min-h-14 w-full rounded-xl bg-[#2165f5] px-4 text-base font-bold text-white hover:bg-[#1555dc]"
            >
              Away from my location
            </button>
            <button
              onClick={useCurrentLocation}
              className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-[#2165f5] px-4 text-base font-bold text-[#2165f5] hover:bg-[#f5f9ff]"
            >
              <Crosshair size={20} /> Use current location
            </button>
            {locationError && (
              <p role="status" className="mt-3 text-xs text-[#b42318]">
                {locationError}
              </p>
            )}
          </section>
        </div>
      )}

      {mode && (
        <div className="fixed inset-x-0 bottom-0 z-10 max-h-[78dvh] overflow-y-auto rounded-t-2xl border-t border-[#e4e4e7] bg-white p-4 shadow-[0_-8px_24px_rgba(0,0,0,.14)] lg:hidden">
          {editingLocation ? (
            <div className="pb-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">Choose location</h2>
                <button
                  onClick={() => {
                    setMode("");
                    setEditingLocation(false);
                    setShowChoice(true);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#f4f4f5]"
                  aria-label="Close location panel"
                >
                  <X size={21} />
                </button>
              </div>
              <p className="text-sm text-[#52525b]">
                Search an area or tap the map to place your delivery pin.
              </p>
              {lookingUpPoint && (
                <p className="mt-3 text-xs text-[#71717a]">Finding this map location…</p>
              )}
              {locationError && (
                <p role="status" className="mt-3 text-xs text-[#b42318]">
                  {locationError}
                </p>
              )}
              <button
                onClick={useCurrentLocation}
                className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#2165f5] text-sm font-bold text-[#2165f5]"
              >
                <Crosshair size={18} /> Use current location
              </button>
              {coordinates && !lookingUpPoint && (
                <button
                  onClick={() => setEditingLocation(false)}
                  className="mt-2 min-h-12 w-full rounded-xl bg-[#2165f5] text-sm font-bold text-white"
                >
                  Use this location
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">Deliver To</h2>
                <button
                  onClick={() => {
                    setMode("");
                    setShowChoice(true);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#f4f4f5]"
                  aria-label="Close delivery form"
                >
                  <X size={21} />
                </button>
              </div>
              <div className="mb-4 rounded-xl bg-[#fff6e7] px-3 py-2.5 text-xs leading-4 text-[#8b5a13]">
                ⓘ &nbsp; Ensure your address details are accurate for a smooth delivery experience
              </div>
              {formPanel}
            </>
          )}
        </div>
      )}
    </main>
  );
}
