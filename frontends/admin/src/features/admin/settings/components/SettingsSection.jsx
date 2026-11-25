"use client";

import { useEffect, useState } from "react";
import { Button, Panel, PanelTitle } from "@/features/admin/shared/components/ui";

export function SettingsSection({ settings, countries, onSave, busy, error, success }) {
  const [form, setForm] = useState(settings || {});
  useEffect(() => {
    const visibleSettings = { ...(settings || {}) };
    delete visibleSettings.platformFeeRate;
    setForm(visibleSettings);
  }, [settings]);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const payoutRates = form.deliveryPayoutRates || [];
  function updatePayoutRate(index, key, value) {
    set(
      "deliveryPayoutRates",
      payoutRates.map((rate, rateIndex) =>
        rateIndex === index ? { ...rate, [key]: value } : rate,
      ),
    );
  }
  function addPayoutRate() {
    set("deliveryPayoutRates", [
      ...payoutRates,
      {
        country: "",
        city: "",
        minWeightGrams: 1,
        maxWeightGrams: 500,
        deliveryAgentRate: "",
        hubGrossRate: "",
      },
    ]);
  }
  return (
    <Panel className="p-5">
      <PanelTitle eyebrow="PLATFORM CONTROLS" title="Marketplace settings" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
        className="mt-5 grid gap-4 sm:grid-cols-2"
      >
        <label className="text-xs font-bold">
          Support email
          <input
            type="email"
            value={form.supportEmail || ""}
            onChange={(e) => set("supportEmail", e.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-neutral-700"
          />
        </label>
        <label className="flex items-center gap-3 text-xs font-bold sm:col-span-2">
          <input
            type="checkbox"
            checked={Boolean(form.maintenanceMode)}
            onChange={(e) => set("maintenanceMode", e.target.checked)}
            className="accent-brand"
          />
          Enable maintenance mode flag
        </label>
        <label className="text-xs font-bold sm:col-span-2">
          Marketplace announcement
          <textarea
            rows="3"
            maxLength="500"
            value={form.announcement || ""}
            onChange={(e) => set("announcement", e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-transparent p-3 text-sm dark:border-neutral-700"
          />
        </label>
        <section className="space-y-3 sm:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold">Delivery payout rates</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Rules match the destination country, city, and actual packed weight. Hub gross payout
                includes the delivery partner share. Weight limits are inclusive; ranges for one city
                cannot overlap.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={addPayoutRate}>
              Add rate rule
            </Button>
          </div>
          {payoutRates.length ? (
            <div className="space-y-3">
              {payoutRates.map((rate, index) => {
                const currency =
                  countries.find((country) => country.code === rate.country)?.currency ||
                  rate.currency ||
                  "";
                return (
                  <div
                    key={`${rate.country}-${rate.city}-${rate.minWeightGrams}-${index}`}
                    className="grid gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    <label className="text-xs font-bold">
                      Country
                      <select
                        value={rate.country || ""}
                        onChange={(event) => updatePayoutRate(index, "country", event.target.value)}
                        className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                      >
                        <option value="">Select country</option>
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name} ({country.currency})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-bold">
                      Destination city
                      <input
                        value={rate.city || ""}
                        maxLength={120}
                        onChange={(event) => updatePayoutRate(index, "city", event.target.value)}
                        placeholder="Exact delivery city"
                        className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-neutral-700"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs font-bold">
                        Min weight (g)
                        <input
                          type="number"
                          min="1"
                          max="100000"
                          step="1"
                          value={rate.minWeightGrams ?? ""}
                          onChange={(event) =>
                            updatePayoutRate(index, "minWeightGrams", event.target.value)
                          }
                          className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-2 text-sm dark:border-neutral-700"
                        />
                      </label>
                      <label className="text-xs font-bold">
                        Max weight (g)
                        <input
                          type="number"
                          min="1"
                          max="100000"
                          step="1"
                          value={rate.maxWeightGrams ?? ""}
                          onChange={(event) =>
                            updatePayoutRate(index, "maxWeightGrams", event.target.value)
                          }
                          className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-2 text-sm dark:border-neutral-700"
                        />
                      </label>
                    </div>
                    <label className="text-xs font-bold">
                      Delivery partner payout ({currency})
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.deliveryAgentRate ?? ""}
                        onChange={(event) =>
                          updatePayoutRate(index, "deliveryAgentRate", event.target.value)
                        }
                        className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-neutral-700"
                      />
                    </label>
                    <label className="text-xs font-bold">
                      Hub gross payout ({currency})
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.hubGrossRate ?? ""}
                        onChange={(event) => updatePayoutRate(index, "hubGrossRate", event.target.value)}
                        className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-neutral-700"
                      />
                    </label>
                    <div className="flex items-end sm:col-span-2 lg:col-span-3">
                      <p className="text-xs text-neutral-500">
                        Hub earnings = gross payout minus delivery partner payout.
                      </p>
                    </div>
                    <div className="flex items-end justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          set(
                            "deliveryPayoutRates",
                            payoutRates.filter((_, rateIndex) => rateIndex !== index),
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-xs text-neutral-500 dark:border-neutral-700">
              No delivery payout rates are configured. Successful deliveries will not earn a payout
              until a matching rule is added.
            </p>
          )}
        </section>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
            {error}
          </p>
        )}
        {success && (
          <p
            role="status"
            className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 sm:col-span-2"
          >
            {success}
          </p>
        )}
        <div className="flex justify-end sm:col-span-2">
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
