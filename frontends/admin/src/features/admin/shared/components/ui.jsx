import { cx } from "@/features/admin/shared/components/utils";

export function Button({
  children,
  onClick,
  variant = "secondary",
  className = "",
  type = "button",
  disabled = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary"
          ? "bg-brand text-white hover:bg-brand-dark"
          : "border border-neutral-200 bg-white text-neutral-800 hover:border-orange-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100",
        className,
      )}
    >
      {children}
    </button>
  );
}
export function Panel({ children, className = "" }) {
  return (
    <section
      className={cx(
        "rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-[#111]",
        className,
      )}
    >
      {children}
    </section>
  );
}
export function PanelTitle({ title, eyebrow, icon: Icon, action }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[9px] font-extrabold tracking-[.15em] text-neutral-400">{eyebrow}</p>
        <h2 className="mt-1 flex items-center gap-2 font-display text-base font-extrabold">
          {Icon && <Icon size={17} className="text-brand" />}
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
export function Status({ value }) {
  const tone = [
    "Approved",
    "Active",
    "Resolved",
    "Delivered",
    "Paid",
    "Operational",
    "Clear",
  ].includes(value)
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
    : [
          "Pending",
          "Flagged",
          "Open",
          "Requested",
          "In progress",
          "Degraded",
          "Maintenance",
        ].includes(value)
      ? "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
      : ["Rejected", "Suspended", "Hidden", "Inactive", "Cancelled", "Refunded"].includes(value)
        ? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
        : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";
  return (
    <span
      className={cx(
        "inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold",
        tone,
      )}
    >
      {value || "—"}
    </span>
  );
}

export function AdminHero({ eyebrow = "ADMIN CONSOLE", title, sub, action }) {
  return (
    <section className="relative isolate flex min-h-[132px] items-center overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 via-orange-600 to-orange-800 px-5 py-5 text-white shadow-[0_10px_28px_rgba(234,88,12,.18)] sm:px-8">
      <img
        src="/car.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-y-0 right-0 z-0 h-full w-[58%] object-cover object-[center_48%] opacity-40 sm:w-[52%] sm:opacity-80"
      />
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-orange-600 via-orange-600/90 to-orange-800/20" />
      <div className="relative z-10 flex w-full flex-wrap items-center justify-between gap-4">
        <div className="max-w-[680px]">
          <p className="text-[9px] font-extrabold tracking-[.18em] text-orange-50/80">
            {eyebrow}
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 max-w-[560px] text-xs text-orange-50/95 sm:text-sm">
            {sub}
          </p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </section>
  );
}

export function PageHeading(props) {
  return <AdminHero {...props} />;
}

export function Empty({ text }) {
  return <div className="px-5 py-12 text-center text-sm text-neutral-500">{text}</div>;
}
