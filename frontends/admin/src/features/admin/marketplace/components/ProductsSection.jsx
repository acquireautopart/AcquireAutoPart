import { money } from "@/features/admin/shared/components/utils";
import { Empty, Panel, PanelTitle, Status } from "@/features/admin/shared/components/ui";
import SearchBox from "@/features/admin/marketplace/components/SearchBox";

export function ProductsSection({ products, search, setSearch, onModerate }) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <PanelTitle eyebrow="MARKETPLACE MODERATION" title="Products" />
        <SearchBox value={search} onChange={setSearch} placeholder="Search listings" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-xs">
          <thead className="bg-neutral-50 text-[9px] text-neutral-400 dark:bg-neutral-900">
            <tr>
              {["LISTING", "SELLER", "CATEGORY", "PRICE", "STOCK", "STATUS", "MODERATION"].map(
                (x) => (
                  <th key={x} className="px-4 py-3">
                    {x}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="px-4 py-3">
                  <b>{p.name}</b>
                  <small className="mt-1 block text-[9px] text-neutral-400">{p.sku}</small>
                </td>
                <td className="px-4 py-3">{p.seller}</td>
                <td className="px-4 py-3">{p.category}</td>
                <td className="px-4 py-3">{money(p.price)}</td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3">
                  <Status value={p.status} />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={
                      p.moderationStatus === "Flagged"
                        ? "Flagged"
                        : p.moderationStatus === "Hidden"
                          ? "Hidden"
                          : "Clear"
                    }
                    onChange={(e) => onModerate(p.id, e.target.value)}
                    className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[10px] dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <option>Clear</option>
                    <option>Flagged</option>
                    <option>Hidden</option>
                    <option value="Active">Re-activate</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!products.length && <Empty text="No product listings found." />}
      </div>
    </Panel>
  );
}
