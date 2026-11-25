import Link from "next/link";
import { ArrowUpRight, Disc3, Droplets, Lightbulb } from "lucide-react";

const guides = [
  {
    title: "Brake service shortlist",
    detail: "Compare pads, rotors and wear-related parts for your vehicle. Check axle position and brake system details before ordering.",
    parts: "Brake pads · Rotors · Sensors",
    href: "/category/brakes-suspension-steering",
    icon: Disc3,
  },
  {
    title: "Filter refresh",
    detail: "Find engine and cabin filters for routine maintenance. Match dimensions and service intervals to your owner's manual.",
    parts: "Oil filters · Air filters · Cabin filters",
    href: "/parts?q=filter",
    icon: Droplets,
  },
  {
    title: "Lighting and visibility",
    detail: "Browse replacement lighting and visibility parts. Confirm bulb type, side, connector and local road requirements.",
    parts: "Headlights · Tail lights · Wipers",
    href: "/category/headlights-lighting",
    icon: Lightbulb,
  },
];

export default function RepairGuides() {
  return (
    <section className="section-pad bg-[#f7f7f5]" aria-labelledby="repair-guides-heading">
      <div className="site-container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PLAN YOUR REPAIR</span>
            <h2 className="section-title" id="repair-guides-heading">Start with the right parts</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Browse common repair shortlists, then confirm fitment and installation requirements for your exact vehicle.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {guides.map(({ title, detail, parts, href, icon: Icon }) => (
            <article key={title} className="flex min-h-56 flex-col rounded-xl border border-line-light bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand/40 hover:shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff0e8] text-brand"><Icon size={22} /></span>
              <h3 className="mt-4 font-display text-lg font-extrabold">{title}</h3>
              <p className="mt-2 flex-1 text-xs leading-5 text-muted">{detail}</p>
              <p className="mt-3 text-[10px] font-bold text-[#555851]">{parts}</p>
              <Link href={href} className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-brand hover:underline">
                Browse related products <ArrowUpRight size={14} />
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-4 text-[10px] leading-5 text-muted">These are shopping guides, not repair instructions. Use the vehicle service manual or a qualified technician for repair procedures.</p>
      </div>
    </section>
  );
}
