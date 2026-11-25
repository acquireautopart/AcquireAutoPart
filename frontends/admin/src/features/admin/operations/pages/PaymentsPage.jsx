"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import { PaymentsSection } from "@/features/admin/operations/components/PaymentsSection";
import { PageHeading } from "@/features/admin/shared/components/ui";
import { adminApi } from "@/features/admin/lib/adminApi";

export default function PaymentsPage() {
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState("");

  const loadPayments = useCallback(async () => {
    try {
      setPayments(await adminApi.payments());
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  async function confirmCod(order) {
    const receivedText = window.prompt(
      `Net amount remitted to the platform for ${order.code} (${order.currency}):`,
      String(order.expected),
    );
    if (receivedText === null) return;
    const carrierFeeText = window.prompt(
      `Courier/COD fee withheld for ${order.code} (${order.currency}):`,
      "0",
    );
    if (carrierFeeText === null) return;
    const received = Number(receivedText);
    const carrierFee = Number(carrierFeeText);
    if (!Number.isFinite(received) || !Number.isFinite(carrierFee)) {
      setError("Enter valid remitted and courier fee amounts.");
      return;
    }
    if (!window.confirm(`Record ${received} remitted plus ${carrierFee} courier fee as the full ${order.expected} ${order.currency} COD for ${order.code}?`)) return;
    try {
      await adminApi.recordCodCollection(order.id, received, carrierFee);
      await loadPayments();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  return (
    <AdminPageLayout activeSection="Payments & payouts">
      <PageHeading
        title="Payments & payouts"
        sub="Payment totals, buyer platform fees, and COD settlement"
      />
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <PaymentsSection data={payments} onConfirmCod={confirmCod} />
    </AdminPageLayout>
  );
}
