import { date } from "@/features/admin/shared/components/utils";
import { Empty, Panel, PanelTitle, Status } from "@/features/admin/shared/components/ui";

export function SupportSection({ tickets, onUpdate }) {
  return (
    <Panel className="overflow-hidden">
      <div className="p-4">
        <PanelTitle eyebrow="CUSTOMER CARE" title="Support tickets" />
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {tickets.map((t) => (
          <article key={t.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <strong className="text-sm">{t.subject}</strong>
                <p className="mt-1 text-[10px] text-neutral-500">
                  {t.reference} · {t.customer} · {t.email} {t.orderRef && `· Order ${t.orderRef}`}
                </p>
              </div>
              <Status value={t.status} />
            </div>
            <p className="mt-3 max-w-4xl whitespace-pre-wrap text-xs leading-5 text-neutral-600 dark:text-neutral-300">
              {t.message}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <small className="text-[9px] text-neutral-400">{date(t.createdAt)}</small>
              <select
                value={t.status}
                onChange={(e) => onUpdate(t.id, e.target.value)}
                className="rounded border border-neutral-200 bg-transparent px-2 py-1 text-[10px] dark:border-neutral-700"
              >
                <option>Open</option>
                <option>In progress</option>
                <option>Resolved</option>
              </select>
            </div>
          </article>
        ))}
        {!tickets.length && <Empty text="No support tickets have been submitted." />}
      </div>
    </Panel>
  );
}
