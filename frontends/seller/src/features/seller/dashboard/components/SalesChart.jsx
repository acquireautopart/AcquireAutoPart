import { Panel, PanelTitle } from "@/features/seller/shared/components/ui";
import { money, shortDate, cx } from "@/features/seller/shared/components/utils";

export function SalesChart({ data = [], currency, range, setRange }) {
  const visible = data.slice(-range);
  const max = Math.max(100, ...visible.map((d) => d.amount));
  const points = visible
    .map(
      (d, i) =>
        `${visible.length <= 1 ? 0 : (i * 700) / (visible.length - 1)},${145 - (d.amount / max) * 125}`,
    )
    .join(" ");
  const path = visible.length ? `M${points.replaceAll(" ", " L")}` : "";
  const area = visible.length ? `${path} L700 150 L0 150 Z` : "";
  const total = visible.reduce((sum, d) => sum + d.amount, 0);

  return (
    <Panel className="p-5">
      <PanelTitle
        eyebrow="STORE PERFORMANCE"
        title="Sales"
        action={
          <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-900">
            {[
              [7, "7 days"],
              [30, "30 days"],
              [90, "90 days"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setRange(value)}
                className={cx(
                  "rounded-md px-2.5 py-1.5 text-[10px] font-bold",
                  range === value
                    ? "bg-brand text-white"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      <div className="mt-4 flex items-baseline gap-2">
        <strong className="font-display text-2xl font-extrabold">{money(total, currency)}</strong>
        <span className="text-[10px] text-neutral-400">last {range} days</span>
      </div>
      <div className="mt-4 flex h-44 gap-3">
        <div className="flex flex-col justify-between pb-5 text-[9px] text-neutral-400">
          <span>{money(max, currency)}</span>
          <span>{money(max * 0.66, currency)}</span>
          <span>{money(max * 0.33, currency)}</span>
          <span>$0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-0 bottom-5 flex flex-col justify-between">
            {[0, 1, 2, 3].map((i) => (
              <i
                key={i}
                className="border-t border-dashed border-neutral-200 dark:border-neutral-800"
              />
            ))}
          </div>
          {visible.length > 0 && (
            <svg
              viewBox="0 0 700 150"
              preserveAspectRatio="none"
              className="absolute inset-0 h-[calc(100%-20px)] w-full overflow-visible"
            >
              <defs>
                <linearGradient id="seller-sales-gradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ff6b00" stopOpacity=".25" />
                  <stop offset="100%" stopColor="#ff6b00" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={area} fill="url(#seller-sales-gradient)" />
              <path
                d={path}
                fill="none"
                stroke="#ff6b00"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[8px] text-neutral-400">
            <span>{visible[0]?.date ? shortDate(visible[0].date) : "—"}</span>
            <span>
              {visible[Math.floor(visible.length / 2)]?.date
                ? shortDate(visible[Math.floor(visible.length / 2)].date)
                : ""}
            </span>
            <span>{visible.at(-1)?.date ? shortDate(visible.at(-1).date) : "—"}</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
