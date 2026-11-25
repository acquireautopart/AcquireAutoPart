"use client";

import { useEffect, useState } from "react";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import { SellersSection } from "@/features/admin/marketplace/components/SellersSection";
import { PageHeading } from "@/features/admin/shared/components/ui";
import { adminApi } from "@/features/admin/lib/adminApi";

export default function SellersPage() {
  const [query, setQuery] = useState("");
  const [sellers, setSellers] = useState([]);

  useEffect(() => {
    adminApi
      .sellers(query)
      .then((data) => setSellers(data.sellers || []))
      .catch(() => setSellers([]));
  }, [query]);

  async function act(action, message) {
    try {
      await action();
      const data = await adminApi.sellers(query);
      setSellers(data.sellers || []);
    } catch (error) {
      console.error(message, error);
    }
  }

  return (
    <AdminPageLayout activeSection="Sellers">
      <PageHeading
        title="Sellers"
        sub="Review each private ID document before approving its seller"
      />
      <SellersSection
        sellers={sellers}
        search={query}
        setSearch={setQuery}
        onUpdate={(id, status) =>
          act(() => adminApi.updateSeller(id, status), `Seller ${status.toLowerCase()}`)
        }
        onDecision={(id, status) =>
          act(
            () => adminApi.reviewSellerVerification(id, status),
            `Seller identity ${status.toLowerCase()}`,
          )
        }
        onReview={async (id) => {
          try {
            const data = await adminApi.sellerVerification(id);
            if (!data.verification.documentUrl)
              throw new Error("This seller has not uploaded an ID document.");
            window.open(data.verification.documentUrl, "_blank", "noopener,noreferrer");
          } catch (error) {
            console.error(error);
          }
        }}
      />
    </AdminPageLayout>
  );
}
