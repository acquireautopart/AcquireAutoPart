import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  MapPin,
  PackageCheck,
  Route,
  Truck,
} from "lucide-react";
import TrackSearch from "@/features/delivery/shared/components/TrackSearch";
import DeliveryApplicationForm from "@/features/delivery/components/DeliveryApplicationForm";

const steps = [
  {
    number: "01",
    title: "Go online",
    description: "Switch on availability and see deliveries near you.",
  },
  {
    number: "02",
    title: "Accept a route",
    description: "Review pickup, drop-off and payout before you start.",
  },
  {
    number: "03",
    title: "Pick up and verify",
    description: "Scan the parcel and confirm it with the pickup code.",
  },
  {
    number: "04",
    title: "Deliver and earn",
    description:
      "Confirm delivery with the customer OTP. See updates as they happen.",
  },
];

export default function DeliveryLandingPage() {
  return (
    <main className="min-h-screen bg-[#f4f5f6] text-[#17212b]">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <Link href="/" className="text-sm font-extrabold tracking-tight">
            Acquire<span className="text-orange-600">Auto</span>{" "}
            <span className="font-semibold">Delivery</span>
          </Link>
          <div className="flex items-center gap-5 text-xs font-medium text-slate-600">
            <a className="hidden sm:inline" href="#how-it-works">
              How it works
            </a>
            <a className="hidden sm:inline" href="#earnings">
              Earnings
            </a>
            <Link
              href="/dashboard"
              className="rounded-md bg-orange-600 px-4 py-2.5 font-bold text-white transition hover:bg-orange-700"
            >
              Partner login
            </Link>
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <section className="grid items-center gap-10 py-14 md:grid-cols-[1.08fr_.92fr] md:py-20">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[.18em] text-orange-700">
              Your city. Your routes. Your earnings.
            </p>
            <h1 className="max-w-xl text-5xl font-extrabold leading-[1.04] tracking-tight sm:text-6xl">
              Deliver auto parts. Get paid every week.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-slate-600">
              Pick up orders from nearby sellers, deliver them to garages and
              customers, and track every trip and payout in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="#apply"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-orange-600 px-4 text-xs font-bold text-white transition hover:bg-orange-700"
              >
                Apply as delivery partner <ArrowRight size={15} />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-11 items-center rounded-md border border-slate-400 px-4 text-xs font-bold transition hover:bg-white"
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Submit your details and documents for administrator review and
              interview.
            </p>
            <TrackSearch />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold">
                Today&apos;s sample route
              </h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                3 stops
              </span>
            </div>
            <ol className="mt-5 space-y-0">
              {[
                {
                  place: "Pickup: Sharma Auto Spares",
                  detail: "Phase 7, Mohali · Brake pads, 2 pcs",
                  time: "10:15",
                },
                {
                  place: "Pickup: Gill Motors",
                  detail: "Sector 70 · Oil filter, 1 pc",
                  time: "10:35",
                },
                {
                  place: "Drop: City Garage",
                  detail: "Sector 17, Chandigarh · 2 orders",
                  time: "11:05",
                },
              ].map((stop, index) => (
                <li
                  key={stop.place}
                  className="relative flex gap-3 pb-5 last:pb-0"
                >
                  {index < 2 && (
                    <span className="absolute left-[6px] top-3 h-full border-l border-orange-200" />
                  )}
                  <span
                    className={`relative mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-orange-600 bg-white ${index === 2 ? "bg-orange-600" : ""}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-bold">{stop.place}</p>
                      <time className="text-[10px] text-slate-500">
                        {stop.time}
                      </time>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {stop.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="pb-12">
          <DeliveryApplicationForm />
        </section>

        <section id="how-it-works" className="scroll-mt-8 pb-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-700">
                Simple from start to finish
              </p>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                Four steps from order to doorstep
              </h2>
            </div>
            <Route className="hidden text-orange-600 sm:block" size={26} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <article
                key={step.number}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <p className="text-xl font-extrabold text-orange-600">
                  {step.number}
                </p>
                <h3 className="mt-1 text-sm font-bold">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="earnings"
          className="scroll-mt-8 rounded-xl bg-[#17212b] px-5 py-6 text-white sm:px-8 sm:py-7"
        >
          <div className="grid items-center gap-6 md:grid-cols-[1.05fr_.95fr]">
            <div>
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <PackageCheck size={18} />
              </div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">
                Clear pay, no guesswork
              </h2>
              <p className="mt-2 max-w-md text-xs leading-5 text-slate-300">
                See delivery pay, COD collected, and completed stops in your
                delivery workspace.
              </p>
            </div>
            <dl className="divide-y divide-white/15 text-xs">
              {[
                ["Base pay per delivery", "₹40"],
                ["Per kilometre", "₹8"],
                ["Peak-hour bonus", "+₹20"],
                ["Payout", "Weekly to bank"],
              ].map(([label, amount]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <dt className="text-slate-200">{label}</dt>
                  <dd className="font-bold">{amount}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="grid gap-4 py-10 md:grid-cols-3">
          {[
            {
              icon: <MapPin size={17} />,
              title: "Scan at every hand-off",
              text: "Each parcel follows a scan-based trail through pickup, hubs and delivery.",
            },
            {
              icon: <Clock3 size={17} />,
              title: "Built for real routes",
              text: "Keep customer address, call details and the next delivery step together.",
            },
            {
              icon: <Truck size={17} />,
              title: "COD handled clearly",
              text: "See the exact amount to collect and record how the customer paid.",
            },
          ].map((feature) => (
            <article
              key={feature.title}
              className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <span className="mt-0.5 text-orange-600">{feature.icon}</span>
              <div>
                <h3 className="text-xs font-bold">{feature.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {feature.text}
                </p>
              </div>
            </article>
          ))}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-5 text-[10px] text-slate-500">
          <span>© AcquireAuto · Delivery partner workspace</span>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-orange-700"
          >
            Partner login <Check size={13} />
          </Link>
        </footer>
      </div>
    </main>
  );
}
