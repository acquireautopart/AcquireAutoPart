import { BatteryCharging, CircleHelp, Fuel, MapPinned, ShieldCheck, Truck } from "lucide-react";

const services = [
  { name: "Vehicle information", description: "Know more about your car", icon: CircleHelp },
  { name: "Find a garage", description: "Help with your next repair", icon: MapPinned },
  { name: "Roadside assistance", description: "Support when you need it", icon: Truck },
  { name: "Fuel stations", description: "Find fuel stops nearby", icon: Fuel },
  { name: "EV charging", description: "Plan your next charge", icon: BatteryCharging },
  { name: "Vehicle documents", description: "Keep the essentials in view", icon: ShieldCheck },
];

export default function ServiceHighlights() {
  return (
    <section className="section-pad bg-white" aria-labelledby="services-heading">
      <div className="site-container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MORE FOR THE ROAD</span>
            <h2 className="section-title" id="services-heading">
              Help beyond spare parts
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              Useful vehicle and road-service shortcuts, together in one place.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {services.map(({ name, description, icon: Icon }) => (
            <article className="border border-line-light bg-white p-4 sm:p-5" key={name}>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-brand">
                <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-extrabold">{name}</h3>
              <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
