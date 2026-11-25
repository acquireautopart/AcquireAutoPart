"use client";

import {
  Activity,
  ArrowRight,
  Boxes,
  Check,
  CreditCard,
  Plus,
  ShoppingBag,
  Tag,
  Truck,
} from "lucide-react";
import { Button, Panel, PanelTitle, Icon } from "@/features/seller/shared/components/ui";
import {
  SalesChart,
  OrdersPanel,
  LowStockPanel,
  BestSellers,
  Pipeline,
} from "@/features/seller/dashboard/components";
import { money, cx } from "@/features/seller/shared/components/utils";

export function DashboardPage(props) {
  const {
    seller,
    store,
    metrics,
    currency,
    setEditing,
    setModal,
    setPage,
    metricCard,
    sales,
    range,
    setRange,
    payouts,
    searchedOrders,
    dashboard,
    orders,
  } = props;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[9px] font-extrabold tracking-[.15em] text-neutral-400">
            ● &nbsp;
            {new Intl.DateTimeFormat("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            })
              .format(new Date())
              .toUpperCase()}
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-[30px]">
            Welcome back, {seller.name?.split(" ")[0]}
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            {store}
            <span className="ml-2 inline-flex items-center gap-1 font-bold text-brand">
              <Check size={13} /> {seller.verified ? "Verified seller" : "Seller account"}
            </span>
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModal("product");
          }}
          variant="primary"
          className="min-h-10 px-4"
        >
          <Plus size={16} /> Add part
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          [
            metrics.pendingOrders || 0,
            "orders to pack",
            "Orders",
            "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
          ],
          [
            metrics.returns || 0,
            "return requests",
            "Returns",
            "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
          ],
          [
            metrics.lowStockCount || 0,
            "parts low on stock",
            "Inventory",
            "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
          ],
        ].map(([count, label, dest, color]) => (
          <button
            key={label}
            onClick={() => setPage(dest)}
            className="flex min-h-[54px] flex-1 items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 text-left text-xs font-bold text-neutral-700 hover:border-orange-300 dark:border-neutral-800 dark:bg-[#111] dark:text-neutral-200 sm:max-w-[300px]"
          >
            <span className={cx("grid h-8 w-8 place-items-center rounded-full", color)}>
              {count}
            </span>
            {label}
            <ArrowRight size={15} className="ml-auto text-neutral-400" />
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metricCard(
          "Today's sales",
          money(metrics.todayRevenue, currency),
          <CreditCard size={17} />,
          `${metrics.todayOrders || 0} orders today`,
          true,
        )}
        {metricCard(
          "Orders today",
          metrics.todayOrders || 0,
          <ShoppingBag size={17} />,
          `${metrics.pendingOrders || 0} still to fulfill`,
        )}
        {metricCard(
          "Average order value",
          money(metrics.averageOrderValue, currency),
          <Activity size={17} />,
          "Across your orders",
        )}
        {metricCard(
          "Pending orders",
          metrics.pendingOrders || 0,
          <Truck size={17} />,
          `${metrics.activeListings || 0} active listings`,
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[9px] font-extrabold tracking-[.12em] text-neutral-400">
          QUICK ACTIONS
        </span>
        <Button onClick={() => setPage("Orders")}>
          <Truck size={14} /> Manage orders
        </Button>
        <Button onClick={() => setPage("Inventory")}>
          <Boxes size={14} /> Update stock
        </Button>
        <Button onClick={() => setModal("discount")}>
          <Tag size={14} /> Create discount
        </Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
        <SalesChart data={sales} currency={currency} range={range} setRange={setRange} />
        <Panel className="bg-gradient-to-br from-white to-orange-50 p-5 dark:from-[#111] dark:to-[#211006]">
          <PanelTitle eyebrow="SELLER PAYOUT" title="Estimated next payout" />
          <strong className="mt-5 block font-display text-3xl font-extrabold">
            {money(payouts?.available || 0, currency)}
          </strong>
          <p className="mt-2 text-[10px] text-neutral-500">
            Available balance · schedule pending provider setup
          </p>
          <div className="my-5 space-y-3 border-y border-neutral-200 py-4 text-xs dark:border-neutral-800">
            <div className="flex justify-between text-neutral-500">
              <span>Paid orders on hold</span>
              <b className="text-neutral-800 dark:text-neutral-200">
                {money(payouts?.onHold || 0, currency)}
              </b>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>Legacy seller fees</span>
              <b className="text-neutral-800 dark:text-neutral-200">
                {money(payouts?.fees || 0, currency)}
                {" · historical checkout fees"}
              </b>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>Refunds</span>
              <b className="text-neutral-800 dark:text-neutral-200">
                {money(payouts?.refunds || 0, currency)}
              </b>
            </div>
          </div>
          <Button className="w-full" onClick={() => setPage("Payouts")}>
            View payouts <ArrowRight size={14} />
          </Button>
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
        <OrdersPanel
          orders={searchedOrders.slice(0, 5)}
          currency={currency}
          onView={() => setPage("Orders")}
        />
        <LowStockPanel
          products={dashboard?.lowStockProducts || []}
          onView={() => setPage("Inventory")}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <BestSellers
          products={dashboard?.bestSellers || []}
          currency={currency}
          onView={() => setPage("Analytics")}
        />
        <Pipeline orders={orders} onView={() => setPage("Orders")} />
      </div>
    </>
  );
}
