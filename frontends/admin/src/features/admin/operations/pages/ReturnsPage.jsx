"use client";

import { useEffect, useState } from "react";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import { ReturnsSection } from "@/features/admin/operations/components/ReturnsSection";
import { PageHeading } from "@/features/admin/shared/components/ui";
import { adminApi } from "@/features/admin/lib/adminApi";

export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);

  useEffect(() => {
    adminApi
      .returns()
      .then((data) => setReturns(data.returns || []))
      .catch(() => setReturns([]));
  }, []);

  async function handleUpdate(id, status) {
    try {
      await adminApi.updateReturn(id, status);
      const data = await adminApi.returns();
      setReturns(data.returns || []);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <AdminPageLayout activeSection="Disputes & returns">
      <PageHeading
        title="Disputes & returns"
        sub="Review customer return requests and their resolution status"
      />
      <ReturnsSection returns={returns} onUpdate={handleUpdate} />
    </AdminPageLayout>
  );
}
