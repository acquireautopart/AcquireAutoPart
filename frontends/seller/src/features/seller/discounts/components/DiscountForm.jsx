import { Modal, Field } from "@/features/seller/shared/components/ui";

export function DiscountForm({ busy, onClose, onSubmit }) {
  return (
    <Modal title="Create discount" onClose={onClose} onSubmit={onSubmit} busy={busy}>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Coupon code" name="code" required placeholder="FALL15" />
        <label className="mt-4 block text-xs font-bold text-neutral-600 dark:text-neutral-300">
          Discount type
          <select
            name="type"
            className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </label>
        <Field label="Discount value" name="value" type="number" min=".01" step=".01" required />
        <Field
          label="Usage limit"
          name="usageLimit"
          type="number"
          min="0"
          defaultValue="0"
          hint="0 = unlimited"
        />
        <Field label="End date" name="endsAt" type="date" />
      </div>
    </Modal>
  );
}
