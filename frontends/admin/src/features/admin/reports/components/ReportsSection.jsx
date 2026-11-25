import { Download } from "lucide-react";
import { money } from "@/features/admin/shared/components/utils";
import { Button, Panel, PanelTitle } from "@/features/admin/shared/components/ui";

export function ReportsSection({ overview, payments }) {
  const rows = overview?.categories || [];
  const exportCsv = () => {
    const csv = [
      "Category,Sales,Share",
      ...rows.map((x) => `"${x.name}",${x.amount},${x.percent}%`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "acquireauto-marketplace-report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <div className="flex items-start justify-between gap-3">
          <PanelTitle eyebrow="PLATFORM PERFORMANCE" title="Marketplace reports" />
          <Button onClick={exportCsv}>
            <Download size={14} />
            Export categories CSV
          </Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900">
            <p className="text-[10px] text-neutral-500">Gross merchandise value</p>
            <b className="mt-2 block text-xl">{money(overview?.metrics?.grossSales)}</b>
          </div>
          <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900">
            <p className="text-[10px] text-neutral-500">Orders processed</p>
            <b className="mt-2 block text-xl">
              {(overview?.metrics?.orders || 0).toLocaleString()}
            </b>
          </div>
          <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900">
            <p className="text-[10px] text-neutral-500">Net buyer platform fees</p>
            <b className="mt-2 block text-xl">{money(payments?.estimatedCommission)}</b>
          </div>
        </div>
      </Panel>
      <Panel className="p-5">
        <PanelTitle title="Sales by category" />
        <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.map((row) => (
            <div key={row.name} className="flex items-center gap-4 py-3 text-xs">
              <b className="w-36">{row.name}</b>
              <div className="h-2 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
                <i
                  className="block h-full rounded-full bg-brand"
                  style={{ width: `${row.percent}%` }}
                />
              </div>
              <span className="w-12 text-right">{row.percent}%</span>
              <strong className="w-24 text-right">{money(row.amount)}</strong>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
