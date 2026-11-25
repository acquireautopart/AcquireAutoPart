"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PageHeading } from "@/features/seller/shared/components/ui";
import { PayoutSection } from "@/features/seller/payouts/components/PayoutSection";
import { Button, Panel } from "@/features/seller/shared/components/ui";
import { sellerApi } from "@/features/seller/lib/sellerApi";

export function PayoutsPage(props) {
  const { payouts, currency } = props;
  const [connectStatus, setConnectStatus] = useState(null);
  const [connectError, setConnectError] = useState("");
  const [connectBusy, setConnectBusy] = useState(false);

  useEffect(() => {
    let active = true;
    sellerApi
      .stripeConnectStatus()
      .then((status) => {
        if (active) setConnectStatus(status);
      })
      .catch((error) => {
        if (active) setConnectError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);

  async function connectStripe() {
    setConnectBusy(true);
    setConnectError("");
    try {
      const { url } = await sellerApi.createStripeConnectLink();
      window.location.assign(url);
    } catch (error) {
      setConnectError(error.message);
      setConnectBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        title="Payments & payouts"
        sub="Your available balance, holds and payout history"
      />
      <Panel className="mb-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-brand dark:bg-orange-950/50">
            {connectStatus?.ready ? (
              <CheckCircle2 size={19} />
            ) : (
              <span className="text-sm font-black">S</span>
            )}
          </span>
          <div>
            <h2 className="text-sm font-extrabold">Stripe seller payouts</h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-neutral-500">
              {connectStatus?.ready
                ? "Your Stripe account is ready to receive marketplace payouts."
                : connectStatus?.connected
                  ? "Finish Stripe verification to receive automatic payouts."
                  : "Connect Stripe and complete verification before selling and receiving payouts."}
            </p>
            {connectError && (
              <p className="mt-2 text-xs font-semibold text-red-600" role="alert">
                {connectError}
              </p>
            )}
          </div>
        </div>
        {!connectStatus?.ready && (
          <Button
            variant="primary"
            className="shrink-0"
            onClick={connectStripe}
            disabled={connectBusy}
          >
            {connectBusy && <Loader2 size={14} className="animate-spin" />}
            {connectStatus?.connected ? "Continue setup" : "Connect Stripe"}
          </Button>
        )}
      </Panel>
      <PayoutSection data={payouts} currency={currency} />
    </>
  );
}
