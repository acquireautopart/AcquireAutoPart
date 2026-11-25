import { Boxes } from "lucide-react";
import { Panel, PanelTitle } from "@/features/seller/shared/components/ui";
import { money } from "@/features/seller/shared/components/utils";

export function BestSellers({ products, currency, onView }) {
  const max = Math.max(1, ...products.map((p) => p.soldCount || 0));

  return (
    <Panel className="p-5">
      <PanelTitle
        eyebrow="TOP PERFORMERS"
        title={
          <>
            <Boxes size={17} className="text-brand" />
            Best sellers
          </>
        }
        action={
          onView && (
            <button onClick={onView} className="text-[9px] font-bold hover:text-brand">
              Analytics →
            </button>
          )
        }
      />
      <div className="mt-4 space-y-4">
        {products.map((p) => (
          <div key={p.id}>
            <div className="flex justify-between gap-2 text-[10px]">
              <strong className="truncate">{p.name}</strong>
              <b>{money(p.price * (p.soldCount || 0), currency)}</b>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-1.5 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
                <i
                  className="block h-full rounded-full bg-brand"
                  style={{ width: `${Math.max(5, (p.soldCount / max) * 100)}%` }}
                />
              </div>
              <small className="w-12 text-right text-neutral-400">{p.soldCount || 0} sold</small>
            </div>
          </div>
        ))}
        {!products.length && (
          <p className="py-5 text-xs text-neutral-500">
            Sales rankings appear after your first orders.
          </p>
        )}
      </div>
    </Panel>
  );
}
