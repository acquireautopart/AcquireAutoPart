"use client";

import { useEffect, useState } from "react";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import { ProductsSection } from "@/features/admin/marketplace/components/ProductsSection";
import { PageHeading } from "@/features/admin/shared/components/ui";
import { adminApi } from "@/features/admin/lib/adminApi";

export default function ProductsPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);

  useEffect(() => {
    adminApi
      .products(query)
      .then((data) => setProducts(data.products || []))
      .catch(() => setProducts([]));
  }, [query]);

  async function handleModerate(id, action) {
    try {
      await adminApi.moderateProduct(id, action);
      const data = await adminApi.products(query);
      setProducts(data.products || []);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <AdminPageLayout activeSection="Products">
      <PageHeading title="Products" sub="Review, flag or hide seller marketplace listings" />
      <ProductsSection
        products={products}
        search={query}
        setSearch={setQuery}
        onModerate={handleModerate}
      />
    </AdminPageLayout>
  );
}
