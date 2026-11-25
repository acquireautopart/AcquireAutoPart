"use client";

import { useEffect, useState } from "react";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import { SellersSection } from "@/features/admin/marketplace/components/SellersSection";
import { PageHeading } from "@/features/admin/shared/components/ui";
import { adminApi } from "@/features/admin/lib/adminApi";

export default function SellersPage() {
  const [query, setQuery] = useState("");
  const [sellers, setSellers] = useState([]);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  useEffect(() => {
    adminApi
      .sellers(query)
      .then((data) => setSellers(data.sellers || []))
      .catch(() => setSellers([]));
  }, [query]);

  async function act(action, message) {
    try {
      await action();
      const data = await adminApi.sellers(query);
      setSellers(data.sellers || []);
    } catch (error) {
      console.error(message, error);
    }
  }

  async function showDetails(id) {
    setDetails(null);
    setDetailsError("");
    setDetailsLoading(true);
    try {
      const data = await adminApi.sellerDetails(id);
      setDetails(data.seller);
    } catch (error) {
      setDetailsError(error.message);
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeDetails() {
    setDetails(null);
    setDetailsError("");
    setDetailsLoading(false);
  }

  return (
    <AdminPageLayout activeSection="Sellers">
      <PageHeading
        title="Sellers"
        sub="Review each private ID document before approving its seller"
      />
      <SellersSection
        sellers={sellers}
        search={query}
        setSearch={setQuery}
        onUpdate={(id, status) =>
          act(() => adminApi.updateSeller(id, status), `Seller ${status.toLowerCase()}`)
        }
        onDecision={(id, status) =>
          act(
            () => adminApi.reviewSellerVerification(id, status),
            `Seller identity ${status.toLowerCase()}`,
          )
        }
        onDetails={showDetails}
        onReview={async (id) => {
          try {
            const data = await adminApi.sellerVerification(id);
            if (!data.verification.documentUrl)
              throw new Error("This seller has not uploaded an ID document.");
            window.open(data.verification.documentUrl, "_blank", "noopener,noreferrer");
          } catch (error) {
            console.error(error);
          }
        }}
      />
      {(detailsLoading || detailsError || details) && (
        <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-details-title"
            className="my-8 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 text-neutral-900 shadow-xl dark:bg-neutral-900 dark:text-white"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-neutral-400">
                  CONFIDENTIAL SELLER RECORD
                </p>
                <h2 id="seller-details-title" className="mt-1 text-lg font-extrabold">
                  {details?.storeName || "Seller details"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                className="rounded-lg px-3 py-2 text-sm font-bold text-neutral-500"
              >
                Close
              </button>
            </div>
            {detailsLoading ? (
              <p role="status" className="mt-5 text-sm text-neutral-500">
                Loading seller details…
              </p>
            ) : detailsError ? (
              <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {detailsError}
              </p>
            ) : details ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                  <h3 className="text-sm font-bold">Profile and contact</h3>
                  <dl className="mt-3 grid gap-2 text-xs">
                    {[
                      ["Owner", details.name],
                      ["Email", details.email],
                      ["Phone", details.phone],
                      ["Store", details.storeName],
                      ["Address", details.address],
                      ["Pickup postal code", details.pickupPostalCode],
                      ["Country", details.country],
                      ["Tax ID", details.taxId],
                      ["Categories", details.sellCategories.join(", ")],
                      ["Account status", details.status],
                      ["Verified", details.verified ? "Yes" : "No"],
                      ["Stripe account ID", details.stripeAccountId],
                      ["Created", details.createdAt ? new Date(details.createdAt).toLocaleString() : ""],
                      ["Updated", details.updatedAt ? new Date(details.updatedAt).toLocaleString() : ""],
                    ].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[7rem_1fr] gap-2">
                        <dt className="font-semibold text-neutral-500">{label}</dt>
                        <dd className="break-words">{value || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
                <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                  <h3 className="text-sm font-bold">Identity and uploaded documents</h3>
                  <dl className="mt-3 grid gap-2 text-xs">
                    {[
                      ["Identity status", details.identityVerification.status],
                      ["Document type", details.identityVerification.documentType],
                      ["Document number", details.identityVerification.documentNumber],
                      ["Submitted", details.identityVerification.submittedAt ? new Date(details.identityVerification.submittedAt).toLocaleString() : ""],
                      ["Reviewed", details.identityVerification.reviewedAt ? new Date(details.identityVerification.reviewedAt).toLocaleString() : ""],
                      ["Reviewed by", details.identityVerification.reviewedBy],
                      ["Review note", details.identityVerification.reviewNote],
                      ["Signature status", details.identityVerification.signatureStatus],
                    ].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[7rem_1fr] gap-2">
                        <dt className="font-semibold text-neutral-500">{label}</dt>
                        <dd className="break-words">{value || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-orange-700">
                    {details.identityVerification.documentUrl && (
                      <a
                        href={details.identityVerification.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open identity document
                      </a>
                    )}
                    {details.identityVerification.signatureUrl && (
                      <a
                        href={details.identityVerification.signatureUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open signature document
                      </a>
                    )}
                    {!details.identityVerification.documentUrl &&
                      !details.identityVerification.signatureUrl &&
                      "No documents uploaded"}
                  </div>
                </section>
                <section className="rounded-xl border border-neutral-200 p-4 md:col-span-2 dark:border-neutral-700">
                  <h3 className="text-sm font-bold">Seller settings</h3>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs">
                    {JSON.stringify(details.settings, null, 2)}
                  </pre>
                </section>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </AdminPageLayout>
  );
}
