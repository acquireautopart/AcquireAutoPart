"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import { Overview } from "@/features/admin/overview/components/Overview";
import { adminApi } from "@/features/admin/lib/adminApi";

const sectionSlugMap = {
  Overview: "overview",
  Customers: "customers",
  Sellers: "sellers",
  Products: "products",
  Orders: "orders",
  "Payments & payouts": "payments",
  "Disputes & returns": "returns",
  Reports: "reports",
  "Banners & content": "banners",
  Support: "support",
  "Audit log": "audit",
  Settings: "settings",
};

function toSlug(value) {
  return sectionSlugMap[value] || value.toLowerCase().replace(/\s+/g, "-");
}

export default function OverviewPage() {
  const router = useRouter();
  const [range, setRange] = useState(30);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    adminApi
      .dashboard(range)
      .then(setOverview)
      .catch(() => setOverview(null));
  }, [range]);

  return (
    <AdminPageLayout activeSection="Overview">
      <Overview
        data={overview}
        range={range}
        onRange={setRange}
        goTo={(section) => router.push(`/admin/${toSlug(section)}`)}
        onSellerStatus={() => router.push("/admin/sellers")}
      />
    </AdminPageLayout>
  );
}
