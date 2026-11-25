"use client";

import { useEffect, useState } from "react";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import { ReportsSection } from "@/features/admin/reports/components/ReportsSection";
import { PageHeading } from "@/features/admin/shared/components/ui";
import { adminApi } from "@/features/admin/lib/adminApi";

export default function ReportsPage() {
  const [overview, setOverview] = useState(null);
  const [payments, setPayments] = useState(null);

  useEffect(() => {
    Promise.all([adminApi.dashboard(30), adminApi.payments()])
      .then(([dashboard, paymentData]) => {
        setOverview(dashboard);
        setPayments(paymentData);
      })
      .catch(() => {
        setOverview(null);
        setPayments(null);
      });
  }, []);

  return (
    <AdminPageLayout activeSection="Reports">
      <PageHeading title="Reports" sub="Marketplace sales and category performance" />
      <ReportsSection overview={overview} payments={payments} />
    </AdminPageLayout>
  );
}
