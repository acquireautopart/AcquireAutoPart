"use client";

import { useEffect, useState } from "react";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import { SupportSection } from "@/features/admin/operations/components/SupportSection";
import { PageHeading } from "@/features/admin/shared/components/ui";
import { adminApi } from "@/features/admin/lib/adminApi";

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    adminApi
      .tickets()
      .then((data) => setTickets(data.tickets || []))
      .catch(() => setTickets([]));
  }, []);

  async function handleUpdate(id, status) {
    try {
      await adminApi.updateTicket(id, status);
      const data = await adminApi.tickets();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <AdminPageLayout activeSection="Support">
      <PageHeading title="Support" sub="Customer service queue and ticket status" />
      <SupportSection tickets={tickets} onUpdate={handleUpdate} />
    </AdminPageLayout>
  );
}
