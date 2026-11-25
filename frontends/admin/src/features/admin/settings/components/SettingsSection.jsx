"use client";

import { useEffect, useState } from "react";
import { Button, Panel, PanelTitle } from "@/features/admin/shared/components/ui";

export function SettingsSection({ settings, onSave, busy, error, success }) {
  const [form, setForm] = useState(settings || {});
  useEffect(() => {
    const visibleSettings = { ...(settings || {}) };
    delete visibleSettings.platformFeeRate;
    setForm(visibleSettings);
  }, [settings]);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
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
