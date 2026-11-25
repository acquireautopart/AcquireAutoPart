"use client";

import { Plus, Upload } from "lucide-react";
import { Button, PageHeading } from "@/features/seller/shared/components/ui";
import { ProductSection } from "@/features/seller/products/components";

export function ProductsPage(props) {
  const {
    products,
    filteredProducts,
    currency,
    filter,
    setFilter,
    query,
    setQuery,
    setEditing,
    setModal,
    onImport,
    run,
    sellerApi,
  } = props;
  return (
    <>
      <PageHeading
        title="Products"
        sub={`${products.length} products in your catalogue`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={onImport}>
              <Upload size={15} /> Import file
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setModal("product");
              }}
            >
              <Plus size={15} /> Add product
            </Button>
          </div>
        }
      />
      <ProductSection
        products={filteredProducts}
        currency={currency}
        filter={filter}
        setFilter={setFilter}
        query={query}
        setQuery={setQuery}
        onEdit={(p) => {
          setEditing(p);
          setModal("product");
        }}
        onDelete={(p) =>
          window.confirm(`Delete ${p.name}? This cannot be undone.`) &&
          run(() => sellerApi.deleteProduct(p.id), "Product deleted")
        }
      />
    </>
  );
}
