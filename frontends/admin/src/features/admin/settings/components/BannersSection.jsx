"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Panel, PanelTitle } from "@/features/admin/shared/components/ui";

export function BannersSection({ settings, onSave, busy }) {
  const [form, setForm] = useState(settings || {});
  useEffect(() => setForm(settings || {}), [settings]);
  const banners = form.banners || [];

  function updateBanners(nextBanners) {
    setForm((previous) => ({ ...previous, banners: nextBanners }));
  }

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-3">
        <PanelTitle eyebrow="STOREFRONT CONTENT" title="Announcements & banners" />
        <Button
          onClick={() => updateBanners([...banners, { title: "", message: "", active: true }])}
        >
          <Plus size={13} /> Add banner
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {banners.map((banner, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800 sm:grid-cols-[1fr_1.5fr_auto_auto]"
          >
            <input
              value={banner.title || ""}
              onChange={(e) =>
                updateBanners(
                  banners.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, title: e.target.value } : item,
                  ),
                )
              }
              placeholder="Banner title"
              className="h-9 rounded-md border border-neutral-200 bg-transparent px-2 text-xs dark:border-neutral-700"
            />
            <input
              value={banner.message || ""}
              onChange={(e) =>
                updateBanners(
                  banners.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, message: e.target.value } : item,
                  ),
                )
              }
              placeholder="Announcement text"
              className="h-9 rounded-md border border-neutral-200 bg-transparent px-2 text-xs dark:border-neutral-700"
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={banner.active !== false}
                onChange={(e) =>
                  updateBanners(
                    banners.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, active: e.target.checked } : item,
                    ),
                  )
                }
                className="accent-brand"
              />
              Active
            </label>
            <button
              type="button"
              aria-label="Remove banner"
              onClick={() => updateBanners(banners.filter((_, itemIndex) => itemIndex !== index))}
              className="p-2 text-neutral-400 hover:text-red-600"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {!banners.length && (
          <p className="py-5 text-center text-xs text-neutral-400">
            No storefront banners configured.
          </p>
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="primary" disabled={busy} onClick={() => onSave(form)}>
          {busy ? "Saving…" : "Save banners"}
        </Button>
      </div>
    </Panel>
  );
}
