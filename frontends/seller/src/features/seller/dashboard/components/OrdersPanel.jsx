import { ArrowRight, ShoppingBag } from "lucide-react";
import { Panel, PanelTitle, Empty, Status } from "@/features/seller/shared/components/ui";
import { money, shortDate } from "@/features/seller/shared/components/utils";

export function OrdersPanel({ orders, currency, onView }) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between p-4 sm:px-5">
        <PanelTitle
          eyebrow="LATEST ACTIVITY"
          title={
            <>
              <ShoppingBag size={17} className="text-brand" />
              Recent orders
            </>
          }
        />
        <button
          onClick={onView}
          className="flex items-center gap-1 text-[10px] font-bold hover:text-brand"
        >
          View all <ArrowRight size={13} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-[10px]">
          <thead className="bg-neutral-50 text-[8px] font-extrabold tracking-wide text-neutral-400 dark:bg-neutral-900">
            <tr>
              <th className="px-5 py-2.5">ORDER</th>
              <th className="px-3 py-2.5">PART</th>
              <th className="px-3 py-2.5">TOTAL</th>
              <th className="px-3 py-2.5">STATUS</th>
              <th className="px-5 py-2.5 text-right">PAYMENT</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="px-5 py-3 font-bold">#{o.code}</td>
                <td className="max-w-[240px] px-3 py-3">
                  <strong className="block truncate">
                    {o.items.map((i) => i.name).join(", ")}
                  </strong>
                  <small className="text-neutral-400">
                    {o.customer} · {shortDate(o.placedAt)}
                  </small>
                </td>
                <td className="px-3 py-3 font-bold">
                  {money(
                    o.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
                    currency,
                  )}
                </td>
                <td className="px-3 py-3">
                  <Status value={o.fulfillment} />
                </td>
                <td className="px-5 py-3 text-right">
                  <Status value={o.paymentStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length && (
          <Empty text="Your orders will show here when a customer buys one of your products." />
        )}
      </div>
    </Panel>
  );
}
