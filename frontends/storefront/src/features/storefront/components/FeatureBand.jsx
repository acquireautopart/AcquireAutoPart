import { ArrowUpRight, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import Link from "next/link";
const features = [
  {
    icon: ShieldCheck,
    title: "Parts you can count on",
    text: "Make your next repair with confidence.",
  },
  { icon: Truck, title: "Delivery that moves", text: "Clear delivery information at checkout." },
  {
    icon: RotateCcw,
    title: "Returns made simpler",
    text: "Straightforward help when plans change.",
  },
];
export default function FeatureBand() {
  return (
    <section className="bg-white py-14 text-[#171916] sm:py-20" id="guides">
      <div className="site-container grid gap-10 lg:grid-cols-[.85fr_1.5fr] lg:gap-16">
        <div>
          <span className="eyebrow">A BETTER WAY TO SHOP</span>
          <h2 className="mt-3 font-display text-4xl font-extrabold leading-[1.04] tracking-[-.055em] sm:text-5xl">
            More miles.
            <br />
            <em className="font-semibold text-brand">Less guesswork.</em>
          </h2>
          <Link
            href="/#vehicle-search"
            className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#171916] hover:text-brand"
          >
            How it works <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, text }, index) => (
            <div className="border-t border-line-light pt-5" key={title}>
              <span className="mb-5 block text-[10px] font-bold tracking-[.15em] text-brand">
                0{index + 1}
              </span>
              <Icon size={25} strokeWidth={1.5} />
              <h3 className="mt-5 text-base font-extrabold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
