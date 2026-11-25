import { X } from "lucide-react";
import { cx } from "@/features/seller/shared/components/utils";

export function Button({
  children,
  onClick,
  variant = "secondary",
  className = "",
  type = "button",
  disabled,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary"
          ? "bg-brand text-white shadow-sm hover:bg-brand-dark"
          : "border border-neutral-200 bg-white text-neutral-800 hover:border-orange-300 hover:text-orange-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-orange-700",
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

export function PanelTitle({ eyebrow, title, action }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-[9px] font-extrabold tracking-[.16em] text-neutral-400">{eyebrow}</p>
        <h2 className="mt-1 flex items-center gap-2 font-display text-base font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function Icon({ children, className = "" }) {
  return (
    <span
      className={cx(
        "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-brand dark:bg-orange-950/50",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Empty({ text }) {
  return <div className="px-5 py-12 text-center text-sm text-neutral-500">{text}</div>;
}

export function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue = "",
  value,
  onChange,
  placeholder = "",
  min,
  step,
  hint,
  rows,
  autoComplete,
  compact = false,
}) {
  const common = `mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 ${
    compact ? "py-1.5 text-[13px]" : "py-2 text-sm"
  } text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-orange-950`;
  return (
    <label
      className={`${
        compact ? "mt-2" : "mt-4"
      } block text-xs font-bold text-neutral-600 dark:text-neutral-300`}
    >
      {label}
      {hint && <span className="ml-2 font-normal text-neutral-400">{hint}</span>}
      {rows ? (
        <textarea
          rows={rows}
          name={name}
          required={required}
          defaultValue={value === undefined ? defaultValue : undefined}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={common}
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          min={min}
          step={step}
          autoComplete={autoComplete}
          defaultValue={value === undefined ? defaultValue : undefined}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={common}
        />
      )}
    </label>
  );
}

export function Modal({
  title,
  eyebrow = "SELLER HUB",
  onClose,
  onSubmit,
  children,
  busy,
  submitLabel = "Save changes",
  compact = false,
}) {
  return (
    <div
      className={`fixed inset-0 z-[80] grid place-items-center ${
        compact ? "overflow-hidden p-2 sm:p-4" : "overflow-y-auto p-4"
      } bg-neutral-950/60 backdrop-blur-sm`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={onSubmit}
        className={`${
          compact
            ? "flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col p-4 sm:max-h-[calc(100dvh-2rem)] sm:p-5"
            : "my-auto w-full max-w-xl p-5 sm:p-7"
        } rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-[#151515]`}
      >
        <header
          className={`${compact ? "mb-3 shrink-0" : "mb-5"} flex items-start justify-between`}
        >
          <div>
            <p className="text-[9px] font-extrabold tracking-[.15em] text-neutral-400">{eyebrow}</p>
            <h2 className="mt-1 font-display text-xl font-extrabold dark:text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={18} />
          </button>
        </header>
        <div className={compact ? "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" : ""}>
          {children}
        </div>
        <div
          className={`${
            compact ? "mt-3 shrink-0 pt-3" : "mt-6 pt-4"
          } flex justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800`}
        >
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function Status({ value }) {
  const theme = {
    New: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    Packed: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    Shipped: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
    Delivered: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    Active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    Draft: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800",
    Archived: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800",
    Cancelled: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800",
    Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    Pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    COD: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[8px] font-bold",
        theme[value] || theme.New,
      )}
    >
      <i className="h-1.5 w-1.5 rounded-full bg-current" />
      {value}
    </span>
  );
}

export function PageHeading({ title, sub, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[9px] font-extrabold tracking-[.15em] text-neutral-400">SELLER HUB</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-neutral-500">{sub}</p>
      </div>
      {action}
    </div>
  );
}
