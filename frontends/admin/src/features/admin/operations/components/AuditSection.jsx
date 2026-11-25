import { date } from "@/features/admin/shared/components/utils";
import { Empty, Panel, PanelTitle } from "@/features/admin/shared/components/ui";

export function AuditSection({ entries }) {
  return (
    <Panel className="overflow-hidden">
      <div className="p-4">
        <PanelTitle eyebrow="SECURITY & COMPLIANCE" title="Audit log" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-neutral-50 text-[9px] text-neutral-400 dark:bg-neutral-900">
            <tr>
              {["ACTION", "SUMMARY", "ENTITY", "ADMIN", "DATE"].map((x) => (
                <th key={x} className="px-4 py-3">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="px-4 py-3 font-bold">{e.action}</td>
                <td className="px-4 py-3">{e.summary}</td>
                <td className="px-4 py-3 text-neutral-500">
                  {e.entityType} {e.entityId}
                </td>
                <td className="px-4 py-3">{e.adminEmail}</td>
                <td className="px-4 py-3 text-neutral-500">{date(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!entries.length && <Empty text="Admin changes will be recorded here." />}
      </div>
    </Panel>
  );
}
