"use client";

import { Plus } from "lucide-react";
import { Button, PageHeading } from "@/features/seller/shared/components/ui";
import { DiscountSection } from "@/features/seller/discounts/components/DiscountSection";

export function DiscountsPage(props) {
  const { setModal, discounts, run, sellerApi } = props;
  return (
    <>
      <PageHeading
        title="Discounts"
        sub="Coupons and sale campaigns"
        action={
          <Button variant="primary" onClick={() => setModal("discount")}>
            <Plus size={15} /> Create discount
          </Button>
        }
      />
      <DiscountSection
        discounts={discounts}
        onToggle={(d) =>
          run(() => sellerApi.updateDiscount(d.id, { active: !d.active }), "Discount updated")
        }
        onDelete={(d) =>
          window.confirm(`Delete coupon ${d.code}?`) &&
          run(() => sellerApi.deleteDiscount(d.id), "Discount deleted")
        }
      />
    </>
  );
}
