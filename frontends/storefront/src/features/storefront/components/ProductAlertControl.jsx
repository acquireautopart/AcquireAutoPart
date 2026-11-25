"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { requestCurrentCustomer, requestCustomerAuthDialog } from "@/lib/authApi";
import { profileApi } from "@/features/storefront/lib/profileApi";

export default function ProductAlertControl({ product }) {
  const [customer, setCustomer] = useState(null);
  const [alert, setAlert] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    requestCurrentCustomer({ signal: controller.signal })
      .then((session) => {
        if (controller.signal.aborted) return null;
        setCustomer(session?.customer || null);
        return session?.customer ? profileApi.productAlerts(product.id, { signal: controller.signal }) : null;
      })
      .then((result) => { if (!controller.signal.aborted) setAlert(result?.alerts?.[0] || null); })
      .catch((error) => { if (error.status !== 401 && error.name !== "AbortError") setMessage(error.message); });
    return () => controller.abort();
  }, [product.id]);

  async function toggleAlert() {
    if (!customer) {
      requestCustomerAuthDialog();
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (alert?.active) {
        await profileApi.removeProductAlert(alert.id);
        setAlert(null);
        setMessage("Price and stock alerts removed.");
      } else {
        await profileApi.createProductAlert({ productId: product.id, targetPrice: product.price, notifyPriceDrop: true, notifyRestock: true });
        const result = await profileApi.productAlerts(product.id);
        setAlert(result.alerts?.[0] || null);
        setMessage("We’ll alert you when the price drops or stock returns.");
      }
    } catch (error) {
      if (error.status === 401) requestCustomerAuthDialog();
      else setMessage(error.message || "Could not update this alert.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-[#e5e5e2] bg-white p-3">
      <button type="button" onClick={toggleAlert} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-md border border-[#d5d9d9] px-3 py-2 text-xs font-bold text-[#292b27] hover:border-[#e9562e] disabled:opacity-60">
        {alert?.active ? <BellOff size={15} /> : <Bell size={15} />}
        {busy ? "Saving…" : alert?.active ? "Stop price & stock alerts" : "Track price & stock"}
      </button>
      {alert && !alert.active && alert.lastEvent && <p className="mt-2 text-center text-[10px] text-emerald-700">{alert.lastEvent === "restocked" ? "This item was restocked." : "This item’s price dropped."}</p>}
      {message && <p className="mt-2 text-center text-[10px] text-[#686b65]" role="status">{message}</p>}
      <p className="mt-2 text-center text-[9px] leading-4 text-[#777a73]">Alerts are saved to your account. Email delivery requires Resend configuration.</p>
    </section>
  );
}
