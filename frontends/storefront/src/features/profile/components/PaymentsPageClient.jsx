"use client";

import { useState } from "react";
import { CreditCard, Plus, ShieldCheck, Trash2, Lock, CheckCircle2 } from "lucide-react";
import profileApi from "@/features/storefront/lib/profileApi";
import ProfileSubpageFrame from "@/features/profile/components/ProfileSubpageFrame";
import { SectionNotice, useSectionNotice } from "@/features/profile/components/SectionNotice";
import {
  useProfileResource,
  ProfileResourceState,
  ProfileModal,
  Field,
  PROFILE_INPUT,
  PROFILE_BTN_PRIMARY,
  PROFILE_BTN_GHOST,
} from "@/features/profile/components/ProfileFormKit";

const BRAND_STYLE = {
  visa: { color: "#1a1f71", italic: true, label: "VISA" },
  mastercard: { color: "#eb001b", label: "Mastercard" },
  "american express": { color: "#006fcf", label: "AMEX" },
  amex: { color: "#006fcf", label: "AMEX" },
  paypal: { color: "#003087", label: "PayPal" },
  rupay: { color: "#0d6b3f", label: "RuPay" },
  stripe: { color: "#635bff", label: "stripe" },
};

const PAYMENT_BRANDS = ["Visa", "Mastercard", "Amex", "RuPay", "PayPal", "Other"];
const PAYMENT_TYPES = ["Credit card", "Debit card", "Wallet"];
const CURRENT_YEAR = new Date().getFullYear();
const EXPIRY_MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const EXPIRY_YEARS = Array.from({ length: 31 }, (_, index) => String(CURRENT_YEAR + index));

function brandStyle(brand = "") {
  return BRAND_STYLE[brand.toLowerCase()] || { color: "#52525b", label: brand.toUpperCase() };
}

function emptyForm() {
  return {
    brand: "Visa",
    type: "Credit card",
    last4: "",
    holder: "",
    expiresMonth: "1",
    expiresYear: String(CURRENT_YEAR),
  };
}

export default function PaymentsPageClient() {
  const { data, loading, error, reload } = useProfileResource(() => profileApi.payments(), []);
  const [notice, setNotice] = useSectionNotice();

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(emptyForm);

  const payments = data?.payments ?? [];
  const isWallet = form.type === "Wallet";

  function openForm() {
    setForm(emptyForm());
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await profileApi.createPayment({
        brand: isWallet ? "PayPal" : form.brand,
        type: form.type,
        last4: form.last4.trim(),
        holder: isWallet ? "" : form.holder.trim(),
        expiresMonth: isWallet ? undefined : Number(form.expiresMonth),
        expiresYear: isWallet ? undefined : Number(form.expiresYear),
      });
      setShowForm(false);
      await reload();
      setNotice("Payment method added to your account");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(payment) {
    try {
      await profileApi.setDefaultPayment(payment.id);
      await reload();
      setNotice(`${payment.brand} set as your default payment method`);
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function remove(payment) {
    try {
      await profileApi.removePayment(payment.id);
      await reload();
      setNotice(`${payment.brand} removed from your account`);
    } catch (err) {
      setNotice(err.message);
    }
  }

  return (
    <ProfileSubpageFrame activeId="payments">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 font-display text-2xl font-extrabold sm:text-3xl">
            <CreditCard size={24} className="shrink-0 text-[var(--pf-brand)]" strokeWidth={2} />
            Payment Methods
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--pf-text-2)]">
            Cards and wallets saved to your account. Your default is used automatically at checkout.
          </p>
        </div>
        <button
          onClick={openForm}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--pf-brand)] px-4 text-sm font-bold text-white hover:brightness-110"
        >
          <Plus size={16} /> Add payment method
        </button>
      </header>

      <ProfileResourceState
        loading={loading}
        error={error}
        onRetry={reload}
        signInLabel="Sign in to manage your saved payment methods."
      >
        {payments.length > 0 && (
          <p className="mt-3 text-xs text-[var(--pf-muted)]">
            {payments.length} saved method{payments.length === 1 ? "" : "s"}
          </p>
        )}

        {payments.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            {payments.map((payment) => {
              const brand = brandStyle(payment.brand);
              const isCard = payment.type.toLowerCase().includes("card");
              return (
                <article
                  key={payment.id}
                  className={`pf-card flex flex-col p-4 transition-colors sm:p-5 ${
                    payment.isDefault
                      ? "border-[var(--pf-brand)]"
                      : "hover:border-[var(--pf-brand)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-[62px] shrink-0 place-items-center rounded-lg border border-[var(--pf-border)] bg-white">
                      <span
                        className={`text-[13px] font-black tracking-tight ${brand.italic ? "italic" : ""}`}
                        style={{ color: brand.color }}
                      >
                        {brand.label}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-bold">
                          {payment.brand}
                          {isCard && (
                            <span className="font-normal text-[var(--pf-muted)]">
                              {" "}
                              · {payment.type}
                            </span>
                          )}
                        </h2>
                        {payment.isDefault && (
                          <span className="rounded bg-[var(--pf-brand)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            Default
                          </span>
                        )}
                      </div>
                      {!isCard && (
                        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[var(--pf-muted)]">
                          {payment.type}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="mt-3.5 font-mono text-sm tracking-[.18em] text-[var(--pf-text)] sm:text-base">
                    {isCard ? `•••• •••• •••• ${payment.last4}` : payment.holder || payment.last4}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--pf-text-2)]">
                    {payment.holder && (
                      <span className="min-w-0 truncate">
                        <span className="text-[var(--pf-muted)]">Holder: </span>
                        {payment.holder}
                      </span>
                    )}
                    {payment.expires && (
                      <span>
                        <span className="text-[var(--pf-muted)]">Expires: </span>
                        {payment.expires}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-[var(--pf-border-soft)] pt-3">
                    {payment.isDefault ? (
                      <span className="inline-flex min-h-9 items-center gap-1.5 text-[11px] font-semibold text-[var(--pf-brand)]">
                        <CheckCircle2 size={14} /> Used automatically
                      </span>
                    ) : (
                      <button
                        onClick={() => setDefault(payment)}
                        className="pf-outline-btn min-h-9"
                      >
                        Set as default
                      </button>
                    )}
                    <button
                      onClick={() => remove(payment)}
                      aria-label={`Remove ${payment.brand}`}
                      className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--pf-border)] px-3 text-[11px] font-semibold text-[var(--pf-text-2)] transition-colors hover:border-red-500 hover:text-red-500"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </article>
              );
            })}

            <button
              onClick={openForm}
              className="flex min-h-[190px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--pf-border)] p-6 text-center text-[var(--pf-text-2)] transition-colors hover:border-[var(--pf-brand)] hover:text-[var(--pf-brand)]"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
                <Plus size={22} />
              </span>
              <span className="text-sm font-bold">Add a payment method</span>
              <span className="max-w-[220px] text-xs text-[var(--pf-muted)]">
                Visa, Mastercard, RuPay, PayPal and other brands are supported at checkout.
              </span>
            </button>
          </div>
        ) : (
          <div className="pf-card mt-4 grid place-items-center px-5 py-14 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
              <CreditCard size={28} />
            </span>
            <h2 className="mt-4 font-display text-xl font-extrabold">No payment methods saved</h2>
            <p className="mt-2 max-w-sm text-sm text-[var(--pf-text-2)]">
              Save a card or wallet to check out faster on your next order.
            </p>
            <button
              onClick={openForm}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--pf-brand)] px-5 text-sm font-bold text-white hover:brightness-110"
            >
              <Plus size={16} /> Add your first method
            </button>
          </div>
        )}
      </ProfileResourceState>

      <div className="pf-card mt-4 flex flex-wrap items-start gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
          <ShieldCheck size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <Lock size={13} className="text-[var(--pf-brand)]" /> Payments are encrypted
          </h2>
          <p className="mt-1 text-xs text-[var(--pf-text-2)]">
            Your card is tokenised securely at checkout and the full number is never stored on our
            servers. Only the masked details you choose to save are kept so you can recognise the
            card here.
          </p>
        </div>
      </div>

      <SectionNotice message={notice} />

      {showForm && (
        <ProfileModal
          title="Add a payment method"
          description="Save a card or wallet so checkout is faster next time."
          onClose={closeForm}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Brand">
              <select
                className={PROFILE_INPUT}
                value={isWallet ? "PayPal" : form.brand}
                onChange={(event) =>
                  setForm((current) => ({ ...current, brand: event.target.value }))
                }
                disabled={isWallet}
              >
                {PAYMENT_BRANDS.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Type">
              <select
                className={PROFILE_INPUT}
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({ ...current, type: event.target.value }))
                }
              >
                {PAYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label={isWallet ? "Account reference (last 2–4 characters)" : "Last 2–4 digits"}
              hint="Shown masked on this page so you can recognise the method."
            >
              <input
                className={PROFILE_INPUT}
                value={form.last4}
                maxLength={4}
                pattern="[A-Za-z0-9]{2,4}"
                title="2 to 4 letters or digits"
                onChange={(event) =>
                  setForm((current) => ({ ...current, last4: event.target.value }))
                }
                required
              />
            </Field>

            {!isWallet && (
              <Field label="Cardholder name">
                <input
                  className={PROFILE_INPUT}
                  value={form.holder}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, holder: event.target.value }))
                  }
                  required
                />
              </Field>
            )}

            {!isWallet && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expiry month">
                  <select
                    className={PROFILE_INPUT}
                    value={form.expiresMonth}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, expiresMonth: event.target.value }))
                    }
                  >
                    {EXPIRY_MONTHS.map((month) => (
                      <option key={month} value={month}>
                        {month.padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Expiry year">
                  <select
                    className={PROFILE_INPUT}
                    value={form.expiresYear}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, expiresYear: event.target.value }))
                    }
                  >
                    {EXPIRY_YEARS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            <p className="flex items-start gap-2 rounded-lg bg-[var(--pf-card-2)] px-3 py-2.5 text-[11px] text-[var(--pf-text-2)]">
              <Lock size={13} className="mt-0.5 shrink-0 text-[var(--pf-brand)]" />
              We never ask for your full card number or CVV. Your card is tokenised securely at
              checkout — only the masked details you see here are saved to your account.
            </p>

            {formError && <p className="text-xs font-semibold text-red-500">{formError}</p>}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeForm}
                className={PROFILE_BTN_GHOST}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className={PROFILE_BTN_PRIMARY} disabled={saving}>
                {saving ? "Saving…" : "Save method"}
              </button>
            </div>
          </form>
        </ProfileModal>
      )}
    </ProfileSubpageFrame>
  );
}
