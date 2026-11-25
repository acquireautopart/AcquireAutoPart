import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  Check,
  CircleHelp,
  CreditCard,
  Flag,
  Package,
  Percent,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { ago, money } from "@/features/admin/shared/components/utils";
import { Button, Empty, Panel, PanelTitle, Status } from "@/features/admin/shared/components/ui";

function SalesChart({ data = [], range, onRange, total }) {
  const rows = data.slice(-range);
  const max = Math.max(1, ...rows.map((r) => r.amount));
  const points = rows
    .map(
      (r, i) =>
        `${rows.length < 2 ? 0 : (i * 700) / (rows.length - 1)},${160 - (r.amount / max) * 145}`,
    )
    .join(" ");
  const path = rows.length ? `M${points.replaceAll(" ", " L")}` : "";
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelTitle eyebrow="MARKETPLACE PERFORMANCE" title="Gross sales" icon={BarChart3} />
        <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-900">
          {[
            [7, "7 days"],
            [30, "30 days"],
            [90, "90 days"],
          ].map(([d, label]) => (
            <button
              key={d}
              onClick={() => onRange(d)}
              className={`rounded-md px-3 py-1.5 text-[10px] font-bold ${range === d ? "bg-brand text-white" : "text-neutral-500"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-5 font-display text-3xl font-extrabold">{money(total)}</p>
      <p className="mt-1 text-[10px] text-neutral-400">Last {range} days, all sellers</p>
      <div className="mt-5 flex h-56 gap-3">
        <div className="flex flex-col justify-between pb-6 text-[9px] text-neutral-400">
          <span>{money(max)}</span>
          <span>{money(max * 0.66)}</span>
          <span>{money(max * 0.33)}</span>
          <span>$0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-0 bottom-6 flex flex-col justify-between">
            {[0, 1, 2, 3].map((i) => (
              <i
                key={i}
                className="border-t border-dashed border-neutral-200 dark:border-neutral-800"
              />
            ))}
          </div>
          {path && (
            <svg
              viewBox="0 0 700 170"
              preserveAspectRatio="none"
              className="absolute inset-0 h-[calc(100%-24px)] w-full"
            >
              <defs>
                <linearGradient id="admin-sales-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ff6b00" stopOpacity=".28" />
                  <stop offset="100%" stopColor="#ff6b00" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${path} L700 170 L0 170 Z`} fill="url(#admin-sales-fill)" />
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
            <span>{rows[0]?.date || ""}</span>
            <span>{rows[Math.floor(rows.length / 2)]?.date || ""}</span>
            <span>{rows.at(-1)?.date || ""}</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function Overview({ data, range, onRange, goTo, onSellerStatus }) {
  const m = data?.metrics || {};
  const cards = [
    [
      "Gross sales (GMV)",
      money(m.grossSales),
      BadgeDollarSign,
      `${m.changePercent >= 0 ? "+" : ""}${m.changePercent || 0}% vs previous`,
      true,
    ],
    ["Orders", (m.orders || 0).toLocaleString(), ShoppingBag, "All marketplace orders"],
    ["Platform revenue", money(m.commissionEarned), Percent, "Category markup and fees, net of refunds"],
    ["Customers", (m.customers || 0).toLocaleString(), Users, "Registered accounts"],
    [
      "Active sellers",
      (m.activeSellers || 0).toLocaleString(),
      Store,
      `${m.awaitingApproval || 0} awaiting approval`,
    ],
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[9px] font-extrabold tracking-[.15em] text-neutral-400">
            ADMIN CONSOLE
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight">
            Marketplace overview
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            A live view of platform sales, sellers and customer operations.
          </p>
        </div>
        <div className="flex rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-[#111]">
          {[
            [7, "7 days"],
            [30, "30 days"],
            [90, "90 days"],
          ].map(([d, label]) => (
            <button
              key={d}
              onClick={() => onRange(d)}
              className={`rounded-md px-3 py-2 text-xs font-bold ${range === d ? "bg-brand text-white" : "text-neutral-500"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [m.awaitingApproval || 0, "seller applications", "Sellers", Store],
          [m.openDisputes || 0, "open disputes", "Disputes & returns", ShieldCheck],
          [m.flaggedListings || 0, "flagged listings", "Products", Flag],
          [m.supportTickets || 0, "support tickets", "Support", CircleHelp],
        ].map(([count, label, dest, Icon]) => (
          <button
            key={label}
            onClick={() => goTo(dest)}
            className="flex min-h-12 items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 text-left text-xs font-bold hover:border-orange-300 dark:border-neutral-800 dark:bg-[#111]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-orange-100 text-brand dark:bg-orange-950/50">
              <Icon size={15} />
            </span>
            {count} {label}
            <ArrowRight size={14} className="ml-auto text-neutral-400" />
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([title, value, Icon, note, positive]) => (
          <Panel key={title} className="p-4">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold text-neutral-500">{title}</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-50 text-brand dark:bg-orange-950/50">
                <Icon size={16} />
              </span>
            </div>
            <strong className="mt-3 block font-display text-xl font-extrabold">{value}</strong>
            <p
              className={`mt-1 text-[9px] ${positive ? "font-bold text-emerald-600" : "text-neutral-400"}`}
            >
              {note}
            </p>
          </Panel>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.85fr)]">
        <SalesChart data={data?.sales} range={range} onRange={onRange} total={m.grossSales} />
        <Panel className="p-5">
          <PanelTitle
            eyebrow="REVIEW QUEUE"
            title="Seller approvals"
            icon={Users}
            action={
              <button onClick={() => goTo("Sellers")} className="text-[10px] font-bold">
                All sellers →
              </button>
            }
          />
          <div className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
            {(data?.sellerApprovals || []).map((s) => (
              <div key={s.id} className="py-3">
                <div className="flex justify-between gap-2">
                  <strong className="text-xs">{s.storeName}</strong>
                  <small className="text-[9px] text-neutral-400">{ago(s.appliedAt)}</small>
                </div>
                <p className="mt-1 text-[10px] text-neutral-500">
                  {s.name} · {s.email}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="primary" onClick={() => onSellerStatus(s.id, "Approved")}>
                    <Check size={12} />
                    Approve
                  </Button>
                  <Button onClick={() => onSellerStatus(s.id, "Rejected")}>Reject</Button>
                  <button onClick={() => goTo("Sellers")} className="ml-auto text-[10px] font-bold">
                    Review
                  </button>
                </div>
              </div>
            ))}
            {!data?.sellerApprovals?.length && (
              <Empty text="No seller applications waiting for review." />
            )}
          </div>
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-5">
          <PanelTitle
            eyebrow="MARKETPLACE LEADERS"
            title="Top sellers"
            icon={Store}
            action={
              <button onClick={() => goTo("Sellers")} className="text-[10px] font-bold">
                View all →
              </button>
            }
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead className="text-[9px] text-neutral-400">
                <tr>
                  <th className="pb-3">SELLER</th>
                  <th className="pb-3">ORDERS</th>
                  <th className="pb-3 text-right">GMV</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topSellers || []).map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="py-3 font-bold">{s.name}</td>
                    <td>{s.orders}</td>
                    <td className="text-right font-bold">{money(s.gmv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.topSellers?.length && <Empty text="Sales by seller will appear here." />}
          </div>
        </Panel>
        <Panel className="p-5">
          <PanelTitle
            eyebrow="ADMIN ACTIONS"
            title="Recent activity"
            icon={Activity}
            action={
              <button onClick={() => goTo("Audit log")} className="text-[10px] font-bold">
                Audit log →
              </button>
            }
          />
          <div className="mt-3 space-y-4">
            {(data?.recentActivity || []).map((item, i) => (
              <div key={item.id} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-50 text-brand dark:bg-orange-950/50">
                  {i % 2 ? <Flag size={14} /> : <Activity size={14} />}
                </span>
                <div>
                  <p className="text-[10px] font-bold">{item.action}</p>
                  <p className="mt-1 text-[9px] text-neutral-400">{ago(item.createdAt)}</p>
                </div>
              </div>
            ))}
            {!data?.recentActivity?.length && <Empty text="Admin actions will appear here." />}
          </div>
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-5">
          <PanelTitle title="Sales by category" icon={BarChart3} />
          <div className="mt-5 space-y-4">
            {(data?.categories || []).map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-[10px] font-bold">
                  <span>{c.name}</span>
                  <span>{c.percent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <i
                    className="block h-full rounded-full bg-brand"
                    style={{ width: `${c.percent}%` }}
                  />
                </div>
              </div>
            ))}
            {!data?.categories?.length && (
              <Empty text="Category sales will appear after marketplace orders." />
            )}
          </div>
        </Panel>
        <Panel className="p-5">
          <PanelTitle title="System health" icon={Activity} />
          <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
            {Object.entries(data?.system || {}).map(([name, status]) => (
              <div key={name} className="flex items-center justify-between py-3">
                <span className="text-xs font-bold capitalize">
                  {name.replace(/([A-Z])/g, " $1")}
                </span>
                <Status value={status} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[9px] text-neutral-400">
            External payment and messaging providers require configuration before their status can
            be monitored.
          </p>
        </Panel>
      </div>
    </div>
  );
}
