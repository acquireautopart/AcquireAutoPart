"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, CheckCircle2, Clock, Circle, ShieldCheck, Upload, Lock } from "lucide-react";
import { profileApi } from "@/features/storefront/lib/profileApi";
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

const STEP_STYLE = {
  verified: {
    icon: CheckCircle2,
    tone: "text-[var(--pf-ok)]",
    chip: "bg-[var(--pf-ok-bg)] text-[var(--pf-ok)]",
    label: "Verified",
  },
  pending: {
    icon: Clock,
    tone: "text-[var(--pf-warn)]",
    chip: "bg-[var(--pf-warn-bg)] text-[var(--pf-warn)]",
    label: "Action needed",
  },
  none: {
    icon: Circle,
    tone: "text-[var(--pf-muted)]",
    chip: "bg-[var(--pf-card-2)] text-[var(--pf-muted)]",
    label: "Not started",
  },
};

/* These steps always need a document; email and phone are verified from the account. */
const DOCUMENT_STEPS = ["identity", "address", "bank"];

function KycStepModal({ step, onClose, onSubmitted }) {
  const isDocumentStep = DOCUMENT_STEPS.includes(step.id);
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const showPhoneHelp = error?.status === 400 && /mobile number/i.test(error.message || "");

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    if (isDocumentStep && !documentNumber.trim() && !documentUrl.trim()) {
      setError({
        status: 400,
        message: "Add a document number or an uploaded file before submitting.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = isDocumentStep
        ? { documentNumber: documentNumber.trim(), documentUrl: documentUrl.trim() }
        : {};
      await profileApi.submitKycStep(step.id, payload);
      onSubmitted(step);
    } catch (err) {
      setError({ status: err.status, message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProfileModal
      title={`Verify ${step.label}`}
      description={isDocumentStep ? step.detail : "We confirm this from your account details."}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isDocumentStep ? (
          <>
            <Field label="Document number" hint="Up to 60 characters. Optional.">
              <input
                className={PROFILE_INPUT}
                value={documentNumber}
                onChange={(event) => setDocumentNumber(event.target.value)}
                maxLength={60}
                placeholder="e.g. ABCDE1234F"
              />
            </Field>
            <Field
              label="Document URL"
              hint="Up to 500 characters. Optional — paste a link to your uploaded file."
            >
              <input
                className={PROFILE_INPUT}
                value={documentUrl}
                onChange={(event) => setDocumentUrl(event.target.value)}
                maxLength={500}
                placeholder="https://…"
              />
            </Field>
            <p className="flex items-start gap-2 rounded-lg bg-[var(--pf-card-2)] px-3 py-2 text-[11px] leading-5 text-[var(--pf-text-2)]">
              <Lock size={13} className="mt-0.5 shrink-0 text-[var(--pf-brand)]" />
              Add at least one of the two fields. The document number is encrypted before it is
              stored.
            </p>
          </>
        ) : (
          <p className="rounded-lg bg-[var(--pf-card-2)] px-3 py-2.5 text-xs leading-5 text-[var(--pf-text-2)]">
            We verify your {step.label.toLowerCase()} directly from your account. Nothing to upload
            — just confirm to continue.
          </p>
        )}

        {error && (
          <p className="text-xs font-semibold text-red-500" role="alert">
            {error.message}
            {showPhoneHelp && (
              <>
                {" "}
                <Link href="/profile/settings" className="underline">
                  Go to Account Settings
                </Link>
              </>
            )}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={PROFILE_BTN_GHOST}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className={PROFILE_BTN_PRIMARY}>
            {submitting ? "Submitting…" : isDocumentStep ? "Submit for review" : "Verify now"}
          </button>
        </div>
      </form>
    </ProfileModal>
  );
}

export default function KycPageClient() {
  const [notice, setNotice] = useSectionNotice();
  const [activeStep, setActiveStep] = useState(null);
  const { data, loading, error, reload } = useProfileResource(() => profileApi.kyc(), []);

  const kyc = data?.kyc;
  const steps = kyc?.steps || [];
  const level = kyc?.level ?? 0;
  const maxLevel = kyc?.maxLevel || 3;

  const verifiedCount = steps.filter((step) => step.status === "verified").length;
  const percent = maxLevel ? Math.round((level / maxLevel) * 100) : 0;

  function handleSubmitted(step) {
    setActiveStep(null);
    const isContact = step.id === "email" || step.id === "phone";
    setNotice(isContact ? `${step.label} verified` : `${step.label} submitted for review`);
    reload({ silent: true });
  }

  return (
    <ProfileSubpageFrame activeId="kyc">
      <header className="min-w-0">
        <h1 className="flex items-center gap-2.5 font-display text-2xl font-extrabold sm:text-3xl">
          <BadgeCheck size={24} className="shrink-0 text-[var(--pf-brand)]" strokeWidth={2} />
          KYC Status
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-[var(--pf-text-2)]">
          Verify your details to unlock higher order limits, faster refunds and payouts.
        </p>
      </header>

      <ProfileResourceState
        loading={loading}
        error={error}
        onRetry={() => reload()}
        signInLabel="Sign in to view your KYC status."
      >
        {kyc && (
          <>
            <section className="pf-card mt-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--pf-warn-bg)] text-[var(--pf-warn)]">
                  <ShieldCheck size={26} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-extrabold">
                      Verification level {level} of {maxLevel}
                    </h2>
                    <span className="rounded-full bg-[var(--pf-warn-bg)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--pf-warn)]">
                      {kyc.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--pf-text-2)]">
                    Complete the remaining steps below to reach full verification.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--pf-card-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--pf-brand)] transition-[width] duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--pf-muted)]">
                  <span>
                    {verifiedCount} of {steps.length} steps complete
                  </span>
                  <span className="font-bold text-[var(--pf-brand)]">{percent}%</span>
                </div>
              </div>
            </section>

            <h2 className="mt-5 font-display text-lg font-extrabold">Verification steps</h2>

            <div className="pf-card mt-3 divide-y divide-[var(--pf-border)] overflow-hidden">
              {steps.map((step) => {
                const style = STEP_STYLE[step.status] || STEP_STYLE.none;
                const Icon = style.icon;
                const isDocumentStep = DOCUMENT_STEPS.includes(step.id);
                return (
                  <div key={step.id} className="flex flex-wrap items-center gap-x-3 gap-y-3 p-4">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--pf-card-2)] ${style.tone}`}
                    >
                      <Icon size={19} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">{step.label}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.chip}`}
                        >
                          {style.label}
                        </span>
                      </div>
                      <p className="mt-0.5 break-words text-[11px] text-[var(--pf-muted)]">
                        {step.detail}
                      </p>
                    </div>

                    {step.status === "verified" ? (
                      <span className="shrink-0 text-xs font-semibold text-[var(--pf-ok)]">
                        Completed
                      </span>
                    ) : (
                      <button
                        onClick={() => setActiveStep(step)}
                        className={
                          step.status === "pending"
                            ? "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-[var(--pf-brand)] px-3.5 text-xs font-bold text-white hover:brightness-110"
                            : "pf-outline-btn min-h-10 shrink-0"
                        }
                      >
                        {isDocumentStep ? (
                          <>
                            <Upload size={14} /> {step.status === "pending" ? "Upload" : "Start"}
                          </>
                        ) : (
                          <>
                            <BadgeCheck size={14} /> Verify
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pf-card mt-4 flex items-start gap-3 p-4">
              <Lock size={18} className="mt-0.5 shrink-0 text-[var(--pf-brand)]" />
              <p className="min-w-0 text-xs leading-5 text-[var(--pf-text-2)]">
                Documents you upload are encrypted and used only to verify your identity. You can
                request deletion at any time from Contact Us.
              </p>
            </div>
          </>
        )}
      </ProfileResourceState>

      {activeStep && (
        <KycStepModal
          step={activeStep}
          onClose={() => setActiveStep(null)}
          onSubmitted={handleSubmitted}
        />
      )}

      <SectionNotice message={notice} />
    </ProfileSubpageFrame>
  );
}
