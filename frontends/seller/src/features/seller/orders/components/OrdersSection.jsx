import { Panel, Status } from "@/features/seller/shared/components/ui";
import { money, shortDate } from "@/features/seller/shared/components/utils";
import { Empty } from "@/features/seller/shared/components/ui";
import { OrderReceiptButton } from "./OrderReceiptButton";

export function OrdersSection({ orders, currency, onUpdate }) {
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[950px] text-left text-xs">
        <thead className="bg-neutral-50 text-[9px] font-extrabold text-neutral-400 dark:bg-neutral-900">
          <tr>
            {[
              "ORDER",
              "CUSTOMER",
              "PARTS",
              "PAYMENT",
              "FULFILLMENT",
              "DATE",
              "UPDATE STATUS",
              "RECEIPT",
            ].map((x) => (
              <th key={x} className="px-4 py-3">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t border-neutral-100 dark:border-neutral-800">
              <td className="px-4 py-4 font-bold">#{o.code}</td>
              <td className="px-4 py-4">
                <strong className="block">{o.customer}</strong>
                <small className="text-neutral-400">{o.email}</small>
              </td>
              <td className="max-w-48 px-4 py-4">
                {o.items.map((i, index) => (
                  <div key={`${i.productId}-${index}`}>
                    {i.quantity} × {i.name}
                  </div>
                ))}
              </td>
              <td className="px-4 py-4">
                <Status value={o.paymentStatus} />
                <small className="mt-1 block text-neutral-400">{o.paymentMethod}</small>
              </td>
              <td className="px-4 py-4">
                <Status value={o.fulfillment} />
                {o.events?.length > 0 && (
                  <details className="mt-1 max-w-56">
                    <summary className="cursor-pointer text-[10px] font-semibold text-neutral-500">
                      {o.trackingStatus || "Shipment timeline"}
                    </summary>
                    <ol className="mt-2 space-y-2 border-l border-orange-200 pl-2">
                      {o.events.map((event, index) => (
                        <li key={`${event.status}-${event.occurredAt || index}`} className="text-[10px]">
                          <b className="block">{event.status}</b>
                          <span className="text-neutral-500">
                            {event.occurredAt
                              ? new Date(event.occurredAt).toLocaleString()
                              : "Update received"}
                            {event.location?.label ? ` · ${event.location.label}` : ""}
                          </span>
                          {event.location && (
                            <a
                              href={`https://www.google.com/maps?q=${event.location.latitude},${event.location.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="block font-semibold text-orange-700 underline"
                            >
                              View scan location
                            </a>
                          )}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </td>
              <td className="px-4 py-4 text-neutral-500">{shortDate(o.placedAt)}</td>
              <td className="px-4 py-4">
                <select
                  value={o.fulfillment}
                  disabled={["Delivered", "Cancelled"].includes(o.fulfillment)}
                  onChange={(e) => {
                    const value = e.target.value;
                    const carrier = value === "Shipped" ? window.prompt("Carrier (optional)", o.carrier || "") : "";
                    if (carrier === null) return;
                    const tracking = value === "Shipped" ? window.prompt("Tracking number (optional)", o.tracking || "") : "";
                    if (tracking === null) return;
                    const trackingUrl = value === "Shipped" ? window.prompt("Carrier tracking URL (optional)", o.trackingUrl || "") : "";
                    if (trackingUrl !== null) onUpdate(o.id, value, value === "Shipped" ? { carrier, tracking, trackingUrl } : {});
                  }}
                  className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[10px] dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <option value="New" disabled>
                    New
                  </option>
                  {o.fulfillment === "Delivered" && (
                    <option value="Delivered" disabled>
                      Delivered
                    </option>
                  )}
                  {["Packed", "Shipped", "Cancelled"].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-4">
                <OrderReceiptButton order={o} />
                {o.tracking && (
                  <small className="mt-1 block text-neutral-400">{o.carrier ? `${o.carrier}: ` : "Tracking: "}{o.tracking}</small>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!orders.length && <Empty text="No orders have been placed for your products yet." />}
    </Panel>
  );
}
