"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Home,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Warehouse,
} from "lucide-react";
import { profileApi } from "@/features/storefront/lib/profileApi";
import ProfileSubpageFrame from "@/features/profile/components/ProfileSubpageFrame";
import { SectionNotice, useSectionNotice } from "@/features/profile/components/SectionNotice";
import {
  useProfileResource,
  ProfileResourceState,
  ProfileModal,
  Field,
  PROFILE_INPUT,
  PROFILE_BTN_PRIMARY,
  PROFILE_BTN_GHOST,
} from "@/features/profile/components/ProfileFormKit";

const SELECTED_ADDRESS_KEY = "acquireauto-selected-address";
const ADDRESS_LABELS = ["Home", "Office", "Workshop", "Other"];
const PHONE_PATTERN = /^[+()\d][\d\s()+-]{5,23}$/;

function readSelectedAddress() {
  try {
    return window.localStorage.getItem(SELECTED_ADDRESS_KEY) || "";
  } catch {
    return "";
  }
}

function typeIcon(label = "") {
  const key = label.toLowerCase();
  if (key.includes("office") || key.includes("work")) return Building2;
  if (key.includes("workshop") || key.includes("garage")) return Warehouse;
  return Home;
}

function AddressForm({ address, onClose, onSaved }) {
  const [values, setValues] = useState(() => ({
    label: address?.label || "Home",
    name: address?.name || "",
    line: address?.line || "",
    city: address?.city || "",
    region: address?.region || "",
    postalCode: address?.postalCode || "",
    country: address?.country || "India",
    phone: address?.phone || "",
  }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();

    const name = values.name.trim();
    if (name.length < 2 || name.length > 120) {
      setError("Recipient name must be between 2 and 120 characters.");
      return;
    }

    const line = values.line.trim();
    if (line.length < 5 || line.length > 300) {
      setError("Street address must be between 5 and 300 characters.");
      return;
    }

    const city = values.city.trim();
    if (!city) {
      setError("Enter a valid city.");
      return;
    }

    const postalCode = values.postalCode.trim();
    if (postalCode.length > 20) {
      setError("Enter a valid postal code.");
      return;
    }

    const phone = values.phone.trim();
    if (phone && !PHONE_PATTERN.test(phone)) {
      setError("Enter a valid contact number.");
      return;
    }

    const payload = {
      label: values.label,
      name,
      line,
      city,
      region: values.region.trim(),
      postalCode,
      country: values.country.trim(),
      phone,
    };

    setError("");
    setSaving(true);
    try {
      const { address: saved } = address
        ? await profileApi.updateAddress(address.id, payload)
        : await profileApi.createAddress(payload);
      onSaved(saved, Boolean(address));
    } catch (err) {
      setError(err.message || "Could not save this address. Please try again.");
      setSaving(false);
    }
  }

  return (
    <ProfileModal
      title={address ? "Edit address" : "Add a new address"}
      description="We use this to deliver your orders and to fill checkout for you."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Label">
          <select
            className={PROFILE_INPUT}
            value={values.label}
            onChange={(event) => update("label", event.target.value)}
          >
            {ADDRESS_LABELS.map((label) => (
              <option
                key={label}
                value={label}
                className="bg-[var(--pf-card)] text-[var(--pf-text)]"
              >
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Recipient name">
          <input
            className={PROFILE_INPUT}
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            maxLength={120}
            placeholder="Full name"
            required
          />
        </Field>

        <Field label="Street address">
          <input
            className={PROFILE_INPUT}
            value={values.line}
            onChange={(event) => update("line", event.target.value)}
            maxLength={300}
            placeholder="Flat / house no., building, street"
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="City">
            <input
              className={PROFILE_INPUT}
              value={values.city}
              onChange={(event) => update("city", event.target.value)}
              maxLength={120}
              required
            />
          </Field>
          <Field label="State / region" hint="Optional">
            <input
              className={PROFILE_INPUT}
              value={values.region}
              onChange={(event) => update("region", event.target.value)}
              maxLength={120}
            />
          </Field>
          <Field label="Postal code" hint="Optional">
            <input
              className={PROFILE_INPUT}
              value={values.postalCode}
              onChange={(event) => update("postalCode", event.target.value)}
              maxLength={20}
            />
          </Field>
          <Field label="Country" hint="Optional">
            <input
              className={PROFILE_INPUT}
              value={values.country}
              onChange={(event) => update("country", event.target.value)}
              maxLength={80}
              placeholder="India"
            />
          </Field>
        </div>

        <Field label="Contact number" hint="Optional">
          <input
            className={PROFILE_INPUT}
            value={values.phone}
            onChange={(event) => update("phone", event.target.value)}
            maxLength={24}
            inputMode="tel"
            placeholder="+91 98765 43210"
          />
        </Field>

        {error && (
          <p role="alert" className="text-xs font-semibold text-[var(--pf-warn)]">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={PROFILE_BTN_GHOST}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={PROFILE_BTN_PRIMARY}>
            {saving ? "Saving…" : address ? "Update address" : "Save address"}
          </button>
        </div>
      </form>
    </ProfileModal>
  );
}

export default function AddressesPageClient() {
  const { data, loading, error, reload } = useProfileResource(profileApi.addresses);
  const [selectedId, setSelectedId] = useState("");
  const [notice, setNotice] = useSectionNotice();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  const addresses = data?.addresses ?? [];

  useEffect(() => {
    setSelectedId(readSelectedAddress());
  }, []);

  function openCreate() {
    setEditingAddress(null);
    setFormOpen(true);
  }

  function openEdit(address) {
    setEditingAddress(address);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingAddress(null);
  }

  async function setDefault(address) {
    try {
      await profileApi.setDefaultAddress(address.id);
      await reload({ silent: true });
      setNotice(`${address.label} address set as default`);
    } catch (err) {
      setNotice(err.message || "Could not set this address as default.");
    }
  }

  async function remove(address) {
    try {
      await profileApi.removeAddress(address.id);
      await reload({ silent: true });
      setNotice(`${address.label} address removed`);
    } catch (err) {
      setNotice(err.message || "Could not remove this address.");
    }
  }

  async function handleSaved(address, isEdit) {
    closeForm();
    await reload({ silent: true });
    setNotice(`${address?.label || "Address"} address ${isEdit ? "updated" : "saved"}`);
  }

  return (
    <ProfileSubpageFrame activeId="addresses">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 font-display text-2xl font-extrabold sm:text-3xl">
            <MapPin size={24} className="shrink-0 text-[var(--pf-brand)]" strokeWidth={2} />
            Addresses
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--pf-text-2)]">
            Manage where your orders are delivered and choose a default address for checkout.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--pf-brand)] px-4 text-sm font-bold text-white hover:brightness-110"
        >
          <Plus size={16} /> Add new address
        </button>
      </header>

      <ProfileResourceState
        loading={loading}
        error={error}
        onRetry={() => reload()}
        signInLabel="Sign in to manage your delivery addresses."
      >
        {addresses.length > 0 && (
          <p className="mt-3 text-xs text-[var(--pf-muted)]">
            {addresses.length} saved address{addresses.length === 1 ? "" : "es"}
          </p>
        )}

        {addresses.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            {addresses.map((address) => {
              const Icon = typeIcon(address.label);
              const cityLine = [address.city, address.region, address.postalCode]
                .filter(Boolean)
                .join(", ");
              const isSelected = selectedId === address.id;
              return (
                <article
                  key={address.id}
                  className={`pf-card flex flex-col p-4 transition-colors sm:p-5 ${
                    address.isDefault
                      ? "border-[var(--pf-brand)]"
                      : "hover:border-[var(--pf-brand)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-bold">{address.label}</h2>
                        {address.isDefault && (
                          <span className="rounded bg-[var(--pf-brand)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            Default
                          </span>
                        )}
                        {isSelected && !address.isDefault && (
                          <span className="rounded bg-[var(--pf-ok-bg)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--pf-ok)]">
                            Selected
                          </span>
                        )}
                      </div>
                      {address.name && (
                        <p className="mt-1 truncate text-xs font-semibold text-[var(--pf-text-2)]">
                          {address.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-[var(--pf-text-2)]">
                    <p className="break-words">{address.line}</p>
                    {cityLine && <p className="break-words">{cityLine}</p>}
                    {address.phone && (
                      <p className="flex items-center gap-1.5 text-[var(--pf-muted)]">
                        <Phone size={12} className="shrink-0" /> {address.phone}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-[var(--pf-border-soft)] pt-3">
                    {address.isDefault ? (
                      <span className="inline-flex min-h-9 items-center gap-1.5 text-[11px] font-semibold text-[var(--pf-brand)]">
                        <CheckCircle2 size={14} /> Used at checkout
                      </span>
                    ) : (
                      <button
                        onClick={() => setDefault(address)}
                        className="pf-outline-btn min-h-9"
                      >
                        Set as default
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(address)}
                      className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--pf-border)] px-3 text-[11px] font-semibold text-[var(--pf-text-2)] hover:border-[var(--pf-brand)] hover:text-[var(--pf-brand)]"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => remove(address)}
                      aria-label={`Delete ${address.label} address`}
                      title="Delete address"
                      className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--pf-border)] text-[var(--pf-muted)] transition-colors hover:border-red-500 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              );
            })}

            <button
              onClick={openCreate}
              className="flex min-h-[190px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--pf-border)] p-6 text-center text-[var(--pf-text-2)] transition-colors hover:border-[var(--pf-brand)] hover:text-[var(--pf-brand)]"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
                <Plus size={22} />
              </span>
              <span className="text-sm font-bold">Add a new address</span>
              <span className="max-w-[220px] text-xs text-[var(--pf-muted)]">
                Save a delivery address to speed up checkout.
              </span>
            </button>
          </div>
        ) : (
          <div className="pf-card mt-4 grid place-items-center px-5 py-14 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
              <MapPin size={28} />
            </span>
            <h2 className="mt-4 font-display text-xl font-extrabold">No addresses saved</h2>
            <p className="mt-2 max-w-sm text-sm text-[var(--pf-text-2)]">
              Add a delivery address to speed up checkout on your next order.
            </p>
            <button
              onClick={openCreate}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--pf-brand)] px-5 text-sm font-bold text-white hover:brightness-110"
            >
              <Plus size={16} /> Add your first address
            </button>
          </div>
        )}
      </ProfileResourceState>

      {formOpen && (
        <AddressForm
          key={editingAddress?.id || "new"}
          address={editingAddress}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      <SectionNotice message={notice} />
    </ProfileSubpageFrame>
  );
}
