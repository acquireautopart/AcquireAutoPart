import { date } from "@/features/admin/shared/components/utils";
import { Empty, Panel, PanelTitle, Status } from "@/features/admin/shared/components/ui";

export function ReturnsSection({ returns, onUpdate }) {
  return (
    <Panel className="overflow-x-auto">
      <div className="p-4">
        <PanelTitle eyebrow="CUSTOMER DISPUTES" title="Disputes & returns" />
      </div>
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="bg-neutral-50 text-[9px] text-neutral-400 dark:bg-neutral-900">
          <tr>
            {[
              "REQUEST",
              "ORDER",
              "CUSTOMER",
              "ITEM",
              "REASON",
              "STATUS",
              "REQUESTED",
              "ACTION",
            ].map((x) => (
              <th key={x} className="px-4 py-3">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {returns.map((r) => (
            <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
              <td className="px-4 py-3 font-bold">{r.code}</td>
              <td className="px-4 py-3">{r.orderRef}</td>
              <td className="px-4 py-3">
                {r.customer}
                <small className="block text-[9px] text-neutral-400">{r.email}</small>
              </td>
              <td className="px-4 py-3">{r.item}</td>
              <td className="max-w-48 px-4 py-3 text-neutral-500">{r.reason}</td>
              <td className="px-4 py-3">
                <Status value={r.status} />
              </td>
              <td className="px-4 py-3 text-neutral-500">{date(r.requestedAt)}</td>
              <td className="px-4 py-3">
                <select
                  value={r.status}
                  disabled={["Refunded", "Rejected", "Cancelled"].includes(r.status)}
                  onChange={(e) => onUpdate(r.id, e.target.value)}
                  className="rounded border border-neutral-200 bg-transparent px-2 py-1 text-[10px] dark:border-neutral-700"
                >
                  <option value="Requested">Requested</option>
                  <option value="Approved">Approve</option>
                  <option value="In transit">In transit</option>
                  <option value="Rejected">Reject</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!returns.length && <Empty text="No return or dispute requests are open." />}
    </Panel>
  );
}
