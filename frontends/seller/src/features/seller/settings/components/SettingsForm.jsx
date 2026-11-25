import { Check } from "lucide-react";
import { Button, Panel, Field } from "@/features/seller/shared/components/ui";

export function SettingsForm({ seller, onSubmit, busy }) {
  const s = seller.settings || {};

  return (
    <Panel className="p-5 sm:p-7">
      <form onSubmit={onSubmit} className="grid gap-x-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="font-display text-base font-extrabold">Store profile</h2>
        </div>
        <Field label="Owner name" name="name" defaultValue={seller.name} />
        <Field label="Store name" name="storeName" defaultValue={seller.storeName} />
        <div className="sm:col-span-2">
          <Field
            label="Pickup address"
            name="address"
            rows={3}
            defaultValue={seller.address || ""}
            placeholder="Street, area, city, state, PIN, landmark"
            hint="Where delivery partners pick up your parcels"
          />
        </div>
        <Field
          label="Pickup postal / PIN code"
          name="pickupPostalCode"
          defaultValue={seller.pickupPostalCode || ""}
          placeholder="Used to route Packed orders to a pickup hub"
        />
        <div className="mt-4">
          <span className="block text-xs font-bold text-neutral-600 dark:text-neutral-300">
            Marketplace country and currency
          </span>
          <span className="mt-1.5 block rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            {seller.country || "—"} · {s.currency || "USD"}
          </span>
        </div>
        <Field
          label="Low-stock alert at"
          name="lowStockThreshold"
          type="number"
          min="0"
          defaultValue={s.lowStockThreshold ?? 5}
        />
        <Field
          label="Processing time (days)"
          name="shippingDays"
          type="number"
          min="1"
          defaultValue={s.shippingDays ?? 3}
        />
        <Field
          label="Shipping fee"
          name="shippingFee"
          type="number"
          min="0"
          step=".01"
          defaultValue={s.shippingFee ?? 0}
        />
        <Field
          label="Tax rate (%)"
          name="taxRate"
          type="number"
          min="0"
          step=".01"
          defaultValue={s.taxRate ?? 0}
        />
        <Field
          label="Return window (days)"
          name="returnWindowDays"
          type="number"
          min="0"
          defaultValue={s.returnWindowDays ?? 30}
        />
        <div className="sm:col-span-2">
          <Field
            label="Return policy"
            name="returnPolicy"
            rows={4}
            defaultValue={s.returnPolicy || ""}
            placeholder="Describe your store's return terms"
          />
        </div>
        <div className="mt-5 space-y-3 sm:col-span-2">
          <h3 className="text-xs font-bold">In-app notifications</h3>
          {[
            ["notifyOrders", "New orders", s.notifications?.orders !== false],
            ["notifyInventory", "Low stock", s.notifications?.inventory !== false],
            ["notifyPayouts", "Payouts", s.notifications?.payouts !== false],
          ].map(([name, label, checked]) => (
            <label
              key={name}
              className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300"
            >
              <input
                type="checkbox"
                name={name}
                defaultChecked={checked}
                className="accent-brand"
              />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end border-t border-neutral-100 pt-4 dark:border-neutral-800 sm:col-span-2">
          <Button type="submit" variant="primary" disabled={busy}>
            <Check size={14} />
            {busy ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
