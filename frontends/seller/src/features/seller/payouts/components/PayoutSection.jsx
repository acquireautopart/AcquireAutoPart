import { Activity, ArrowDownRight, CreditCard, Wallet } from "lucide-react";
import { Panel, PanelTitle, Empty } from "@/features/seller/shared/components/ui";
import { money, shortDate } from "@/features/seller/shared/components/utils";

export function PayoutSection({ data, currency }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Gross paid sales", data?.gross || 0, Wallet],
          ["Eligible seller proceeds", data?.available || 0, CreditCard],
          ["On hold until delivery", data?.onHold || 0, Activity],
          ["Refunds issued", data?.refunds || 0, ArrowDownRight],
          ["Legacy seller fees", data?.fees || 0, Activity],
        ].map(([label, value, IconComp]) => (
          <Panel key={label} className="p-5">
            <p className="flex items-center gap-2 text-xs text-neutral-500">
              <IconComp size={15} className="text-brand" />
              {label}
            </p>
            <strong className="mt-3 block font-display text-2xl font-extrabold">
              {money(value, currency)}
            </strong>
            {label === "Legacy seller fees" && (
              <small className="mt-1 block text-[9px] text-neutral-400">
                Historical fees from orders using the previous checkout policy
              </small>
            )}
          </Panel>
        ))}
      </div>
      <Panel className="overflow-hidden">
        <div className="p-5">
          <PanelTitle eyebrow="PAYOUT HISTORY" title="Recent payouts" />
        </div>
        <div className="border-t border-neutral-100 dark:border-neutral-800">
          {data?.history?.length ? (
            data.history.map((p) => (
              <div
                key={p.id}
                className="flex justify-between border-b border-neutral-100 px-5 py-4 text-xs dark:border-neutral-800"
              >
                <span>
                  {shortDate(p.date)} · {p.status}
                </span>
                <b>{money(p.amount, currency)}</b>
              </div>
            ))
          ) : (
            <Empty text="Stripe payouts will appear here after an order is delivered." />
          )}
        </div>
      </Panel>
    </>
  );
}
