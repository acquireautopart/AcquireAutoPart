import { Package } from "lucide-react";
import { Panel, PanelTitle } from "@/features/seller/shared/components/ui";

export function Pipeline({ orders, onView }) {
  const values = ["New", "Packed", "Shipped", "Delivered"].map((status) => [
    status,
    orders.filter((o) => o.fulfillment === status).length,
  ]);
  const total = values.reduce((n, [, count]) => n + count, 0);
  const colors = { New: "#60a5fa", Packed: "#fb923c", Shipped: "#ff6b00", Delivered: "#4ade80" };

  return (
    <Panel className="p-5">
      <PanelTitle
        eyebrow="FULFILLMENT"
        title={
          <>
            <Package size={17} className="text-brand" />
            Order pipeline
          </>
        }
        action={
          <button onClick={onView} className="text-[9px] font-bold hover:text-brand">
            View all →
          </button>
        }
      />
      <strong className="mt-4 block font-display text-3xl font-extrabold">{total}</strong>
      <p className="text-[10px] text-neutral-400">orders in progress this month</p>
      <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        {values.map(([status, n]) => (
          <i
            key={status}
            style={{ width: `${total ? (n / total) * 100 : 0}%`, background: colors[status] }}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2">
        {values.map(([status, n]) => (
          <div key={status} className="flex items-center gap-2 text-xs text-neutral-500">
            <i className="h-2.5 w-2.5 rounded-full" style={{ background: colors[status] }} />
            {status}
            <b className="ml-auto text-neutral-900 dark:text-white">{n}</b>
          </div>
        ))}
      </div>
    </Panel>
  );
}
