import { money } from "@/features/admin/shared/components/utils";
import { Panel, PanelTitle } from "@/features/admin/shared/components/ui";

export function PaymentsSection({ data, onConfirmCod }) {
  const rows = [
    ["Paid order sales", money(data?.paidGross), `${data?.paidOrders || 0} paid orders`],
    [
      "Unpaid / COD",
      money(data?.pendingGross),
      `${data?.pendingOrders || 0} orders awaiting collection`,
    ],
    ["Refunds issued", money(data?.refunded), "Recorded refunds"],
    [
      "Net marketplace markup and fees",
      money(data?.estimatedCommission),
      "Category markup and legacy fees after refunds",
    ],
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map(([title, value, sub]) => (
          <Panel key={title} className="p-4">
            <p className="text-[10px] font-bold text-neutral-500">{title}</p>
            <strong className="mt-2 block font-display text-xl font-extrabold">{value}</strong>
            <p className="mt-1 text-[9px] text-neutral-400">{sub}</p>
          </Panel>
        ))}
      </div>
      <Panel className="p-5">
        <PanelTitle title="Payout integration" eyebrow="PAYMENTS & PAYOUTS" />
        <p className="mt-3 text-sm text-neutral-500">
          Seller payouts are currently estimates from marketplace orders. Bank transfer setup:{" "}
          <b className="text-brand">{data?.transfers || "Not connected"}</b>.
        </p>
        <p className="mt-2 text-xs text-neutral-400">
          Connect a payment provider and payout reconciliation service before sending real
          transfers.
        </p>
      </Panel>
      <Panel className="p-5">
        <PanelTitle title="COD remittances awaiting receipt" eyebrow="CASH ON DELIVERY" />
        <p className="mt-2 text-xs text-neutral-500">Confirm an order after remittance. Enter the net amount received and any courier fee withheld; together they must equal the full COD total.</p>
        <div className="mt-4 divide-y divide-neutral-100">
          {(data?.codOrders || []).map((order) => (
            <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <strong>{order.code}</strong>
                <p className="text-xs text-neutral-500">{money(order.expected, order.currency)} · placed {new Date(order.placedAt).toLocaleDateString()}</p>
              </div>
              <button type="button" onClick={() => onConfirmCod?.(order)} className="rounded-md bg-brand px-3 py-2 text-xs font-bold text-white">Confirm receipt</button>
            </div>
          ))}
          {!data?.codOrders?.length && <p className="py-3 text-sm text-neutral-500">No COD remittances are waiting for confirmation.</p>}
        </div>
      </Panel>
    </div>
  );
}
