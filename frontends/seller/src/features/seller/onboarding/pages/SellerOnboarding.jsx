"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  HelpCircle,
  IdCard,
  Lock,
  MapPin,
  Package,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Upload,
} from "lucide-react";
import ThemeToggle from "@/features/seller/shared/components/ThemeToggle";
import { sellerApi } from "@/features/seller/lib/sellerApi";
import { useMarket } from "@/features/storefront/lib/market";
import { cx } from "@/features/seller/shared/components/utils";

const SECTIONS = [
  {
    key: "contact",
    title: "Mobile & Email Verification",
    items: [
      { key: "mobile", label: "Mobile Verification", icon: Smartphone },
      { key: "email", label: "Email Verification", icon: CheckCircle2 },
    ],
  },
  {
    key: "identity",
    title: "ID & Signature Verification",
    items: [
      { key: "id", label: "ID Verification", icon: IdCard },
      { key: "signature", label: "Signature Verification", icon: FileSignature },
    ],
  },
  {
    key: "business",
    title: "Business & Tax Details",
    items: [
      { key: "businessTax", label: "Business Tax ID", icon: ShieldCheck },
      { key: "sellCategories", label: "What you sell", icon: Package },
    ],
  },
  {
    key: "store",
    title: "Store & Pickup Details",
    items: [
      { key: "displayName", label: "Display Name", icon: Store },
      { key: "pickupAddress", label: "Pickup Address", icon: MapPin },
    ],
  },
  {
    key: "listing",
    title: "Listing & Stock Availability",
    items: [
      { key: "listing", label: "Listing Created", icon: Package },
      { key: "stock", label: "Stock Added", icon: ClipboardCheck },
    ],
  },
];

const CATEGORY_OPTIONS = [
  "All Categories",
  "Brakes & Suspension",
  "Engine Parts",
  "Lighting & Electrical",
  "Body Parts",
];

const inputClass =
  "h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-orange-950 dark:disabled:bg-neutral-800";
const labelClass = "text-xs font-bold text-neutral-600 dark:text-neutral-300";

export default function SellerOnboarding() {
  const router = useRouter();
  const { country: detectedCountry, countries, error: marketError, refreshMarket } = useMarket();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const [ownerName, setOwnerName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [sellCategories, setSellCategories] = useState(["All Categories"]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [idFile, setIdFile] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([sellerApi.me(), sellerApi.products()])
      .then(([{ seller: current }, productsResult]) => {
        if (!active) return;
        setSeller(current);
        setProducts(productsResult.products || []);
        setOwnerName(current.name || "");
        setStoreName(current.storeName || "");
        setAddress(current.address || "");
        setTaxId(current.taxId || "");
        setSellCategories(current.sellCategories?.length ? current.sellCategories : ["All Categories"]);
        setSelectedCountry(current.country || "");
      })
      .catch((sessionError) => {
        if (!active) return;
        if (sessionError.status === 401) router.replace("/login");
        else setError(sessionError.message);
      })
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!selectedCountry && detectedCountry) setSelectedCountry(detectedCountry);
  }, [detectedCountry, selectedCountry]);

  const country = useMemo(
    () => countries.find((entry) => entry.code === selectedCountry),
    [countries, selectedCountry],
  );
  const documentTypes = country?.documentTypes || [];
  const taxInfo = country?.taxInfo || { label: "Tax ID", placeholder: "Tax identification number (if applicable)", required: false };

  useEffect(() => {
    if (documentType && !documentTypes.includes(documentType)) setDocumentType("");
  }, [documentType, documentTypes]);

  const completedItems = useMemo(() => {
    const map = new Map();
    for (const section of SECTIONS)
      for (const item of section.items)
        map.set(item.key, isItemComplete(seller, products, item.key, taxInfo));
    return map;
  }, [seller, products, taxInfo]);

  const totalItems = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);
  const completedCount = [...completedItems.values()].filter(Boolean).length;
  const progress = Math.round((completedCount / totalItems) * 100);

  // Section gating: a section is locked until the previous section is fully complete.
  const sectionComplete = useCallback(
    (sectionKey) =>
      SECTIONS.find((s) => s.key === sectionKey)?.items.every((i) => completedItems.get(i.key)) ??
      false,
    [completedItems],
  );
  const isLocked = useCallback(
    (sectionKey) => {
      if (sectionKey === "contact" || sectionKey === "identity") return false;
      const order = SECTIONS.map((s) => s.key);
      const idx = order.indexOf(sectionKey);
      if (idx <= 0) return false;
      return !sectionComplete(order[idx - 1]);
    },
    [sectionComplete],
  );

  const scrollTo = (key) => {
    const el = document.getElementById(key);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveStoreDetails = useCallback(async () => {
    setError("");
    if (ownerName.trim().length < 2) return setError("Enter your name.");
    if (storeName.trim().length < 2) return setError("Enter your store name.");
    try {
      const { seller: s } = await sellerApi.updateSettings({
        name: ownerName.trim(),
        storeName: storeName.trim(),
      });
      setSeller(s);
    } catch (e) {
      setError(e.message);
    }
  }, [ownerName, storeName]);

  const saveAddress = useCallback(async () => {
    setError("");
    if (address.trim().length < 10) return setError("Enter a complete pickup address.");
    try {
      const { seller: s } = await sellerApi.updateSettings({ address: address.trim() });
      setSeller(s);
    } catch (e) {
      setError(e.message);
    }
  }, [address]);

  const saveBusiness = useCallback(async () => {
    setError("");
    if (taxInfo.required && !taxId.trim()) return setError(`Enter your ${taxInfo.label}.`);
    if (!sellCategories.length) return setError("Choose at least one category.");
    try {
      const { seller: s } = await sellerApi.updateSettings({
        taxId: taxId.trim(),
        sellCategories,
      });
      setSeller(s);
    } catch (e) {
      setError(e.message);
    }
  }, [taxId, sellCategories, taxInfo]);

  const submitId = useCallback(async () => {
    setError("");
    if (!selectedCountry) return setError("Choose your country.");
    if (!documentType) return setError("Choose a document type.");
    if (documentNumber.trim().length < 3) return setError("Enter your document number.");
    if (!(idFile instanceof File) || !idFile.size)
      return setError("Choose an ID image or PDF to upload.");
    try {
      await sellerApi.submitVerification(
        idFile,
        documentType,
        documentNumber.trim(),
        selectedCountry,
      );
      setSeller((c) => ({ ...c, verificationStatus: "Pending", country: selectedCountry }));
      setDocumentNumber("");
      setIdFile(null);
    } catch (e) {
      setError(e.message);
    }
  }, [documentNumber, documentType, idFile, selectedCountry]);

  const submitSignature = useCallback(async () => {
    setError("");
    if (!(signatureFile instanceof File) || !signatureFile.size)
      return setError("Choose a signature image or PDF to upload.");
    try {
      await sellerApi.submitSignature(signatureFile);
      setSeller((c) => ({ ...c, signatureStatus: "Pending" }));
      setSignatureFile(null);
    } catch (e) {
      setError(e.message);
    }
  }, [signatureFile]);

  const logout = useCallback(async () => {
    try {
      await sellerApi.logout();
    } catch {
      /* ignore */
    }
    router.replace("/login");
  }, [router]);

  if (busy) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f7f5] text-sm text-neutral-500 dark:bg-[#090909]">
        Loading your onboarding…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] dark:bg-[#090909]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-[#111]/95">
        <div className="mx-auto flex min-h-[64px] w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
          <a href="/" className="block w-[150px] rounded-lg bg-[#101010] px-2 py-1">
            <img src="/logo.png" alt="AcquireAuto Parts" className="h-9 w-full object-contain" />
          </a>
          <ol className="hidden items-center gap-2 text-[11px] font-extrabold tracking-wide sm:flex">
            <li className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 size={15} /> EMAIL &amp; PASSWORD
            </li>
            <li className="text-neutral-300 dark:text-neutral-700">—</li>
            <li className="flex items-center gap-1.5 text-brand">
              <IdCard size={15} /> BUSINESS DETAILS
            </li>
          </ol>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="text-xs font-bold text-brand hover:underline"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-4 py-6 sm:px-6">
        {/* Left: completion status card */}
        <aside className="hidden w-[320px] shrink-0 lg:block">
          <div className="sticky top-[88px] overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm dark:border-orange-900/60 dark:bg-[#111]">
            <div className="bg-gradient-to-br from-orange-400 to-amber-400 p-5 text-white">
              <h2 className="font-display text-lg font-extrabold leading-snug">
                Your onboarding completion status
              </h2>
              <div className="mt-4 flex items-center gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/95 font-display text-lg font-extrabold text-orange-600">
                  {progress}%
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/40">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="p-4">
              {SECTIONS.map((section) => (
                <div key={section.key} className="mb-4 last:mb-0">
                  <h3 className="px-1 text-sm font-extrabold text-neutral-700 dark:text-neutral-200">
                    {section.title}
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {section.items.map((item) => {
                      const done = completedItems.get(item.key);
                      return (
                        <li key={item.key}>
                          <button
                            type="button"
                            onClick={() => scrollTo(item.key)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-orange-50 dark:hover:bg-orange-950/20"
                          >
                            <span
                              className={cx(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2",
                                done
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-orange-400 text-transparent",
                              )}
                            >
                              <Check size={14} />
                            </span>
                            <span
                              className={cx(
                                "flex items-center gap-2 text-sm font-semibold",
                                done
                                  ? "text-neutral-800 dark:text-neutral-100"
                                  : "text-neutral-400 dark:text-neutral-500",
                              )}
                            >
                              <item.icon size={15} aria-hidden="true" />
                              {item.label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Middle: all sections */}
        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight">Hello</h1>
              <p className="text-sm text-neutral-500">
                Complete your seller profile to start selling on AcquireAuto.
              </p>
            </div>
            <div className="lg:hidden">
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-extrabold text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                {progress}% complete
              </span>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </p>
          )}

          {/* Mobile & Email */}
          <SectionCard id="mobile" title="Mobile & Email Verification">
            <VerifiedRow icon={Smartphone} label={seller?.phone || "—"} done={!!seller?.phone} />
            <VerifiedRow icon={CheckCircle2} label={seller?.email || "—"} done={!!seller?.email} />
          </SectionCard>

          {/* ID & Signature (always open) */}
          <SectionCard id="id" title="ID & Signature Verification">
            <p className="mb-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              ID Verification
            </p>
            <p className="mb-3 text-xs text-neutral-500">
              Verify your identity first — your country here decides which tax ID and document we
              ask for next.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Country
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    setSelectedCountry(e.target.value);
                    setDocumentType("");
                  }}
                  disabled={!countries.length}
                  className={cx(inputClass, "mt-1")}
                >
                  {!countries.length && <option value="">Country list unavailable</option>}
                  {countries.map((entry) => (
                    <option key={entry.code} value={entry.code}>
                      {entry.name} ({entry.currency})
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Document type
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  disabled={!documentTypes.length}
                  className={cx(inputClass, "mt-1")}
                >
                  <option value="">Select a document</option>
                  {documentTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className={cx(labelClass, "mt-3 block")}>
              Document number
              <input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                autoComplete="off"
                maxLength={120}
                className={cx(inputClass, "mt-1")}
              />
            </label>
            <label className={cx(labelClass, "mt-3 block")}>
              ID image or PDF (max 5 MB)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-xs text-neutral-500 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-xs file:font-semibold dark:file:bg-neutral-800"
              />
            </label>
            <button
              type="button"
              onClick={submitId}
              className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-[12px] font-extrabold text-white transition hover:bg-brand-dark"
            >
              <Upload size={14} /> Submit ID
            </button>

            {marketError && !countries.length && (
              <div
                role="alert"
                className="mt-3 flex items-center justify-between gap-3 text-xs text-red-600"
              >
                <span>{marketError} Country and document options could not be loaded.</span>
                <button type="button" className="font-bold underline" onClick={refreshMarket}>
                  Retry
                </button>
              </div>
            )}

            <div className="mt-6 border-t border-neutral-100 pt-5 dark:border-neutral-800">
              <p className="mb-1 text-sm font-bold text-neutral-700 dark:text-neutral-200">
                Add Your e-Signature
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-neutral-500 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-xs file:font-semibold dark:file:bg-neutral-800"
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                Upload a clear signature on plain white paper.
              </p>
              <button
                type="button"
                onClick={submitSignature}
                className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-brand px-4 text-[12px] font-extrabold text-brand transition hover:bg-brand hover:text-white"
              >
                <FileSignature size={14} /> Upload signature
              </button>
            </div>
          </SectionCard>

          {/* Business & Tax (locked until ID + signature done) */}
          <SectionCard
            id="businessTax"
            title="Business & Tax Details"
            locked={isLocked("business")}
            unlockHint="Complete ID & Signature Verification first."
          >
            <p className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              What are you looking to sell on AcquireAuto?
            </p>
            <div className="flex flex-wrap gap-3">
              {CATEGORY_OPTIONS.map((cat) => {
                const active = sellCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={isLocked("business")}
                    onClick={() =>
                      setSellCategories((prev) =>
                        prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
                      )
                    }
                    className={cx(
                      "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-orange-300 dark:border-neutral-700 dark:bg-[#111] dark:text-neutral-300",
                    )}
                  >
                    <Package size={16} /> {cat}
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  maxLength={40}
                  disabled={isLocked("business")}
                  placeholder={`Enter ${taxInfo.label}${taxInfo.required ? " *" : " (optional)"}`}
                  className={cx(inputClass, "sm:max-w-xs")}
                />
                <button
                  type="button"
                  onClick={saveBusiness}
                  disabled={isLocked("business")}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-[12px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-50"
                >
                  Save {taxInfo.label}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-neutral-500">
                {taxInfo.required
                  ? `${taxInfo.label} is required to sell products on AcquireAuto.`
                  : `${taxInfo.label} is optional for ${country?.name || "your country"}.`}
              </p>
            </div>
          </SectionCard>

          {/* Store & Pickup (locked until business done) */}
          <SectionCard
            id="displayName"
            title="Store & Pickup Details"
            locked={isLocked("store")}
            unlockHint="Complete Business & Tax Details first."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Display name (your name)
                <input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  disabled={isLocked("store")}
                  autoComplete="name"
                  maxLength={80}
                  className={cx(inputClass, "mt-1")}
                />
              </label>
              <label className={labelClass}>
                Store name
                <input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  disabled={isLocked("store")}
                  autoComplete="organization"
                  maxLength={120}
                  className={cx(inputClass, "mt-1")}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={saveStoreDetails}
              disabled={isLocked("store")}
              className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-[12px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              Save store details
            </button>

            <div id="pickupAddress" className="mt-6">
              <label className={labelClass}>
                Pickup address
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={isLocked("store")}
                  rows={3}
                  maxLength={1000}
                  placeholder="Street, area, city, state, PIN, landmark"
                  className={cx(inputClass, "mt-1 h-auto py-2")}
                />
              </label>
              <button
                type="button"
                onClick={saveAddress}
                disabled={isLocked("store")}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-[12px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-50"
              >
                Save pickup address
              </button>
            </div>
          </SectionCard>

          {/* Listing & Stock (locked until store done) */}
          <SectionCard
            id="listing"
            title="Listing & Stock Availability"
            locked={isLocked("listing")}
            unlockHint="Complete Store & Pickup Details first."
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={isLocked("listing") ? undefined : "/seller/products"}
                className={cx(
                  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-5 text-[13px] font-extrabold text-white transition",
                  isLocked("listing")
                    ? "cursor-not-allowed bg-neutral-300 dark:bg-neutral-700"
                    : "bg-brand hover:bg-brand-dark",
                )}
              >
                Create a listing <ArrowRight size={16} />
              </a>
              <a
                href={isLocked("listing") ? undefined : "/seller/inventory"}
                className={cx(
                  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-5 text-[13px] font-bold transition",
                  isLocked("listing")
                    ? "cursor-not-allowed border-neutral-200 text-neutral-400 dark:border-neutral-700"
                    : "border-neutral-200 text-neutral-700 hover:border-orange-300 hover:text-orange-700 dark:border-neutral-700 dark:text-neutral-200",
                )}
              >
                <ClipboardCheck size={15} /> Manage inventory
              </a>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              Listings: <strong>{products.length}</strong> · In stock:{" "}
              <strong>{products.filter((p) => (p.stock ?? 0) > 0).length}</strong>
            </p>
          </SectionCard>

          {progress === 100 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
              <ShieldCheck size={28} className="mx-auto text-emerald-600" />
              <h2 className="mt-2 font-display text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                Onboarding complete!
              </h2>
              <button
                type="button"
                onClick={() => router.replace("/seller")}
                className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-brand px-5 text-[13px] font-extrabold text-white transition hover:bg-brand-dark"
              >
                Go to seller hub <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="hidden w-[260px] shrink-0 space-y-4 xl:block">
          <a
            href="/seller/products"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-extrabold text-neutral-700 transition hover:border-orange-300 hover:text-orange-700 dark:border-neutral-700 dark:bg-[#111] dark:text-neutral-200"
          >
            Go to Listing <ArrowRight size={16} />
          </a>
          <button
            type="button"
            onClick={() => router.replace("/seller")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-extrabold text-white transition hover:bg-brand-dark"
          >
            GO LIVE NOW <ArrowRight size={16} />
          </button>

          <div className="rounded-2xl border border-blue-200 bg-white p-5 dark:border-blue-900/50 dark:bg-[#111]">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-blue-500" />
              <span className="font-display text-sm font-extrabold">Grow your store</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-neutral-600 dark:text-neutral-400">
              Use discounts, analytics, and fitment-aware listings to reach more buyers and convert
              faster.
            </p>
            <a
              href="/seller/discounts"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
            >
              Create a discount <ArrowRight size={13} />
            </a>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2">
              <Smartphone size={18} className="text-emerald-600" />
              <span className="font-display text-sm font-extrabold">Seller updates</span>
            </div>
            <ul className="mt-2 space-y-1.5 text-xs text-emerald-700 dark:text-emerald-300">
              <li className="flex items-center gap-2">
                <Check size={13} /> Smart selling hacks
              </li>
              <li className="flex items-center gap-2">
                <Check size={13} /> Feature updates
              </li>
            </ul>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 px-4 py-2.5 text-xs font-bold text-white dark:bg-white dark:text-neutral-900"
          >
            <HelpCircle size={15} /> Help
          </button>
        </aside>
      </div>
    </main>
  );
}

function isItemComplete(seller, products, key, taxInfo) {
  switch (key) {
    case "mobile":
      return Boolean(seller?.phone);
    case "email":
      return Boolean(seller?.email);
    case "id":
      return (seller?.verificationStatus || "Not submitted") !== "Not submitted";
    case "signature":
      return (seller?.signatureStatus || "Not submitted") !== "Not submitted";
    case "businessTax":
      return taxInfo?.required ? Boolean(seller?.taxId) : true;
    case "sellCategories":
      return (seller?.sellCategories?.length || 0) > 0;
    case "displayName":
      return Boolean(seller?.storeName);
    case "pickupAddress":
      return Boolean(seller?.address);
    case "listing":
      return products.length > 0;
    case "stock":
      return products.some((p) => (p.stock ?? 0) > 0);
    default:
      return false;
  }
}

function SectionCard({ id, title, children, locked = false, unlockHint = "" }) {
  return (
    <section
      id={id}
      className={cx(
        "relative rounded-2xl border bg-white p-5 dark:bg-[#111] sm:p-6",
        locked
          ? "border-neutral-200 dark:border-neutral-800"
          : "border-neutral-200 dark:border-neutral-800",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-extrabold">{title}</h2>
        {locked && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold text-neutral-500 dark:bg-neutral-800">
            <Lock size={11} /> Locked
          </span>
        )}
      </div>
      <div className={cx("mt-4", locked && "pointer-events-none select-none opacity-60")}>
        {children}
      </div>
      {locked && unlockHint && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
          <Lock size={13} /> {unlockHint}
        </div>
      )}
    </section>
  );
}

function VerifiedRow({ icon: Icon, label, done }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 py-3 last:border-0 dark:border-neutral-800">
      <div className="flex min-w-0 items-center gap-3">
        <Icon size={18} className="shrink-0 text-neutral-400" />
        <span className="truncate text-sm font-semibold">{label}</span>
      </div>
      {done ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          <Check size={11} /> Verified
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-500 dark:bg-neutral-800">
          Pending
        </span>
      )}
    </div>
  );
}
