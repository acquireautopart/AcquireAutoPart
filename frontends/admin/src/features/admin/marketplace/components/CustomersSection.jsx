import { date, money } from "@/features/admin/shared/components/utils";
import { Empty, Panel, PanelTitle } from "@/features/admin/shared/components/ui";
import SearchBox from "@/features/admin/marketplace/components/SearchBox";

export function CustomersSection({ customers, search, setSearch }) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <PanelTitle eyebrow="CUSTOMER ACCOUNTS" title="Customers" />
        <SearchBox value={search} onChange={setSearch} placeholder="Search customers" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="bg-neutral-50 text-[9px] text-neutral-400 dark:bg-neutral-900">
            <tr>
              {["CUSTOMER", "EMAIL", "PHONE", "ORDERS", "TOTAL SPENT", "JOINED"].map((x) => (
                <th key={x} className="px-4 py-3">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="px-4 py-3 font-bold">{c.name}</td>
                <td className="px-4 py-3 text-neutral-500">{c.email}</td>
                <td className="px-4 py-3">{c.phone || "—"}</td>
                <td className="px-4 py-3">{c.orders}</td>
                <td className="px-4 py-3 font-bold">{money(c.spent)}</td>
                <td className="px-4 py-3 text-neutral-500">{date(c.joinedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!customers.length && <Empty text="No customer accounts found." />}
      </div>
    </Panel>
  );
}
