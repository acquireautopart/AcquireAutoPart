"use client";

import Link from "next/link";
import { useState } from "react";
import { Car, Plus, Star, Trash2, Cog, Fuel, Package, ArrowRight, Search } from "lucide-react";
import { profileApi } from "@/features/storefront/lib/profileApi";
import { getImageUrl } from "@/features/storefront/lib/imageUrl";
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

const EMPTY_VEHICLE = { name: "", years: "", year: "", make: "", model: "", trim: "", engine: "", fuel: "", parts: "" };

function VehicleForm({ onClose, onSaved }) {
  const [values, setValues] = useState(EMPTY_VEHICLE);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();

    const name = values.name.trim();
    if (name.length < 1 || name.length > 120) {
      setError("Vehicle name must be between 1 and 120 characters.");
      return;
    }

    const payload = { name };
    if (values.years.trim()) payload.years = values.years.trim();
    if (values.year.trim()) payload.year = Number(values.year);
    if (values.make.trim()) payload.make = values.make.trim();
    if (values.model.trim()) payload.model = values.model.trim();
    if (values.trim.trim()) payload.trim = values.trim.trim();
    if (values.engine.trim()) payload.engine = values.engine.trim();
    if (values.fuel.trim()) payload.fuel = values.fuel.trim();
    if (values.parts !== "") {
      const parts = Number(values.parts);
      if (!Number.isFinite(parts) || parts < 0 || parts > 100000) {
        setError("Parts count must be a number between 0 and 100000.");
        return;
      }
      payload.parts = parts;
    }

    setError("");
    setSaving(true);
    try {
      const { vehicle } = await profileApi.createVehicle(payload);
      onSaved(vehicle);
    } catch (err) {
      setError(err.message || "Could not save this vehicle. Please try again.");
      setSaving(false);
    }
  }

  return (
    <ProfileModal
      title="Add a vehicle"
      description="Save your vehicle so every search only shows parts that fit."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Vehicle name">
          <input
            className={PROFILE_INPUT}
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            maxLength={120}
            placeholder="e.g. Maruti Swift VXi"
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Year" hint="Optional, e.g. 2019">
            <input className={PROFILE_INPUT} type="number" min="1900" max="2100" value={values.year} onChange={(event) => update("year", event.target.value)} placeholder="2019" />
          </Field>
          <Field label="Make" hint="Optional, e.g. Toyota">
            <input className={PROFILE_INPUT} value={values.make} onChange={(event) => update("make", event.target.value)} maxLength={80} placeholder="Toyota" />
          </Field>
          <Field label="Model" hint="Optional, e.g. Corolla">
            <input className={PROFILE_INPUT} value={values.model} onChange={(event) => update("model", event.target.value)} maxLength={100} placeholder="Corolla" />
          </Field>
          <Field label="Trim" hint="Optional">
            <input className={PROFILE_INPUT} value={values.trim} onChange={(event) => update("trim", event.target.value)} maxLength={80} placeholder="LE" />
          </Field>
          <Field label="Years" hint="Optional, e.g. 2015-2020">
            <input
              className={PROFILE_INPUT}
              value={values.years}
              onChange={(event) => update("years", event.target.value)}
              maxLength={40}
              placeholder="2015-2020"
            />
          </Field>
          <Field label="Engine" hint="Optional, e.g. 1.5L i-VTEC">
            <input
              className={PROFILE_INPUT}
              value={values.engine}
              onChange={(event) => update("engine", event.target.value)}
              maxLength={80}
              placeholder="1.5L i-VTEC"
            />
          </Field>
          <Field label="Fuel" hint="Optional, e.g. Petrol">
            <input
              className={PROFILE_INPUT}
              value={values.fuel}
              onChange={(event) => update("fuel", event.target.value)}
              maxLength={40}
              placeholder="Petrol"
            />
          </Field>
          <Field label="Parts matched" hint="Optional, 0-100000">
            <input
              className={PROFILE_INPUT}
              type="number"
              min="0"
              max="100000"
              value={values.parts}
              onChange={(event) => update("parts", event.target.value)}
              placeholder="0"
            />
          </Field>
        </div>

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
            {saving ? "Saving…" : "Save vehicle"}
          </button>
        </div>
      </form>
    </ProfileModal>
  );
}

export default function VehiclesPageClient() {
  const { data, loading, error, reload } = useProfileResource(profileApi.vehicles);
  const [notice, setNotice] = useSectionNotice();
  const [showForm, setShowForm] = useState(false);

  const vehicles = data?.vehicles ?? [];

  async function setPrimary(vehicle) {
    try {
      await profileApi.setPrimaryVehicle(vehicle.id);
      await reload({ silent: true });
      setNotice(`${vehicle.name} is now your primary vehicle`);
    } catch (err) {
      setNotice(err.message || "Could not update your primary vehicle.");
    }
  }

  async function remove(vehicle) {
    try {
      await profileApi.removeVehicle(vehicle.id);
      await reload({ silent: true });
      setNotice(`${vehicle.name} removed from your garage`);
    } catch (err) {
      setNotice(err.message || "Could not remove this vehicle.");
    }
  }

  async function handleSaved(vehicle) {
    setShowForm(false);
    await reload({ silent: true });
    setNotice(`${vehicle?.name || "Vehicle"} added to your garage`);
  }

  return (
    <ProfileSubpageFrame activeId="vehicles">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 font-display text-2xl font-extrabold sm:text-3xl">
            <Car size={24} className="shrink-0 text-[var(--pf-brand)]" strokeWidth={2} />
            Saved Vehicles
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--pf-text-2)]">
            Keep your vehicles on file so we can match every order to the right part.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--pf-brand)] px-4 text-sm font-bold text-white hover:brightness-110"
        >
          <Plus size={16} /> Add vehicle
        </button>
      </header>

      <ProfileResourceState
        loading={loading}
        error={error}
        onRetry={() => reload()}
        signInLabel="Sign in to save the vehicles you drive."
      >
        {vehicles.length > 0 && (
          <p className="mt-3 text-xs text-[var(--pf-muted)]">
            {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} in your garage
          </p>
        )}

        {vehicles.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {vehicles.map((vehicle) => (
              <article
                key={vehicle.id}
                className={`pf-card flex flex-col overflow-hidden transition-colors ${
                  vehicle.isPrimary ? "border-[var(--pf-brand)]" : "hover:border-[var(--pf-brand)]"
                }`}
              >
                <div className="relative flex h-40 items-center justify-center bg-[var(--pf-card-2)]">
                  {vehicle.image ? (
                    <img
                      src={getImageUrl(vehicle.image, { width: 480, quality: 80 })}
                      alt={vehicle.name}
                      loading="lazy"
                      className="h-full w-full object-contain p-3"
                    />
                  ) : (
                    <Car size={48} className="text-[var(--pf-muted)]" />
                  )}
                  {vehicle.isPrimary && (
                    <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded bg-[var(--pf-brand)] px-2 py-0.5 text-[10px] font-bold text-white">
                      <Star size={11} className="fill-white" /> Primary
                    </span>
                  )}
                  <button
                    onClick={() => remove(vehicle)}
                    aria-label={`Remove ${vehicle.name}`}
                    title="Remove vehicle"
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-[var(--pf-border)] bg-[var(--pf-card)] text-[var(--pf-muted)] transition-colors hover:border-[var(--pf-brand)] hover:text-[var(--pf-brand)]"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h2 className="text-base font-bold">{vehicle.name}</h2>
                    {vehicle.years && (
                      <span className="rounded-full bg-[var(--pf-brand-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--pf-brand)]">
                        {vehicle.years}
                      </span>
                    )}
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
                    <div className="rounded-lg bg-[var(--pf-card-2)] px-2.5 py-2">
                      <dt className="flex items-center gap-1 text-[var(--pf-muted)]">
                        <Cog size={12} /> Engine
                      </dt>
                      <dd className="mt-0.5 font-semibold">{vehicle.engine || "—"}</dd>
                    </div>
                    <div className="rounded-lg bg-[var(--pf-card-2)] px-2.5 py-2">
                      <dt className="flex items-center gap-1 text-[var(--pf-muted)]">
                        <Fuel size={12} /> Fuel
                      </dt>
                      <dd className="mt-0.5 font-semibold">{vehicle.fuel || "—"}</dd>
                    </div>
                    <div className="rounded-lg bg-[var(--pf-card-2)] px-2.5 py-2">
                      <dt className="flex items-center gap-1 text-[var(--pf-muted)]">
                        <Package size={12} /> Parts
                      </dt>
                      <dd className="mt-0.5 font-semibold">{vehicle.parts ?? 0} matched</dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                    <Link
                      href="/parts"
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--pf-brand)] px-3 text-xs font-bold text-white hover:brightness-110"
                    >
                      <Search size={15} /> Find parts
                    </Link>
                    {vehicle.isPrimary ? (
                      <span className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--pf-border)] px-3 text-xs font-semibold text-[var(--pf-muted)]">
                        Default vehicle
                      </span>
                    ) : (
                      <button
                        onClick={() => setPrimary(vehicle)}
                        className="pf-outline-btn min-h-10"
                      >
                        Set as primary
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}

            <button
              onClick={() => setShowForm(true)}
              className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--pf-border)] p-6 text-center text-[var(--pf-text-2)] transition-colors hover:border-[var(--pf-brand)] hover:text-[var(--pf-brand)]"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
                <Plus size={22} />
              </span>
              <span className="text-sm font-bold">Add another vehicle</span>
              <span className="max-w-[220px] text-xs text-[var(--pf-muted)]">
                Add a car, bike or truck to get exact-fit parts.
              </span>
            </button>
          </div>
        ) : (
          <div className="pf-card mt-4 grid place-items-center px-5 py-14 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
              <Car size={28} />
            </span>
            <h2 className="mt-4 font-display text-xl font-extrabold">No vehicles saved yet</h2>
            <p className="mt-2 max-w-sm text-sm text-[var(--pf-text-2)]">
              Save your vehicle once and we will filter every search to parts that fit.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--pf-brand)] px-5 text-sm font-bold text-white hover:brightness-110"
            >
              <Plus size={16} /> Add your first vehicle
            </button>
          </div>
        )}
      </ProfileResourceState>

      <div className="pf-card mt-4 flex flex-wrap items-center gap-3 p-4">
        <ArrowRight size={18} className="shrink-0 text-[var(--pf-brand)]" />
        <p className="min-w-0 flex-1 text-xs text-[var(--pf-text-2)]">
          Your primary vehicle is used by default in the parts fitment filter and in your saved
          searches.
        </p>
      </div>

      {showForm && <VehicleForm onClose={() => setShowForm(false)} onSaved={handleSaved} />}

      <SectionNotice message={notice} />
    </ProfileSubpageFrame>
  );
}
