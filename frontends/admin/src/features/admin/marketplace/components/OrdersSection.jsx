import { useMemo, useState } from "react";
import { date, money } from "@/features/admin/shared/components/utils";
import { Empty, Panel, PanelTitle, Status } from "@/features/admin/shared/components/ui";
import SearchBox from "@/features/admin/marketplace/components/SearchBox";

export function OrdersSection({ orders, search, setSearch }) {
  const [selected, setSelected] = useState(null);
  const filtered = useMemo(() => orders, [orders]);
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <PanelTitle eyebrow="MARKETPLACE ACTIVITY" title="Orders" />
        <SearchBox value={search} onChange={setSearch} placeholder="Search orders" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-xs">
          <thead className="bg-neutral-50 text-[9px] text-neutral-400 dark:bg-neutral-900">
            <tr>
              {["ORDER", "CUSTOMER", "ITEMS", "TOTAL", "PAYMENT", "STATUS", "DATE"].map((x) => (
                <th key={x} className="px-4 py-3">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr
                key={o.id}
                onClick={() => setSelected(selected === o.id ? null : o.id)}
                className="cursor-pointer border-t border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              >
                <td className="px-4 py-3 font-bold">#{o.code}</td>
                <td className="px-4 py-3">
                  {o.customer}
                  <small className="block text-[9px] text-neutral-400">{o.email}</small>
                </td>
                <td className="px-4 py-3">
                  {o.items.reduce((sum, i) => sum + i.quantity, 0)} items
                </td>
                <td className="px-4 py-3 font-bold">{money(o.total)}</td>
                <td className="px-4 py-3">
                  <Status
                    value={
                      o.payment?.paid
                        ? "Paid"
                        : o.payment?.method === "Cash on delivery"
                          ? "COD"
                          : "Pending"
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <Status value={o.status} />
                </td>
                <td className="px-4 py-3 text-neutral-500">{date(o.placedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {selected && (
          <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
            <h3 className="text-xs font-extrabold">
              Order #{orders.find((o) => o.id === selected)?.code} details
            </h3>
            <div className="mt-3 space-y-2">
              {orders
                .find((o) => o.id === selected)
                ?.items.map((item, i) => (
                  <p key={`${item.productId}-${i}`} className="flex justify-between text-xs">
                    <span>
                      {item.quantity} × {item.name}
                    </span>
                    <b>{money(item.price * item.quantity)}</b>
                  </p>
                ))}
            </div>
          </div>
        )}
        {!orders.length && <Empty text="No marketplace orders found." />}
      </div>
    </Panel>
  );
}
