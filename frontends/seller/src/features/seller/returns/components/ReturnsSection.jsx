import { Panel, Status, Empty } from "@/features/seller/shared/components/ui";
import { money, shortDate } from "@/features/seller/shared/components/utils";

function getStatusChoices(entry) {
  if (entry.type === "Replacement") {
    if (entry.status === "Requested") return ["Approved", "Rejected"];
    if (entry.status === "Approved") return ["Replacement Shipped"];
    return [];
  }
  if (entry.status === "Requested") return ["Approved", "Rejected"];
  if (entry.status === "In transit") return ["Refunded"];
  return [];
}

export function ReturnsSection({ returns, onUpdate }) {
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-xs">
        <thead className="bg-neutral-50 text-[9px] font-extrabold text-neutral-400 dark:bg-neutral-900">
          <tr>
            {["REQUEST", "CUSTOMER", "ITEM", "REASON", "REQUESTED", "STATUS", "REVIEW"].map((x) => (
              <th key={x} className="px-4 py-3">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {returns.map((r) => (
            <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
              <td className="px-4 py-4 font-bold">
                {r.code}
                <small className="mt-1 block font-semibold text-orange-700">
                  {r.type || "Return"}
                </small>
                <small className="mt-1 block font-normal text-neutral-400">
                  Order {r.orderRef}
                </small>
              </td>
              <td className="px-4 py-4">
                {r.customer}
                <small className="mt-1 block text-neutral-400">{r.email}</small>
              </td>
              <td className="px-4 py-4">{r.item}</td>
              <td className="max-w-40 px-4 py-4 text-neutral-500">{r.reason}</td>
              <td className="px-4 py-4">{shortDate(r.requestedAt)}</td>
              <td className="px-4 py-4">
                <Status value={r.status} />
                <small className="mt-1 block text-neutral-500">
                  Shipment: {r.trackingStatus || r.status}
                </small>
                {r.events?.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[10px] font-semibold text-neutral-500">
                      Scan history
                    </summary>
                    <ol className="mt-2 space-y-2">
                      {r.events.map((event, index) => (
                        <li key={`${event.status}-${event.occurredAt || index}`} className="text-[10px]">
                          <b>{event.status}</b>
                          <span className="block text-neutral-500">
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
                              className="font-semibold text-orange-700 underline"
                            >
                              View scan location
                            </a>
                          )}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
                {r.refund > 0 && (
                  <small className="mt-1 block text-emerald-600">{money(r.refund)} refunded</small>
                )}
              </td>
              <td className="px-4 py-4">
                <select
                  value={r.status}
                  disabled={getStatusChoices(r).length === 0}
                  onChange={(e) => {
                    const status = e.target.value;
                    if (
                      status === "Refunded" &&
                      r.type !== "Replacement" &&
                      !window.confirm("Issue a wallet refund for this order line?")
                    )
                      return;
                    onUpdate(r.id, status);
                  }}
                  className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[10px] dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <option>{r.status}</option>
                  {getStatusChoices(r).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!returns.length && <Empty text="No return requests have been made for your products." />}
    </Panel>
  );
}
