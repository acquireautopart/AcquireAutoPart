"use client";

import { PageHeading } from "@/features/seller/shared/components/ui";
import { ReturnsSection } from "@/features/seller/returns/components/ReturnsSection";

export function ReturnsPage(props) {
  const { returns, run, sellerApi } = props;
  return (
    <>
      <PageHeading title="Returns" sub={`${returns.length} return requests for your products`} />
      <ReturnsSection
        returns={returns}
        onUpdate={(id, status) =>
          run(() => sellerApi.updateReturn(id, status), "Return request updated")
        }
      />
    </>
  );
}
