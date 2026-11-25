"use client";

import { useEffect, useState } from "react";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import { ProductsSection } from "@/features/admin/marketplace/components/ProductsSection";
import { PageHeading } from "@/features/admin/shared/components/ui";
import { adminApi } from "@/features/admin/lib/adminApi";

export default function ProductsPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setError("");
    adminApi
      .products(query)
      .then((data) => {
        if (active) setProducts(data.products || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });
    return () => {
      active = false;
    };
  }, [query]);

  async function refreshProducts() {
    const data = await adminApi.products(query);
    setProducts(data.products || []);
  }

  async function handleModerate(id, action) {
    try {
      await adminApi.moderateProduct(id, action);
      await refreshProducts();
      setError("");
      setNotice("Product listing updated.");
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function handleDelete(id) {
    try {
      await adminApi.deleteProduct(id);
      await refreshProducts();
      setError("");
      setNotice("Product deleted. Order records were kept.");
      return true;
    } catch (deleteError) {
      setError(deleteError.message);
      return false;
    }
  }

  async function handleDeleteMany(ids) {
    try {
      const result = await adminApi.deleteProducts(ids);
      await refreshProducts();
      setError("");
      setNotice(`${result.deletedCount} product(s) deleted. Order records were kept.`);
      return true;
    } catch (deleteError) {
      setError(deleteError.message);
      return false;
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
        onDelete={handleDelete}
        onDeleteMany={handleDeleteMany}
        error={error}
        notice={notice}
      />
    </AdminPageLayout>
  );
}
