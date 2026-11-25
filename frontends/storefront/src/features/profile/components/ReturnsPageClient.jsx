"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Undo2,
  Plus,
  Check,
  PackageOpen,
  CalendarClock,
  RefreshCcw,
  CircleDollarSign,
} from "lucide-react";
import { profileApi } from "@/features/storefront/lib/profileApi";
import { formatPrice } from "@/features/storefront/lib/format";
import ProfileSubpageFrame from "@/features/profile/components/ProfileSubpageFrame";
import {
  useProfileResource,
  ProfileResourceState,
  ProfileModal,
  Field,
  PROFILE_INPUT,
  PROFILE_BTN_PRIMARY,
  PROFILE_BTN_GHOST,
} from "@/features/profile/components/ProfileFormKit";
import { SectionNotice, useSectionNotice } from "@/features/profile/components/SectionNotice";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "Requested", label: "Requested" },
  { id: "Approved", label: "Approved" },
  { id: "In transit", label: "In transit" },
  { id: "Replacement Shipped", label: "Replacement shipped" },
  { id: "Refunded", label: "Refunded" },
];

const STATUS_STYLE = {
  Requested: "bg-[var(--pf-info-bg)] text-[var(--pf-info)]",
  Approved: "bg-[var(--pf-info-bg)] text-[var(--pf-info)]",
  "In transit": "bg-[var(--pf-warn-bg)] text-[var(--pf-warn)]",
  Refunded: "bg-[var(--pf-ok-bg)] text-[var(--pf-ok)]",
};
const STATUS_FALLBACK = "bg-[var(--pf-card-2)] text-[var(--pf-muted)]";
const CANCELLABLE = ["Requested", "Approved"];

const TEXTAREA =
  "min-h-[88px] w-full rounded-lg border border-[var(--pf-border)] bg-[var(--pf-input)] p-3 text-sm text-[var(--pf-text)] outline-none placeholder:text-[var(--pf-muted)] focus:border-[var(--pf-brand)]";

const EMPTY_FORM = { orderId: "", item: "", reason: "", refund: "", type: "Return" };

function PickupScanLabel({ scanToken }) {
  const [qrCode, setQrCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setQrCode("");
    setError("");
    QRCode.toDataURL(scanToken, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    })
      .then((value) => {
        if (active) setQrCode(value);
      })
      .catch((qrError) => {
        if (active) setError(qrError.message);
      });
    return () => {
      active = false;
    };
  }, [scanToken]);

  return (
    <details className="mt-3 rounded-lg border border-[var(--pf-border)] p-3">
      <summary className="cursor-pointer text-xs font-bold text-[var(--pf-brand)]">
        Show pickup QR label
      </summary>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-600">
          Could not generate the pickup QR label: {error}
        </p>
      ) : qrCode ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <img src={qrCode} alt="Return pickup QR code" className="h-28 w-28 rounded bg-white p-1" />
          <p className="max-w-xs text-xs text-[var(--pf-text-2)]">
            Show this code to the delivery partner when they collect your package.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-[var(--pf-muted)]">Generating pickup QR label…</p>
      )}
    </details>
  );
}

export default function ReturnsPageClient() {
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useSectionNotice();

  const { data, loading, error, reload } = useProfileResource(
    () => profileApi.returns({ status: filter }),
    [filter],
  );
  useEffect(() => {
    const timer = window.setInterval(() => {
      reload({ silent: true });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [reload]);

  const returns = data?.returns ?? [];
  const summaryData = data?.summary ?? { active: 0, refunded: 0, refundedTotal: 0 };

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);

  const summary = [
    {
      id: "active",
      label: "Active requests",
      value: String(summaryData.active ?? 0),
      icon: RefreshCcw,
    },
    {
      id: "done",
      label: "Refunds completed",
      value: String(summaryData.refunded ?? 0),
      icon: Check,
    },
    {
      id: "total",
      label: "Total refunded",
      value: formatPrice(summaryData.refundedTotal ?? 0),
      icon: CircleDollarSign,
    },
  ];

  function openForm() {
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  }

  async function submitReturn(event) {
    event.preventDefault();
    const orderId = form.orderId.trim();
    const item = form.item.trim();
    const reason = form.reason.trim();
    const refundRaw = form.refund.trim();

    if (orderId.length < 3) {
      setFormError("Enter an order ID with at least 3 characters.");
      return;
    }
    if (item.length < 3 || item.length > 200) {
      setFormError("Item must be between 3 and 200 characters.");
      return;
    }
    if (reason.length < 3 || reason.length > 300) {
      setFormError("Reason must be between 3 and 300 characters.");
      return;
    }

    const payload = { orderId, item, reason };
    if (refundRaw) {
      const refund = Number(refundRaw);
      if (!Number.isFinite(refund) || refund < 0 || refund > 1000000) {
        setFormError("Refund amount must be between 0 and 1,000,000.");
        return;
      }
      payload.refund = refund;
    }

    setSaving(true);
    setFormError("");
    try {
      payload.type = form.type;
      const { return: created } = await profileApi.createReturn(payload);
      setFormOpen(false);
      setForm(EMPTY_FORM);
      await reload();
      setNotice(`Return ${created?.code ?? "request"} created`);
    } catch (submitError) {
      setFormError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function cancelReturn(entry) {
    if (typeof window !== "undefined" && !window.confirm(`Cancel return ${entry.code}?`)) return;
    try {
      await profileApi.cancelReturn(entry.id);
      setDetail(null);
      await reload();
      setNotice(`Return ${entry.code} cancelled`);
    } catch (cancelError) {
      setNotice(cancelError.message);
    }
  }

  return (
    <ProfileSubpageFrame activeId="returns">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 font-display text-2xl font-extrabold sm:text-3xl">
            <Undo2 size={24} className="shrink-0 text-[var(--pf-brand)]" strokeWidth={2} />
            Returns &amp; Refunds
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--pf-text-2)]">
            Track every return request and refund, from pickup to money back in your account.
          </p>
        </div>
        <button
          onClick={openForm}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--pf-brand)] px-4 text-sm font-bold text-white hover:brightness-110"
        >
          <Plus size={16} /> Start a return / replacement
        </button>
      </header>

      <ProfileResourceState
        loading={loading}
        error={error}
        onRetry={reload}
        signInLabel="Sign in to track your returns and refunds."
      >
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {summary.map(({ id, label, value, icon: Icon }) => (
              <div key={id} className="pf-card flex items-center gap-3 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
                  <Icon size={19} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pf-muted)]">
                    {label}
                  </p>
                  <p className="mt-0.5 truncate text-lg font-extrabold">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {FILTERS.map((option) => {
              const active = filter === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setFilter(option.id)}
                  aria-pressed={active}
                  className={`min-h-9 rounded-full border px-3.5 text-xs font-bold transition-colors ${
                    active
                      ? "border-[var(--pf-brand)] bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]"
                      : "border-[var(--pf-border)] text-[var(--pf-text-2)] hover:border-[var(--pf-brand)] hover:text-[var(--pf-brand)]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {returns.length ? (
            <div className="mt-3 space-y-3">
              {returns.map((entry) => (
                <article key={entry.id} className="pf-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold">{entry.code}</span>
                        <span className="rounded-full bg-[var(--pf-card-2)] px-2 py-0.5 text-[10px] font-bold text-[var(--pf-muted)]">
                          {entry.type || "Return"}
                        </span>
                        <span className="rounded-full bg-[var(--pf-card-2)] px-2 py-0.5 text-[10px] font-bold text-[var(--pf-muted)]">
                          Order {entry.order}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            STATUS_STYLE[entry.status] || STATUS_FALLBACK
                          }`}
                        >
                          {entry.status}
                        </span>
                      </div>
                      <h2 className="mt-1.5 text-sm font-bold">{entry.item}</h2>
                      <p className="mt-1 text-[11px] font-semibold text-[var(--pf-brand)]">
                        Shipment: {entry.trackingStatus || entry.status}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--pf-muted)]">
                        Reason: {entry.reason} · Requested {entry.requested}
                      </p>
                      {entry.trackingStatus === "Ready for Pickup" && entry.scanToken && (
                        <PickupScanLabel scanToken={entry.scanToken} />
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pf-muted)]">
                        Refund
                      </p>
                      <p className="text-lg font-extrabold text-[var(--pf-brand)]">
                        {formatPrice(entry.refund)}
                      </p>
                    </div>
                  </div>

                  <ol className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:gap-4">
                    {entry.timeline.map((step, index) => (
                      <li key={step.label} className="flex min-w-[104px] flex-1 flex-col">
                        <div className="flex items-center gap-2">
                          <span
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                              step.done
                                ? "bg-[var(--pf-brand)] text-white"
                                : "border border-[var(--pf-border)] text-[var(--pf-muted)]"
                            }`}
                          >
                            {step.done ? <Check size={13} /> : index + 1}
                          </span>
                          {index < entry.timeline.length - 1 && (
                            <span
                              className={`h-0.5 flex-1 rounded ${
                                entry.timeline[index + 1].done
                                  ? "bg-[var(--pf-brand)]"
                                  : "bg-[var(--pf-border)]"
                              }`}
                            />
                          )}
                        </div>
                        <p className="mt-1.5 text-[11px] font-semibold leading-tight">
                          {step.label}
                        </p>
                        <p className="text-[10px] text-[var(--pf-muted)]">{step.date}</p>
                      </li>
                    ))}
                  </ol>

                  {entry.deliveryOtp && (
                    <p className="mt-3 rounded-lg bg-[var(--pf-brand-soft)] p-3 text-xs">
                      <b>Replacement delivery OTP:</b>{" "}
                      <span className="font-mono text-base font-extrabold tracking-widest">
                        {entry.deliveryOtp}
                      </span>
                      <span className="mt-1 block text-[var(--pf-text-2)]">
                        Share this code with the delivery boy only when the replacement arrives.
                      </span>
                    </p>
                  )}
                  {entry.events?.length > 0 && (
                    <ol className="mt-3 space-y-2 border-l-2 border-orange-100 pl-4">
                      {entry.events.map((event, index) => (
                        <li key={`${event.status}-${event.occurredAt || index}`} className="text-xs">
                          <b>{event.status}</b>
                          <span className="ml-2 text-[var(--pf-muted)]">
                            {event.occurredAt
                              ? new Date(event.occurredAt).toLocaleString()
                              : "Update received"}
                            {event.location?.label ? ` · ${event.location.label}` : ""}
                          </span>
                          {event.location && (
                            <a
                              href={`https://www.google.com/maps?q=${event.location.latitude},${event.location.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 font-semibold text-[var(--pf-brand)] underline"
                            >
                              Location
                            </a>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button onClick={() => setDetail(entry)} className="pf-outline-btn min-h-10">
                      View details
                    </button>
                    {CANCELLABLE.includes(entry.status) && (
                      <button
                        onClick={() => cancelReturn(entry)}
                        className="min-h-10 rounded-lg border border-[var(--pf-border)] px-3.5 text-xs font-semibold text-[var(--pf-text-2)] transition-colors hover:border-[var(--pf-brand)] hover:text-[var(--pf-brand)]"
                      >
                        Cancel request
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="pf-card mt-3 grid place-items-center px-5 py-14 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
                <PackageOpen size={28} />
              </span>
              <h2 className="mt-4 font-display text-xl font-extrabold">
                {filter === "all" ? "No returns yet" : `No ${filter.toLowerCase()} returns`}
              </h2>
              <p className="mt-2 max-w-sm text-sm text-[var(--pf-text-2)]">
                {filter === "all"
                  ? "If a part does not fit or arrives damaged, request a return or replacement and track every scan."
                  : "Try a different filter to see your other return requests."}
              </p>
              {filter === "all" ? (
                <button
                  onClick={openForm}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--pf-brand)] px-5 text-sm font-bold text-white hover:brightness-110"
                >
                  <Plus size={16} /> Start a return
                </button>
              ) : (
                <button onClick={() => setFilter("all")} className="pf-outline-btn mt-5">
                  Show all returns
                </button>
              )}
            </div>
          )}
        </>
      </ProfileResourceState>

      <div className="pf-card mt-4 flex items-start gap-3 p-4">
        <CalendarClock size={18} className="mt-0.5 shrink-0 text-[var(--pf-brand)]" />
        <p className="min-w-0 text-xs leading-5 text-[var(--pf-text-2)]">
          Returns are accepted within 30 days of delivery. Refunds are issued within 3–5 business
          days after the part passes inspection.
        </p>
      </div>

      {formOpen && (
        <ProfileModal
          title="Return or replace an item"
          description="Choose the order item and tell the seller what you need."
          onClose={() => setFormOpen(false)}
        >
          <form onSubmit={submitReturn} className="grid gap-4">
            <Field label="Request type">
              <select
                className={PROFILE_INPUT}
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({ ...current, type: event.target.value }))
                }
              >
                <option value="Return">Return for refund</option>
                <option value="Replacement">Replacement</option>
              </select>
            </Field>
            <Field label="Order ID">
              <input
                className={PROFILE_INPUT}
                value={form.orderId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, orderId: event.target.value }))
                }
                placeholder="#AP1005"
              />
            </Field>
            <Field label="Item">
              <input
                className={PROFILE_INPUT}
                value={form.item}
                onChange={(event) =>
                  setForm((current) => ({ ...current, item: event.target.value }))
                }
                placeholder="e.g. Projector Headlight Assembly"
              />
            </Field>
            <Field label="Reason for return">
              <textarea
                rows={3}
                className={TEXTAREA}
                value={form.reason}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reason: event.target.value }))
                }
                placeholder="Damaged on arrival, wrong part, no longer needed…"
              />
            </Field>
            {form.type === "Return" && (
            <Field label="Refund amount" hint="Optional. Leave blank if you are unsure.">
              <input
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                className={PROFILE_INPUT}
                value={form.refund}
                onChange={(event) =>
                  setForm((current) => ({ ...current, refund: event.target.value }))
                }
                placeholder="0.00"
              />
            </Field>
            )}

            {formError && (
              <p className="text-xs font-semibold text-[var(--pf-warn)]" role="alert">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className={PROFILE_BTN_GHOST}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className={PROFILE_BTN_PRIMARY}>
                {saving ? "Submitting…" : `Submit ${form.type.toLowerCase()} request`}
              </button>
            </div>
          </form>
        </ProfileModal>
      )}

      {detail && (
        <ProfileModal
          title={`Return ${detail.code}`}
          description={`Order ${detail.order} · Requested ${detail.requested}`}
          onClose={() => setDetail(null)}
        >
          <div className="space-y-4">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                STATUS_STYLE[detail.status] || STATUS_FALLBACK
              }`}
            >
              {detail.status}
            </span>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pf-muted)]">
                  Item
                </dt>
                <dd className="mt-0.5 font-bold">{detail.item}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pf-muted)]">
                  Refund
                </dt>
                <dd className="mt-0.5 font-bold text-[var(--pf-brand)]">
                  {formatPrice(detail.refund)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pf-muted)]">
                  Requested
                </dt>
                <dd className="mt-0.5 font-bold">{detail.requested}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pf-muted)]">
                  Reason
                </dt>
                <dd className="mt-0.5 text-[var(--pf-text-2)]">{detail.reason}</dd>
              </div>
            </dl>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pf-muted)]">
                Timeline
              </p>
              <ol className="mt-2 space-y-2">
                {detail.timeline.map((step) => (
                  <li key={step.label} className="flex items-center gap-3">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                        step.done
                          ? "bg-[var(--pf-brand)] text-white"
                          : "border border-[var(--pf-border)] text-[var(--pf-muted)]"
                      }`}
                    >
                      {step.done ? <Check size={13} /> : null}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold">{step.label}</span>
                    <span className="text-[11px] text-[var(--pf-muted)]">{step.date}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setDetail(null)} className={PROFILE_BTN_GHOST}>
                Close
              </button>
              {CANCELLABLE.includes(detail.status) && (
                <button
                  type="button"
                  onClick={() => cancelReturn(detail)}
                  className={PROFILE_BTN_GHOST}
                >
                  Cancel return
                </button>
              )}
            </div>
          </div>
        </ProfileModal>
      )}

      <SectionNotice message={notice} />
    </ProfileSubpageFrame>
  );
}
