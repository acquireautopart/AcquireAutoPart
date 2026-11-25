import { ArrowUpRight, BadgeCheck, Headset, Store, Users } from "lucide-react";

const sellerBenefits = [
  { label: "Reach more parts shoppers", icon: Users },
  { label: "Showcase your inventory", icon: Store },
  { label: "Seller support when you need it", icon: Headset },
];

export default function SellerCallout() {
  return (
    <section className="site-container py-14 sm:py-[70px]">
      <div className="grid gap-8 border border-line-light bg-white p-6 sm:p-9 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:p-12">
        <div>
          <span className="eyebrow">FOR AUTOMOTIVE SELLERS</span>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-extrabold leading-tight tracking-[-.05em] sm:text-4xl">
            Put your parts in front of more drivers.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
            We are building a simpler online parts-shopping experience for customers and automotive
            businesses.
          </p>
          <a className="button mt-6 bg-ink text-white transition hover:bg-brand" href={process.env.NEXT_PUBLIC_SELLER_URL || "/seller"}>
            Open Seller Hub
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <div className="grid gap-3">
          {sellerBenefits.map(({ label, icon: Icon }) => (
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4" key={label}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <span className="flex items-center gap-2 text-sm font-bold">
                <BadgeCheck size={15} className="shrink-0 text-brand" aria-hidden="true" />
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
