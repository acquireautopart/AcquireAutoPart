"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import { deliveryApi } from "@/features/delivery/lib/deliveryApi";

const initialForm = {
  name: "",
  phone: "",
  email: "",
  password: "",
  address: "",
  country: "",
  state: "",
  district: "",
  postalCode: "",
  documentType: "",
  documentNumber: "",
};
const inputClass =
  "mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

async function loadLocations(country, state) {
  const query = new URLSearchParams({ country });
  if (state) query.set("state", state);
  const response = await fetch(`/api/locations?${query}`, {
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(data?.locations)) {
    throw new Error(data?.message || "Could not load this location list.");
  }
  return data.locations;
}

export default function DeliveryApplicationForm() {
  const [form, setForm] = useState(initialForm);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [document, setDocument] = useState(null);
  const [applicationToken, setApplicationToken] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [manualState, setManualState] = useState("");
  const [manualDistrict, setManualDistrict] = useState("");

  useEffect(() => {
    let active = true;
    deliveryApi
      .countries()
      .then((result) => active && setCountries(result))
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setLoadingCountries(false));
    return () => {
      active = false;
    };
  }, []);

  const country = useMemo(
    () => countries.find((item) => item.code === form.country),
    [countries, form.country],
  );

  useEffect(() => {
    if (!country) return undefined;
    let active = true;
    setLoadingStates(true);
    loadLocations(country.name)
      .then((result) => active && setStates(result))
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setLoadingStates(false));
    return () => {
      active = false;
    };
  }, [country]);

  useEffect(() => {
    if (!country || !form.state || form.state === "__other__") return undefined;
    let active = true;
    setLoadingDistricts(true);
    loadLocations(country.name, form.state)
      .then((result) => active && setDistricts(result))
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setLoadingDistricts(false));
    return () => {
      active = false;
    };
  }, [country, form.state]);

  function setField(key, value) {
    setError("");
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (
      !applicationToken &&
      (!(photo instanceof File) || !(document instanceof File))
    ) {
      setError("Both your profile photo and identity document are required.");
      return;
    }

    setBusy(true);
    try {
      let token = applicationToken;
      if (!token) {
        const application = await deliveryApi.createApplication({
          ...form,
          state: form.state === "__other__" ? manualState : form.state,
          district:
            form.district === "__other__" ? manualDistrict : form.district,
          documentType: form.documentType,
        });
        token = application.applicationToken;
        setApplicationToken(token);
      }

      for (const [kind, file] of [
        ["photo", photo],
        ["document", document],
      ]) {
        if (uploadedFiles[kind] || !file) continue;
        const result = await deliveryApi.uploadApplicationFile(
          token,
          kind,
          file,
        );
        setUploadedFiles((current) => ({ ...current, [kind]: true }));
        if (result.applicationStatus === "Pending") {
          setApplicationToken("");
          setSuccess(true);
        }
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <section
        id="apply"
        className="scroll-mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8"
      >
        <CheckCircle2 className="text-emerald-700" size={28} />
        <h2 className="mt-3 text-xl font-extrabold text-emerald-950">
          Application submitted
        </h2>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          AcquireAuto will review your details and identity documents, then
          contact you to arrange an interview. Delivery login will be available
          after approval.
        </p>
      </section>
    );
  }

  return (
    <section
      id="apply"
      className="scroll-mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-700">
          Delivery partner application
        </p>
        <h2 className="mt-2 text-2xl font-extrabold">
          Apply to deliver with us
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Submit your contact, address and identity details. Our team will
          review them and schedule an interview before approving your account.
        </p>
      </div>
      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          ["name", "Full name", "text", "name"],
          ["phone", "Phone number with country code", "tel", "tel"],
          ["email", "Email address", "email", "email"],
          [
            "password",
            "Create password (10–128 characters)",
            "password",
            "new-password",
          ],
        ].map(([key, label, type, autoComplete]) => (
          <label key={key} className="text-xs font-bold text-slate-700">
            {label}
            <input
              className={inputClass}
              type={type}
              autoComplete={autoComplete}
              value={form[key]}
              onChange={(event) => setField(key, event.target.value)}
              minLength={key === "password" ? 10 : undefined}
              maxLength={key === "password" ? 128 : undefined}
              required
              disabled={Boolean(applicationToken)}
            />
          </label>
        ))}
        <label className="text-xs font-bold text-slate-700 sm:col-span-2">
          Full residential address
          <textarea
            className="mt-1.5 min-h-24 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            value={form.address}
            onChange={(event) => setField("address", event.target.value)}
            maxLength={500}
            required
            disabled={Boolean(applicationToken)}
          />
        </label>
        <label className="text-xs font-bold text-slate-700">
          Country
          <select
            className={inputClass}
            value={form.country}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                country: event.target.value,
                state: "",
                district: "",
                documentType: "",
              }));
              setStates([]);
              setDistricts([]);
              setManualState("");
              setManualDistrict("");
              setError("");
            }}
            required
            disabled={loadingCountries || Boolean(applicationToken)}
          >
            <option value="">
              {loadingCountries ? "Loading countries…" : "Select country"}
            </option>
            {countries.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <label className="text-xs font-bold text-slate-700">
            State / province / region
            <select
              className={inputClass}
              value={form.state}
              onChange={(event) => {
                const state = event.target.value;
                setForm((current) => ({ ...current, state, district: "" }));
                setDistricts([]);
                setManualDistrict("");
              }}
              required={Boolean(states.length && form.state !== "__other__")}
              disabled={!country || loadingStates || Boolean(applicationToken)}
            >
              <option value="">
                {loadingStates ? "Loading states…" : "Select state or region"}
              </option>
              {states.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              <option value="__other__">Not listed — enter manually</option>
            </select>
          </label>
          {(form.state === "__other__" ||
            (!loadingStates && !states.length && country)) && (
            <input
              className={inputClass}
              value={manualState}
              onChange={(event) => {
                setManualState(event.target.value);
                setForm((current) => ({ ...current, state: "__other__" }));
              }}
              placeholder="Enter state or region"
              maxLength={120}
              required
              disabled={Boolean(applicationToken)}
            />
          )}
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">
            District / city
            <select
              className={inputClass}
              value={form.district}
              onChange={(event) => setField("district", event.target.value)}
              required={Boolean(
                districts.length &&
                form.district !== "__other__" &&
                form.state !== "__other__",
              )}
              disabled={
                !form.state ||
                form.state === "__other__" ||
                loadingDistricts ||
                Boolean(applicationToken)
              }
            >
              <option value="">
                {loadingDistricts
                  ? "Loading districts…"
                  : "Select district or city"}
              </option>
              {districts.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              <option value="__other__">Not listed — enter manually</option>
            </select>
          </label>
          {(form.district === "__other__" ||
            (!loadingDistricts && !districts.length && form.state) ||
            form.state === "__other__") && (
            <input
              className={inputClass}
              value={manualDistrict}
              onChange={(event) => {
                setManualDistrict(event.target.value);
                setForm((current) => ({ ...current, district: "__other__" }));
              }}
              placeholder="Enter district or city"
              maxLength={120}
              required
              disabled={Boolean(applicationToken)}
            />
          )}
        </div>
        <label className="text-xs font-bold text-slate-700">
          PIN / postal code
          <input
            className={inputClass}
            value={form.postalCode}
            onChange={(event) => setField("postalCode", event.target.value)}
            maxLength={24}
            autoComplete="postal-code"
            required
            disabled={Boolean(applicationToken)}
          />
        </label>
        <label className="text-xs font-bold text-slate-700">
          Identity document type
          <select
            className={inputClass}
            value={form.documentType}
            onChange={(event) => setField("documentType", event.target.value)}
            required
            disabled={!country || Boolean(applicationToken)}
          >
            <option value="">Select document</option>
            {(country?.documentTypes || []).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-700">
          Identity document number
          <input
            className={inputClass}
            value={form.documentNumber}
            onChange={(event) => setField("documentNumber", event.target.value)}
            maxLength={120}
            autoComplete="off"
            required
            disabled={Boolean(applicationToken)}
          />
        </label>
        <label className="text-xs font-bold text-slate-700">
          Profile photo (JPEG, PNG or WebP; maximum 5 MB)
          <input
            className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:font-bold file:text-orange-700"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required={!applicationToken}
            onChange={(event) => setPhoto(event.target.files?.[0] || null)}
            disabled={uploadedFiles.photo}
          />
          {uploadedFiles.photo && (
            <span className="mt-1 block font-normal text-emerald-700">
              Photo uploaded
            </span>
          )}
        </label>
        <label className="text-xs font-bold text-slate-700">
          Identity document (image or PDF; maximum 5 MB)
          <input
            className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:font-bold file:text-orange-700"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            required={!applicationToken}
            onChange={(event) => setDocument(event.target.files?.[0] || null)}
            disabled={uploadedFiles.document}
          />
          {uploadedFiles.document && (
            <span className="mt-1 block font-normal text-emerald-700">
              Document uploaded
            </span>
          )}
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2"
          >
            {error}
          </p>
        )}
        <div className="sm:col-span-2">
          <p className="mb-3 text-xs leading-5 text-slate-500">
            Your document and photo are stored privately and are only available
            to authorized administrators for review.
          </p>
          <button
            type="submit"
            disabled={busy || loadingCountries}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-orange-600 px-5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload size={15} />
            {busy
              ? "Submitting…"
              : applicationToken
                ? "Retry file upload"
                : "Submit application"}
          </button>
        </div>
      </form>
    </section>
  );
}
