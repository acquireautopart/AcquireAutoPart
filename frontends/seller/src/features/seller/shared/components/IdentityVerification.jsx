"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Upload } from "lucide-react";
import { Button, Panel } from "@/features/seller/shared/components/ui";
import { sellerApi } from "@/features/seller/lib/sellerApi";
import { useMarket } from "@/features/storefront/lib/market";

export default function IdentityVerification({ seller, onSubmitted }) {
  const { country: detectedCountry, countries, error: marketError, refreshMarket } = useMarket();
  const [selectedCountry, setSelectedCountry] = useState(seller?.country || detectedCountry || "");
  const [documentType, setDocumentType] = useState(
    seller?.identityVerification?.documentType || "",
  );
  const [documentNumber, setDocumentNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sellerCountry = seller?.country || "";
  const hasSellerCountry = countries.some((entry) => entry.code === sellerCountry);
  const countryCode = hasSellerCountry ? sellerCountry : selectedCountry;
  const country = countries.find((entry) => entry.code === countryCode);
  const documentTypes = country?.documentTypes || [];
  const verificationStatus =
    seller?.verificationStatus || seller?.identityVerification?.status || "Not submitted";

  useEffect(() => {
    if (!hasSellerCountry && detectedCountry) setSelectedCountry(detectedCountry);
  }, [hasSellerCountry, detectedCountry]);

  useEffect(() => {
    if (documentType && !documentTypes.includes(documentType)) setDocumentType("");
  }, [countryCode, documentType, documentTypes]);

  if (verificationStatus === "Approved") {
    return (
      <Panel className="flex items-center gap-3 border-emerald-200 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:text-emerald-300">
        <ShieldCheck size={18} />
        Your identity is verified. Your store is eligible to appear in the{" "}
        {country?.name || "local"} marketplace.
      </Panel>
    );
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    const file = new FormData(event.currentTarget).get("identityDocument");
    if (!(file instanceof File) || !file.size) {
      setError("Choose an ID image or PDF to upload.");
      return;
    }
    setBusy(true);
    try {
      const result = await sellerApi.submitVerification(
        file,
        documentType,
        documentNumber,
        countryCode,
      );
      setDocumentNumber("");
      onSubmitted(result.verification);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="border-amber-200 p-5 dark:border-amber-900">
      <div className="flex items-start gap-3">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-amber-600" />
        <div className="w-full">
          <h2 className="font-display text-base font-extrabold">Verify your seller identity</h2>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            {verificationStatus === "Pending"
              ? "Your document is awaiting manual administrator review."
              : verificationStatus === "Rejected"
                ? "Your last document was not approved. Update it and submit again."
                : "Submit a government-issued ID for your country. Your store will not appear in the marketplace until an administrator approves it."}
          </p>
          <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold">
              Country
              {hasSellerCountry ? (
                <span className="mt-1.5 block rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-normal dark:border-neutral-700 dark:bg-neutral-900">
                  {country ? `${country.name} (${country.currency})` : sellerCountry}
                </span>
              ) : (
                <select
                  value={selectedCountry}
                  onChange={(event) => {
                    setSelectedCountry(event.target.value);
                    setDocumentType("");
                  }}
                  required
                  disabled={!countries.length}
                  className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                >
                  {!countries.length && <option value="">Country list unavailable</option>}
                  {countries.map((entry) => (
                    <option key={entry.code} value={entry.code}>
                      {entry.name} ({entry.currency})
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label className="text-xs font-bold">
              Document type
              <select
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
                required
                className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="">Select a document</option>
                {documentTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold sm:col-span-2">
              Document number
              <input
                value={documentNumber}
                onChange={(event) => setDocumentNumber(event.target.value)}
                autoComplete="off"
                required
                maxLength={120}
                className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            <label className="text-xs font-bold sm:col-span-2">
              ID image or PDF (maximum 5 MB)
              <input
                name="identityDocument"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                required
                className="mt-1.5 block w-full text-xs text-neutral-500 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-xs file:font-semibold dark:file:bg-neutral-800"
              />
            </label>
            {marketError && !countries.length && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 text-xs text-red-600 sm:col-span-2"
              >
                <span>{marketError} Country and document options could not be loaded.</span>
                <button type="button" className="font-bold underline" onClick={refreshMarket}>
                  Retry
                </button>
              </div>
            )}
            {error && (
              <p role="alert" className="text-xs text-red-600 sm:col-span-2">
                {error}
              </p>
            )}
            <p className="text-[10px] leading-4 text-neutral-500 sm:col-span-2">
              ID numbers are encrypted in the database; document files are stored in private S3
              storage and exposed only to authorized administrators for review.
            </p>
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" disabled={busy}>
                <Upload size={14} /> {busy ? "Uploading…" : "Submit identity document"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Panel>
  );
}
