import { Panel, Empty, Status } from "@/features/seller/shared/components/ui";
import { money, shortDate } from "@/features/seller/shared/components/utils";

export function DiscountSection({ discounts, onToggle, onDelete }) {
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[650px] text-left text-xs">
        <thead className="bg-neutral-50 text-[9px] font-extrabold text-neutral-400 dark:bg-neutral-900">
          <tr>
            {["CODE", "OFFER", "USAGE", "ENDS", "STATUS", "ACTIONS"].map((x) => (
              <th key={x} className="px-5 py-3">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {discounts.map((d) => (
            <tr key={d.id} className="border-t border-neutral-100 dark:border-neutral-800">
              <td className="px-5 py-4 font-mono font-bold">{d.code}</td>
              <td className="px-5 py-4">
                {d.value}
                {d.type === "percentage" ? "% off" : " off"}
              </td>
              <td className="px-5 py-4">
                {d.uses}
                {d.usageLimit ? ` / ${d.usageLimit}` : " uses"}
              </td>
              <td className="px-5 py-4">{shortDate(d.endsAt)}</td>
              <td className="px-5 py-4">
                <Status value={d.active ? "Active" : "Archived"} />
              </td>
              <td className="px-5 py-4">
                <button onClick={() => onToggle(d)} className="mr-3 text-brand">
                  {d.active ? "Pause" : "Activate"}
                </button>
                <button onClick={() => onDelete(d)} className="text-red-500">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!discounts.length && (
        <Empty text="No discounts yet. Create a coupon to promote your products." />
      )}
    </Panel>
  );
}
