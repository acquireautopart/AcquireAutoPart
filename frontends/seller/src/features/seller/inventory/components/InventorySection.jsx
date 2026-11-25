import { Panel, Empty, Status } from "@/features/seller/shared/components/ui";
import { money } from "@/features/seller/shared/components/utils";

export function InventorySection({ products, currency, onAdjust }) {
  const rows = products.flatMap((p) =>
    p.variants?.length
      ? p.variants.map((v) => ({
          ...p,
          name: `${p.name} · ${v.name}`,
          sku: v.sku || p.sku,
          price: v.price,
          stock: v.stock,
          variantId: v._id,
        }))
      : [p],
  );

  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-xs">
          <thead className="bg-neutral-50 text-[9px] font-extrabold text-neutral-400 dark:bg-neutral-900">
            <tr>
              <th className="px-5 py-3">PART / VARIANT</th>
              <th className="px-3 py-3">ON HAND</th>
              <th className="px-3 py-3">THRESHOLD</th>
              <th className="px-3 py-3">STOCK STATUS</th>
              <th className="px-5 py-3 text-right">ADJUST STOCK</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={`${p.id}-${p.variantId || "base"}`}
                className="border-t border-neutral-100 dark:border-neutral-800"
              >
                <td className="px-5 py-4">
                  <strong>{p.name}</strong>
                  <small className="mt-1 block text-[9px] text-neutral-400">
                    {p.sku} · {money(p.price, currency)}
                  </small>
                </td>
                <td className="px-3 py-4 font-bold">{p.stock}</td>
                <td className="px-3 py-4 text-neutral-500">{p.lowStockThreshold}</td>
                <td className="px-3 py-4">
                  {p.stock === 0 ? (
                    <Status value="Cancelled" />
                  ) : p.stock <= p.lowStockThreshold ? (
                    <Status value="Packed" />
                  ) : (
                    <Status value="Active" />
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => onAdjust(p, -1)}
                      disabled={!p.stock}
                      className="grid h-8 w-8 place-items-center rounded-md border border-neutral-200 disabled:opacity-40 dark:border-neutral-700"
                    >
                      −
                    </button>
                    <button
                      onClick={() => onAdjust(p, 1)}
                      className="grid h-8 w-8 place-items-center rounded-md border border-neutral-200 dark:border-neutral-700"
                    >
                      +
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!products.length && <Empty text="Add products to manage their inventory." />}
      </div>
    </Panel>
  );
}
