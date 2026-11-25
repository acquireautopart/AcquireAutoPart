import { Fragment, useState } from "react";
import { Empty, Panel, Status } from "@/features/seller/shared/components/ui";
import { money, shortDate } from "@/features/seller/shared/components/utils";

export function CustomersSection({ customers, currency }) {
  const [expanded, setExpanded] = useState("");

  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[650px] text-left text-xs">
        <thead className="bg-neutral-50 text-[9px] font-extrabold text-neutral-400 dark:bg-neutral-900">
          <tr>
            {["CUSTOMER", "ORDERS", "TOTAL SPENT", "LAST ORDER", "HISTORY"].map((x) => (
              <th key={x} className="px-5 py-3">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <Fragment key={c.email}>
              <tr className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="px-5 py-4">
                  <strong className="block">{c.name}</strong>
                  <small className="text-neutral-400">{c.email}</small>
                </td>
                <td className="px-5 py-4">{c.orders}</td>
                <td className="px-5 py-4 font-bold">{money(c.spend, currency)}</td>
                <td className="px-5 py-4 text-neutral-500">{shortDate(c.last)}</td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => setExpanded(expanded === c.email ? "" : c.email)}
                    className="font-bold text-brand"
                  >
                    {expanded === c.email ? "Hide" : "View orders"}
                  </button>
                </td>
              </tr>
              {expanded === c.email && (
                <tr className="bg-neutral-50 dark:bg-neutral-900">
                  <td colSpan="5" className="px-5 py-4">
                    <div className="space-y-2">
                      {c.orderHistory.map((order) => (
                        <div
                          key={order.id}
                          className="flex flex-wrap items-center gap-2 text-[10px]"
                        >
                          <b>#{order.code}</b>
                          <span className="text-neutral-500">
                            {order.items
                              .map((item) => `${item.quantity} × ${item.name}`)
                              .join(", ")}
                          </span>
                          <Status value={order.fulfillment} />
                          <strong className="ml-auto">
                            {money(
                              order.items.reduce(
                                (sum, item) => sum + item.price * item.quantity,
                                0,
                              ),
                              currency,
                            )}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      {!customers.length && (
        <Empty text="Customers appear after they place an order for your products." />
      )}
    </Panel>
  );
}
