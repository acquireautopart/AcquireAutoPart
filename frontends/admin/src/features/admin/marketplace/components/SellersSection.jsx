import { Store } from "lucide-react";
import { date } from "@/features/admin/shared/components/utils";
import { Button, Empty, Panel, PanelTitle, Status } from "@/features/admin/shared/components/ui";
import SearchBox from "@/features/admin/marketplace/components/SearchBox";

export function SellersSection({
  sellers,
  search,
  setSearch,
  onUpdate,
  onReview,
  onDecision,
  onDetails,
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <PanelTitle eyebrow="SELLER MANAGEMENT" title="Sellers" icon={Store} />
        <SearchBox value={search} onChange={setSearch} placeholder="Search sellers" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-xs">
          <thead className="bg-neutral-50 text-[9px] text-neutral-400 dark:bg-neutral-900">
            <tr>
              {[
                "STORE",
                "OWNER",
                "EMAIL",
                "COUNTRY",
                "ID DOCUMENT",
                "STATUS",
                "JOINED",
                "ACTIONS",
              ].map((x) => (
                <th key={x} className="px-4 py-3">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sellers.map((s) => (
              <tr key={s.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="px-4 py-3 font-bold">{s.storeName}</td>
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3 text-neutral-500">{s.email}</td>
                <td className="px-4 py-3">
                  {s.country || "—"} · {s.currency || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="block">{s.documentType || "Not submitted"}</span>
                  <small className="text-neutral-400">{s.verificationStatus}</small>
                  {s.documentSubmittedAt && (
                    <button className="ml-2 font-bold text-brand" onClick={() => onReview(s.id)}>
                      View ID
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Status value={s.status} />
                </td>
                <td className="px-4 py-3 text-neutral-500">{date(s.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button onClick={() => onDetails(s.id)}>View details</Button>
                    {s.status === "Approved" ? (
                      <Button onClick={() => onUpdate(s.id, "Suspended")}>Suspend</Button>
                    ) : s.documentSubmittedAt && s.verificationStatus === "Pending" ? (
                      <>
                        <Button variant="primary" onClick={() => onDecision(s.id, "Approved")}>
                          Approve ID
                        </Button>
                        <Button onClick={() => onDecision(s.id, "Rejected")}>Reject ID</Button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!sellers.length && <Empty text="No sellers match your search." />}
      </div>
    </Panel>
  );
}
