"use client";

import { useEffect, useState } from "react";
import { deliveryApi } from "@/features/delivery/lib/deliveryApi";

const initialForm = {
  code: "",
  name: "",
  address: "",
  city: "",
  district: "",
  state: "",
  country: "",
  postalCode: "",
  pickupPincodes: "",
  inChargeName: "",
  inChargeEmail: "",
  inChargePhone: "",
  password: "",
};

const inputClass =
  "mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

export default function HubRegistrationForm() {
  const [form, setForm] = useState(initialForm);
  const [countries, setCountries] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    deliveryApi
      .countries()
      .then((items) => active && setCountries(items))
      .catch((loadError) => active && setError(loadError.message));
    return () => {
      active = false;
    };
  }, []);

  function setField(key, value) {
    setError("");
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await deliveryApi.createHubApplication(form);
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-xl font-extrabold text-emerald-950">
          Hub application submitted
        </h2>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          An admin must approve your hub before you can sign in or receive
          pickup tasks. After approval, open Delivery Partner login, choose
          “Hub staff”, and use the in-charge email and password you registered.
        </p>
      </section>
    );
  }

  const fields = [
    ["code", "Hub code", "text", "Example: DEL-PKP"],
    ["name", "Hub name", "text", "Public hub name"],
    ["inChargeName", "In-charge full name", "text", ""],
    ["inChargeEmail", "In-charge login email", "email", ""],
    ["inChargePhone", "In-charge phone", "tel", "+91 ..."],
    ["address", "Complete hub address", "text", "Street, area, landmark"],
    ["city", "City", "text", ""],
    ["district", "District", "text", ""],
    ["state", "State / region", "text", ""],
    ["postalCode", "Hub postal / PIN code", "text", ""],
    ["pickupPincodes", "Pickup PIN codes served", "text", "Comma-separated PIN codes"],
    ["password", "Login password (10+ characters)", "password", ""],
  ];

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-700">
        Hub registration
      </p>
      <h2 className="mt-2 text-2xl font-extrabold">Register your pickup hub</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Add the postal codes your hub covers and the in-charge contact. Admin
        approval is required before this hub can receive seller pickup requests.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {fields.slice(0, 2).map(([key, label, type, placeholder]) => (
          <label key={key} className="text-xs font-bold">
            {label}
            <input
              required
              type={type}
              maxLength={key === "code" ? 24 : 120}
              placeholder={placeholder}
              value={form[key]}
              onChange={(event) => setField(key, event.target.value)}
              className={inputClass}
            />
          </label>
        ))}
        <label className="text-xs font-bold">
          Country
          <select
            required
            value={form.country}
            onChange={(event) => setField("country", event.target.value)}
            className={inputClass}
          >
            <option value="">Select country</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        {fields.slice(2).map(([key, label, type, placeholder]) => (
          <label
            key={key}
            className={`text-xs font-bold ${key === "address" || key === "pickupPincodes" ? "sm:col-span-2" : ""}`}
          >
            {label}
            <input
              required
              type={type}
              minLength={key === "password" ? 10 : undefined}
              maxLength={key === "password" ? 128 : key === "address" ? 500 : 254}
              placeholder={placeholder}
              value={form[key]}
              onChange={(event) => setField(key, event.target.value)}
              className={inputClass}
            />
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={busy || !countries.length}
        className="mt-5 h-11 rounded-lg bg-orange-600 px-5 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit hub for approval"}
      </button>
    </form>
  );
}
