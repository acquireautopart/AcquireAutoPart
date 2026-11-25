"use client";

import { PageHeading } from "@/features/seller/shared/components/ui";
import { InventorySection } from "@/features/seller/inventory/components/InventorySection";

export function InventoryPage(props) {
  const { products, currency, run, sellerApi } = props;
  return (
    <>
      <PageHeading title="Inventory" sub="Stock levels, thresholds and restocking" />
      <InventorySection
        products={products}
        currency={currency}
        onAdjust={(p, delta) =>
          run(() => sellerApi.adjustStock(p.id, delta, p.variantId), "Inventory updated")
        }
      />
    </>
  );
}
