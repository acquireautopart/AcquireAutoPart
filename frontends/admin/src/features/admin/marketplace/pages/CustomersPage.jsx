"use client";

import { useEffect, useState } from "react";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import { CustomersSection } from "@/features/admin/marketplace/components/CustomersSection";
import { PageHeading } from "@/features/admin/shared/components/ui";
import { adminApi } from "@/features/admin/lib/adminApi";

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    adminApi
      .customers(query)
      .then((data) => setCustomers(data.customers || []))
      .catch(() => setCustomers([]));
  }, [query]);

  return (
    <AdminPageLayout activeSection="Customers">
      <PageHeading title="Customers" sub="Customer accounts and marketplace order history" />
      <CustomersSection customers={customers} search={query} setSearch={setQuery} />
    </AdminPageLayout>
  );
}
