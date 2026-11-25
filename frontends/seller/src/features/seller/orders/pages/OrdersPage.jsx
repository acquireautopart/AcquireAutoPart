"use client";

import { useState } from "react";
import { PageHeading } from "@/features/seller/shared/components/ui";
import { OrdersSection } from "@/features/seller/orders/components";
import { ShipmentScanDialog } from "@/features/seller/orders/components/ShipmentScanDialog";

export function OrdersPage(props) {
  const { searchedOrders, currency, location, run, sellerApi, refresh, notify } = props;
  const [scanOpen, setScanOpen] = useState(false);
  return (
    <>
      <PageHeading
        title="Orders"
        sub={`${searchedOrders.length} orders for your products`}
        action={
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="h-9 rounded-lg bg-brand px-3 text-xs font-bold text-white"
          >
            Scan package
          </button>
        }
      />
      <OrdersSection
        orders={searchedOrders}
        currency={currency}
        onUpdate={(id, fulfillment, shipment) =>
          run(
            () =>
              sellerApi.updateOrder(id, {
                fulfillment,
                ...shipment,
                location: { ...location, label: "Seller facility" },
              }),
            "Order updated",
          )
        }
      />
      {scanOpen && (
        <ShipmentScanDialog
          onClose={() => setScanOpen(false)}
          onScan={async (scanToken) => {
            const result = await sellerApi.scanOrder(scanToken, {
              ...location,
              label: "Seller facility",
            });
            await refresh();
            notify(`Package ${result.order.fulfillment.toLowerCase()}.`);
            return result.order;
          }}
        />
      )}
    </>
  );
}
