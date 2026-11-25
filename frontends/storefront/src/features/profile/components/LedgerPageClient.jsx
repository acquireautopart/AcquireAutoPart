"use client";

import { useState } from "react";
import { ReceiptText, Download, ArrowDownLeft, ArrowUpRight, CalendarRange } from "lucide-react";
import profileApi from "@/features/storefront/lib/profileApi";
import { formatPrice } from "@/features/storefront/lib/format";
import ProfileSubpageFrame from "@/features/profile/components/ProfileSubpageFrame";
import { SectionNotice, useSectionNotice } from "@/features/profile/components/SectionNotice";
import {
  useProfileResource,
  ProfileResourceState,
} from "@/features/profile/components/ProfileFormKit";

const FILTERS = [
  { id: "all", label: "All entries" },
  { id: "credit", label: "Credits" },
  { id: "debit", label: "Debits" },
];

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export default function LedgerPageClient() {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useSectionNotice();

  const { data, loading, error, reload } = useProfileResource(
    () => profileApi.ledger({ type: filter, page, limit: 20 }),
    [filter, page],
  );

  const entries = data?.entries ?? [];
  const totals = data?.totals ?? { credited: 0, debited: 0, closingBalance: 0, cashbackEarned: 0 };
  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0, limit: 20 };

  const summary = [
    { id: "credit", label: "Total credited", value: totals.credited, tone: "ok" },
    { id: "debit", label: "Total debited", value: totals.debited, tone: "plain" },
    { id: "balance", label: "Closing balance", value: totals.closingBalance, tone: "brand" },
    { id: "cashback", label: "Cashback earned", value: totals.cashbackEarned, tone: "ok" },
  ];

  function selectFilter(id) {
    setFilter(id);
    setPage(1);
  }

  function downloadStatement() {
    const header = [
      "Date",
      "Reference",
      "Description",
      "Method",
      "Type",
      "Amount",
      "Balance",
      "Status",
    ];
    const rows = entries.map((entry) => [
      entry.date,
      entry.ref,
      entry.description,
      entry.method,
      entry.type,
      entry.amount,
      entry.balance,
      entry.status,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ledger-statement.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setNotice(`Statement downloaded (${entries.length} entr${entries.length === 1 ? "y" : "ies"})`);
  }

  return (
    <ProfileSubpageFrame activeId="ledger">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 font-display text-2xl font-extrabold sm:text-3xl">
            <ReceiptText size={24} className="shrink-0 text-[var(--pf-brand)]" strokeWidth={2} />
            Ledger
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--pf-text-2)]">
            A complete record of every credit and debit on your AcquireAuto account.
          </p>
        </div>
        <button onClick={downloadStatement} className="pf-outline-btn min-h-11">
          <Download size={16} /> Download statement
        </button>
      </header>

      <ProfileResourceState
        loading={loading}
        error={error}
        onRetry={reload}
        signInLabel="Sign in to view your account ledger."
      >
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map(({ id, label, value, tone }) => (
            <div key={id} className="pf-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pf-muted)]">
                {label}
              </p>
              <p
                className={`mt-1 text-xl font-extrabold ${
                  tone === "ok"
                    ? "text-[var(--pf-ok)]"
                    : tone === "brand"
                      ? "text-[var(--pf-brand)]"
                      : "text-[var(--pf-text)]"
                }`}
              >
                {formatPrice(value, entries[0]?.currency)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {FILTERS.map((option) => {
            const active = filter === option.id;
            return (
              <button
                key={option.id}
                onClick={() => selectFilter(option.id)}
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
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-[var(--pf-muted)]">
            <CalendarRange size={13} /> Last 60 days
          </span>
        </div>

        {entries.length ? (
          <div className="pf-card mt-3 overflow-hidden">
            <div className="hidden border-b border-[var(--pf-border)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[var(--pf-muted)] sm:flex sm:gap-4">
              <span className="min-w-0 flex-1">Description</span>
              <span className="w-28 shrink-0 text-right">Amount</span>
              <span className="w-28 shrink-0 text-right">Balance</span>
            </div>

            <div className="divide-y divide-[var(--pf-border)]">
              {entries.map((entry) => {
                const isCredit = entry.type === "credit";
                return (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:flex-nowrap"
                  >
                    <span
                      className={`hidden h-9 w-9 shrink-0 place-items-center rounded-full sm:grid ${
                        isCredit
                          ? "bg-[var(--pf-ok-bg)] text-[var(--pf-ok)]"
                          : "bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]"
                      }`}
                    >
                      {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </span>

                    <div className="min-w-0 sm:flex-1">
                      <p className="truncate text-sm font-semibold">{entry.description}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--pf-muted)]">
                        {entry.date} · Ref {entry.ref} · {entry.method} · {entry.status}
                      </p>
                    </div>

                    <div className="ml-auto flex items-center gap-4 sm:ml-0 sm:shrink-0">
                      <span
                        className={`w-24 text-right text-sm font-extrabold ${
                          isCredit ? "text-[var(--pf-ok)]" : "text-[var(--pf-text-2)]"
                        }`}
                      >
                        {isCredit ? "+" : "−"}
                        {formatPrice(entry.amount, entry.currency)}
                      </span>
                      <span className="hidden w-28 shrink-0 text-right text-sm font-semibold text-[var(--pf-muted)] sm:block">
                        {formatPrice(entry.balance, entry.currency)}
                      </span>
                      <span className="w-28 shrink-0 text-right text-[11px] text-[var(--pf-muted)] sm:hidden">
                        Bal {formatPrice(entry.balance, entry.currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="pf-card mt-3 grid place-items-center px-5 py-14 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
              <ReceiptText size={28} />
            </span>
            <h2 className="mt-4 font-display text-xl font-extrabold">No entries to show</h2>
            <p className="mt-2 max-w-sm text-sm text-[var(--pf-text-2)]">
              There are no {filter === "credit" ? "credit" : "debit"} entries in this period.
            </p>
            <button onClick={() => selectFilter("all")} className="pf-outline-btn mt-4">
              Show all entries
            </button>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={pagination.page <= 1}
              className="pf-outline-btn min-h-10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs font-semibold text-[var(--pf-muted)]">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPage((current) => current + 1)}
              disabled={pagination.page >= pagination.pages}
              className="pf-outline-btn min-h-10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </ProfileResourceState>

      <SectionNotice message={notice} />
    </ProfileSubpageFrame>
  );
}
