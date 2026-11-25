"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Wallet,
  Plus,
  ArrowDownToLine,
  TrendingUp,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
} from "lucide-react";
import profileApi from "@/features/storefront/lib/profileApi";
import { formatPrice } from "@/features/storefront/lib/format";
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

function formatUpdated(value) {
  if (!value) return "just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default function WalletPageClient() {
  const { data, loading, error, reload } = useProfileResource(() => profileApi.wallet(), []);
  const [notice, setNotice] = useSectionNotice();

  const [modal, setModal] = useState(null); // "topup" | "withdraw" | null
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const wallet = data?.wallet ?? {
    balance: 0,
    pending: 0,
    cashbackEarned: 0,
    currency: "USD",
    updatedAt: null,
  };
  const transactions = data?.transactions ?? [];

  const stats = [
    {
      id: "available",
      label: "Available balance",
      value: wallet.balance,
      icon: Wallet,
      accent: true,
    },
    { id: "pending", label: "Pending credits", value: wallet.pending, icon: Clock, accent: false },
    {
      id: "cashback",
      label: "Cashback earned",
      value: wallet.cashbackEarned,
      icon: TrendingUp,
      accent: false,
    },
  ];

  const credits = transactions
    .filter((entry) => entry.type === "credit")
    .reduce((total, entry) => total + entry.amount, 0);
  const debits = transactions
    .filter((entry) => entry.type === "debit")
    .reduce((total, entry) => total + entry.amount, 0);

  function openModal(mode) {
    setModal(mode);
    setAmount("");
    setFormError("");
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1 || value > 50000) {
      setFormError("Enter an amount between 1 and 50000.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (modal === "topup") {
        await profileApi.topUp(value);
        setModal(null);
        await reload();
        setNotice("Top-up submitted — it stays Processing until your provider confirms.");
      } else {
        await profileApi.withdraw(value);
        setModal(null);
        await reload();
        setNotice("Withdrawal requested to your bank account.");
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProfileSubpageFrame activeId="wallet">
      <header className="min-w-0">
        <h1 className="flex items-center gap-2.5 font-display text-2xl font-extrabold sm:text-3xl">
          <Wallet size={24} className="shrink-0 text-[var(--pf-brand)]" strokeWidth={2} />
          My Wallet
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-[var(--pf-text-2)]">
          Use your wallet balance for instant checkout, cashback and refunds.
        </p>
      </header>

      <ProfileResourceState
        loading={loading}
        error={error}
        onRetry={reload}
        signInLabel="Sign in to view your wallet balance and activity."
      >
        <section
          className="pf-shadow relative mt-4 overflow-hidden rounded-xl p-5 text-white sm:p-6"
          style={{ background: "linear-gradient(135deg, #ff6b00 0%, #ff8a3d 55%, #ffb066 100%)" }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-black/15 blur-2xl"
          />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/85">
                Wallet balance
              </p>
              <p className="mt-1 font-display text-4xl font-extrabold sm:text-5xl">
                {formatPrice(wallet.balance, wallet.currency)}
              </p>
              <p className="mt-1.5 text-xs text-white/85">
                Updated {formatUpdated(wallet.updatedAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openModal("topup")}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-[#c2500a] transition-colors hover:bg-white/90"
              >
                <Plus size={16} /> Add money
              </button>
              <button
                onClick={() => openModal("withdraw")}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/60 px-4 text-sm font-bold text-white transition-colors hover:bg-white/15"
              >
                <ArrowDownToLine size={16} /> Withdraw
              </button>
            </div>
          </div>

          <p className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-black/15 px-3 py-1 text-[11px] font-semibold text-white/95">
            <ShieldCheck size={13} /> Wallet balance is applied automatically at checkout
          </p>
        </section>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {stats.map(({ id, label, value, icon: Icon, accent }) => (
            <div key={id} className="pf-card flex items-center gap-3 p-4">
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${
                  accent
                    ? "bg-[var(--pf-brand)] text-white"
                    : "bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]"
                }`}
              >
                <Icon size={19} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pf-muted)]">
                  {label}
                </p>
                <p className="mt-0.5 truncate text-lg font-extrabold">
                  {formatPrice(value, wallet.currency)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-extrabold">Recent activity</h2>
          <Link
            href="/profile/ledger"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--pf-brand)] hover:underline"
          >
            View full ledger <ArrowRight size={14} />
          </Link>
        </div>

        {transactions.length ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--pf-muted)]">
              <span>
                {transactions.length} transaction{transactions.length === 1 ? "" : "s"}
              </span>
              <span className="font-semibold text-[var(--pf-ok)]">
                Credits {formatPrice(credits, wallet.currency)}
              </span>
              <span className="font-semibold text-[var(--pf-text-2)]">
                Debits {formatPrice(debits, wallet.currency)}
              </span>
            </div>

            <div className="pf-card mt-3 divide-y divide-[var(--pf-border)] overflow-hidden">
              {transactions.map((entry) => {
                const isCredit = entry.type === "credit";
                return (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3.5 sm:p-4"
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                        isCredit
                          ? "bg-[var(--pf-ok-bg)] text-[var(--pf-ok)]"
                          : "bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]"
                      }`}
                    >
                      {isCredit ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{entry.title}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--pf-muted)]">
                        {entry.date} · {entry.status}
                      </p>
                    </div>

                    <p
                      className={`shrink-0 text-sm font-extrabold ${
                        isCredit ? "text-[var(--pf-ok)]" : "text-[var(--pf-text-2)]"
                      }`}
                    >
                      {isCredit ? "+" : "−"}
                      {formatPrice(entry.amount, entry.currency)}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="pf-card mt-3 grid place-items-center px-5 py-14 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
              <Wallet size={28} />
            </span>
            <h3 className="mt-4 font-display text-xl font-extrabold">No wallet activity yet</h3>
            <p className="mt-2 max-w-sm text-sm text-[var(--pf-text-2)]">
              Add money to your wallet, or wait for cashback and refunds — activity will show up
              here.
            </p>
            <button
              onClick={() => openModal("topup")}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--pf-brand)] px-5 text-sm font-bold text-white hover:brightness-110"
            >
              <Plus size={16} /> Add money
            </button>
          </div>
        )}
      </ProfileResourceState>

      <SectionNotice message={notice} />

      {modal && (
        <ProfileModal
          title={modal === "topup" ? "Add money" : "Withdraw money"}
          description={
            modal === "topup"
              ? 'Top-ups are processed as "Processing" until your payment provider confirms the charge, then your balance updates.'
              : 'Withdrawals are sent to your linked bank account and stay "Processing" until the transfer completes.'
          }
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Amount (USD)" hint="Between 1 and 50,000 · up to 2 decimals">
              <input
                type="number"
                min="1"
                max="50000"
                step="0.01"
                inputMode="decimal"
                className={PROFILE_INPUT}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                autoFocus
                required
              />
            </Field>

            {modal === "topup" && (
              <p className="rounded-lg bg-[var(--pf-card-2)] px-3 py-2.5 text-[11px] text-[var(--pf-text-2)]">
                A top-up is shown as Processing until the provider confirms it. Your available
                balance changes once the charge clears.
              </p>
            )}

            {formError && <p className="text-xs font-semibold text-red-500">{formError}</p>}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeModal}
                className={PROFILE_BTN_GHOST}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className={PROFILE_BTN_PRIMARY} disabled={saving}>
                {saving ? "Processing…" : modal === "topup" ? "Add money" : "Withdraw"}
              </button>
            </div>
          </form>
        </ProfileModal>
      )}
    </ProfileSubpageFrame>
  );
}
