"use client";

import { useEffect, useState } from "react";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import { AuditSection } from "@/features/admin/operations/components/AuditSection";
import { PageHeading } from "@/features/admin/shared/components/ui";
import { adminApi } from "@/features/admin/lib/adminApi";

export default function AuditPage() {
  const [audit, setAudit] = useState([]);

  useEffect(() => {
    adminApi
      .audit()
      .then((data) => setAudit(data.entries || []))
      .catch(() => setAudit([]));
  }, []);

  return (
    <AdminPageLayout activeSection="Audit log">
      <PageHeading title="Audit log" sub="Administrator actions recorded for review" />
      <AuditSection entries={audit} />
    </AdminPageLayout>
  );
}
