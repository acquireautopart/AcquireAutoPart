"use client";

import { useEffect, useState } from "react";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import { OrdersSection } from "@/features/admin/marketplace/components/OrdersSection";
import { PageHeading } from "@/features/admin/shared/components/ui";
import { adminApi } from "@/features/admin/lib/adminApi";

export default function OrdersPage() {
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    adminApi
      .orders(query)
      .then((data) => setOrders(data.orders || []))
      .catch(() => setOrders([]));
  }, [query]);

  return (
    <AdminPageLayout activeSection="Orders">
      <PageHeading title="Orders" sub="Marketplace-wide order and payment status" />
      <OrdersSection orders={orders} search={query} setSearch={setQuery} />
    </AdminPageLayout>
  );
}
