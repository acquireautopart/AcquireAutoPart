import { AlertTriangle } from "lucide-react";
import { Panel, PanelTitle } from "@/features/seller/shared/components/ui";

export function LowStockPanel({ products, onView }) {
  return (
    <Panel className="p-4 sm:p-5">
      <PanelTitle
        eyebrow="INVENTORY ALERT"
        title={
          <>
            <AlertTriangle size={17} className="text-brand" />
            Low stock
          </>
        }
        action={
          <button onClick={onView} className="text-[9px] font-bold hover:text-brand">
            Inventory →
          </button>
        }
      />
      <div className="mt-4 space-y-4">
        {products.slice(0, 5).map((p) => (
          <div key={p.id}>
            <div className="flex justify-between gap-2 text-[10px]">
              <strong className="truncate">{p.name}</strong>
              <b className="shrink-0 text-brand">{p.stock} left</b>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <i
                className="block h-full rounded-full bg-brand"
                style={{
                  width: `${Math.max(8, Math.min(100, (p.stock / Math.max(1, p.lowStockThreshold)) * 100))}%`,
                }}
              />
            </div>
            <p className="mt-1 text-[8px] text-neutral-400">
              {p.sku} · reorder at {p.lowStockThreshold}
            </p>
          </div>
        ))}
        {!products.length && (
          <p className="py-5 text-xs text-neutral-500">
            All products are above their low-stock threshold.
          </p>
        )}
      </div>
    </Panel>
  );
}
