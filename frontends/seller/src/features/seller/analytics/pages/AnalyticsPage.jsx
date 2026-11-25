"use client";

import { PageHeading, Panel, PanelTitle } from "@/features/seller/shared/components/ui";
import { SalesChart, BestSellers } from "@/features/seller/dashboard/components";
import { money } from "@/features/seller/shared/components/utils";

export function AnalyticsPage(props) {
  const { sales, currency, range, setRange, dashboard, metrics } = props;
  return (
    <>
      <PageHeading title="Analytics" sub="Sales, traffic, conversion and product performance" />
      <SalesChart data={sales} currency={currency} range={range} setRange={setRange} />
      <BestSellers products={dashboard?.bestSellers || []} currency={currency} />
      <Panel className="p-5">
        <PanelTitle eyebrow="STORE FUNNEL" title="Traffic & conversion" />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Product views", metrics.productViews || 0],
            ["Orders", metrics.orders || 0],
            ["Conversion", `${metrics.conversionRate || 0}%`],
            ["Revenue", money(metrics.revenue, currency)],
          ].map(([a, b]) => (
            <div key={a} className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900">
              <span className="text-[10px] text-neutral-500">{a}</span>
              <strong className="mt-2 block text-lg">{b}</strong>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[9px] text-neutral-400">
          Views count seller catalogue impressions and product detail visits; conversion is orders
          divided by product views.
        </p>
      </Panel>
    </>
  );
}
