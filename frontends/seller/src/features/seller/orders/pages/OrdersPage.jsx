"use client";

import { useEffect, useState } from "react";
import { PageHeading } from "@/features/seller/shared/components/ui";
import { OrdersSection } from "@/features/seller/orders/components";
import { ShipmentScanDialog } from "@/features/seller/orders/components/ShipmentScanDialog";

export function OrdersPage(props) {
  const { searchedOrders, currency, location, run, sellerApi, refresh, notify } = props;
  const [scanOpen, setScanOpen] = useState(false);
  const [hubs, setHubs] = useState([]);
  const [hubError, setHubError] = useState("");

  useEffect(() => {
    let active = true;
    sellerApi
      .hubs()
      .then((data) => active && setHubs(data.hubs || []))
      .catch((error) => active && setHubError(error.message));
    return () => {
      active = false;
    };
  }, [sellerApi]);

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
      <section className="mb-5 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="text-sm font-extrabold">Pickup hubs and in-charge contacts</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Add your pickup PIN code in Settings. Packed orders are sent to the hub that covers it.
        </p>
        {hubError && (
          <p role="alert" className="mt-3 text-xs text-red-600">
            {hubError}
          </p>
        )}
        {hubs.length ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {hubs.map((hub) => (
              <article key={hub.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                <h3 className="text-xs font-bold">{hub.name} · {hub.code}</h3>
                <p className="mt-1 text-xs text-neutral-500">
                  {[hub.address, hub.city, hub.district, hub.state, hub.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="mt-2 text-xs">
                  In-charge: <b>{hub.inCharge.name || "Not listed"}</b>
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-brand">
                  {hub.inCharge.phone && (
                    <>
                      <a href={`tel:${hub.inCharge.phone}`}>Call</a>
                      <a
                        href={`https://wa.me/${hub.inCharge.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    </>
                  )}
                  {hub.inCharge.email && (
                    <a href={`mailto:${hub.inCharge.email}`}>Email</a>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : !hubError ? (
          <p className="mt-3 text-xs text-neutral-500">No approved hubs are listed for your marketplace country yet.</p>
        ) : null}
      </section>
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
          onScan={async (scanToken, packageWeightGrams) => {
            const result = await sellerApi.scanOrder(
              scanToken,
              { ...location, label: "Seller facility" },
              packageWeightGrams,
            );
            await refresh();
            notify(`Package ${result.order.fulfillment.toLowerCase()}.`);
            return result.order;
          }}
        />
      )}
    </>
  );
}
