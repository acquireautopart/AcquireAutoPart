"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { money } from "@/features/admin/shared/components/utils";
import { Empty, Panel, PanelTitle, Status } from "@/features/admin/shared/components/ui";
import SearchBox from "@/features/admin/marketplace/components/SearchBox";

export function ProductsSection({
  products,
  search,
  setSearch,
  onModerate,
  onDelete,
  onDeleteMany,
  error,
  notice,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  useEffect(() => {
    const visibleIds = new Set(products.map((product) => product.id));
    setSelectedIds((current) =>
      current.filter((productId) => visibleIds.has(productId)),
    );
  }, [products]);
  const allSelected =
    products.length > 0 &&
    products.every((product) => selectedIds.includes(product.id));

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <PanelTitle eyebrow="MARKETPLACE MODERATION" title="Products" />
        <div className="flex flex-wrap items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${selectedIds.length} selected listing(s)? They will be removed from the marketplace; order records will be kept.`,
                  )
                ) {
                  onDeleteMany(selectedIds);
                }
              }}
              className="flex items-center gap-1 rounded-md bg-red-50 px-3 py-2 text-[10px] font-bold text-red-600 hover:bg-red-100 dark:bg-red-950/40"
            >
              <Trash2 size={13} /> Delete selected ({selectedIds.length})
            </button>
          )}
          <SearchBox value={search} onChange={setSearch} placeholder="Search listings" />
        </div>
      </div>
      {(error || notice) && (
        <p
          role={error ? "alert" : "status"}
          className={`px-4 pb-3 text-xs ${error ? "text-red-600" : "text-green-700"}`}
        >
          {error || notice}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-neutral-50 text-[9px] text-neutral-400 dark:bg-neutral-900">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all visible listings"
                  checked={allSelected}
                  onChange={(event) =>
                    setSelectedIds(
                      event.target.checked
                        ? products.map((product) => product.id)
                        : [],
                    )
                  }
                />
              </th>
              {["LISTING", "SELLER", "CATEGORY", "PRICE", "STOCK", "STATUS", "MODERATION", "ACTIONS"].map(
                (x) => (
                  <th key={x} className="px-4 py-3">
                    {x}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${p.name}`}
                    checked={selectedIds.includes(p.id)}
                    onChange={(event) =>
                      setSelectedIds((current) =>
                        event.target.checked
                          ? [...current, p.id]
                          : current.filter((id) => id !== p.id),
                      )
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <b>{p.name}</b>
                  <small className="mt-1 block text-[9px] text-neutral-400">{p.sku}</small>
                </td>
                <td className="px-4 py-3">{p.seller}</td>
                <td className="px-4 py-3">{p.category}</td>
                <td className="px-4 py-3">{money(p.price)}</td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3">
                  <Status value={p.status} />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={
                      p.moderationStatus === "Flagged"
                        ? "Flagged"
                        : p.moderationStatus === "Hidden"
                          ? "Hidden"
                          : "Clear"
                    }
                    onChange={(e) => onModerate(p.id, e.target.value)}
                    className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[10px] dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <option>Clear</option>
                    <option>Flagged</option>
                    <option>Hidden</option>
                    <option value="Active">Re-activate</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete ${p.name}? It will be removed from the marketplace; order records will be kept.`,
                        )
                      ) {
                        onDelete(p.id);
                      }
                    }}
                    aria-label={`Delete ${p.name}`}
                    className="rounded-md p-2 text-neutral-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!products.length && <Empty text="No product listings found." />}
      </div>
    </Panel>
  );
}
