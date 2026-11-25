"use client";

import { useEffect, useState } from "react";
import { Package, Pencil, Search, Trash2 } from "lucide-react";
import { Panel, Empty, Status } from "@/features/seller/shared/components/ui";
import { money, cx } from "@/features/seller/shared/components/utils";
import { getImageUrl } from "@/features/storefront/lib/imageUrl";

export function ProductSection({
  products,
  currency,
  filter,
  setFilter,
  query,
  setQuery,
  onEdit,
  onDelete,
  onDeleteMany,
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-4 dark:border-neutral-800">
        <div className="flex gap-2">
          {["All", "Active", "Draft", "Archived", "Low stock"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cx(
                "rounded-md px-3 py-2 text-[10px] font-bold",
                filter === f
                  ? "bg-orange-50 text-brand dark:bg-orange-950/50"
                  : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Remove ${selectedIds.length} selected product(s) from your catalogue? Order records will be kept.`,
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
          <label className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search catalogue"
              className="h-9 w-48 rounded-lg border border-neutral-200 bg-transparent pl-9 pr-3 text-xs outline-none dark:border-neutral-700"
            />
          </label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-neutral-50 text-[9px] font-extrabold tracking-wide text-neutral-400 dark:bg-neutral-900">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all visible products"
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
              <th className="px-5 py-3">PRODUCT</th>
              <th className="px-3 py-3">STATUS</th>
              <th className="px-3 py-3">INVENTORY</th>
              <th className="px-3 py-3">PRICE</th>
              <th className="px-3 py-3">VARIANTS</th>
              <th className="px-5 py-3 text-right">ACTIONS</th>
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
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                      {p.images?.[0] ? (
                        <img
                          src={getImageUrl(p.images[0], { width: 160, quality: 75 })}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package size={18} className="text-neutral-400" />
                      )}
                    </span>
                    <span>
                      <strong className="block">{p.name}</strong>
                      <small className="mt-1 block text-[9px] text-neutral-400">
                        {p.sku} · {p.fitment || p.category}
                      </small>
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <Status value={p.status} />
                </td>
                <td className="px-3 py-3">
                  <span
                    className={p.stock <= p.lowStockThreshold ? "font-bold text-orange-600" : ""}
                  >
                    {p.stock} in stock
                  </span>
                </td>
                <td className="px-3 py-3 font-bold">{money(p.price, currency)}</td>
                <td className="px-3 py-3 text-neutral-500">{p.variants?.length || 0}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => onEdit(p)}
                      aria-label="Edit product"
                      className="rounded-md p-2 text-neutral-500 hover:bg-orange-50 hover:text-brand"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(p)}
                      aria-label="Delete product"
                      className="rounded-md p-2 text-neutral-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!products.length && (
          <Empty text="No products match this view. Add a product to start your catalogue." />
        )}
      </div>
    </Panel>
  );
}
