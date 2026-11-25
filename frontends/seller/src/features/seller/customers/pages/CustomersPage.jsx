"use client";

import { PageHeading } from "@/features/seller/shared/components/ui";
import { CustomersSection } from "@/features/seller/customers/components/CustomersSection";

export function CustomersPage(props) {
  const { customerMap, currency } = props;
  return (
    <>
      <PageHeading
        title="Customers"
        sub={`${customerMap.length} customers who ordered from your store`}
      />
      <CustomersSection customers={customerMap} currency={currency} />
    </>
  );
}
