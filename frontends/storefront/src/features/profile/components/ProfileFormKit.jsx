"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Loader2, LogIn, AlertTriangle } from "lucide-react";
import { requestCustomerAuthDialog } from "@/lib/authApi";

/* Shared class names so every profile form matches the existing design. */
export const PROFILE_INPUT =
  "h-11 w-full rounded-lg border border-[var(--pf-border)] bg-[var(--pf-input)] px-3 text-sm text-[var(--pf-text)] outline-none placeholder:text-[var(--pf-muted)] focus:border-[var(--pf-brand)]";
export const PROFILE_LABEL = "mb-1.5 block text-xs font-semibold text-[var(--pf-text-2)]";
export const PROFILE_BTN_PRIMARY =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--pf-brand)] px-5 text-sm font-bold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60";
export const PROFILE_BTN_GHOST =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--pf-border)] px-5 text-sm font-semibold text-[var(--pf-text-2)] hover:border-[var(--pf-brand)] hover:text-[var(--pf-brand)] disabled:opacity-60";

/* Loads a profile resource and exposes loading / error / data plus a reload. */
export function useProfileResource(load, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setState((current) => ({ ...current, loading: true, error: null }));
    }
    try {
      const data = await loadRef.current();
      setState({ loading: false, error: null, data });
      return data;
    } catch (error) {
      if (error.name === "AbortError") return undefined;
      setState({ loading: false, error, data: null });
      return undefined;
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload, setData: (data) => setState((current) => ({ ...current, data })) };
}

export function ProfileLoading({ label = "Loading your account…" }) {
  return (
    <div className="pf-card mt-4 flex items-center justify-center gap-2 px-5 py-14 text-sm text-[var(--pf-text-2)]">
      <Loader2 size={18} className="animate-spin text-[var(--pf-brand)]" />
      {label}
    </div>
  );
}

export function ProfileSignIn({ label }) {
  return (
    <div className="pf-card mt-4 grid place-items-center px-5 py-14 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
        <LogIn size={28} />
      </span>
      <h2 className="mt-4 font-display text-xl font-extrabold">Please sign in to continue</h2>
      <p className="mt-2 max-w-sm text-sm text-[var(--pf-text-2)]">
        {label || "Sign in to your customer account to manage this section."}
      </p>
      <button
        type="button"
        onClick={requestCustomerAuthDialog}
        className={`${PROFILE_BTN_PRIMARY} mt-5`}
      >
        Go to sign in
      </button>
    </div>
  );
}

export function ProfileErrorState({ message, onRetry }) {
  return (
    <div className="pf-card mt-4 grid place-items-center px-5 py-14 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
        <AlertTriangle size={28} />
      </span>
      <h2 className="mt-4 font-display text-xl font-extrabold">Something went wrong</h2>
      <p className="mt-2 max-w-sm text-sm text-[var(--pf-text-2)]">
        {message || "We could not load this section."}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${PROFILE_BTN_GHOST} mt-5`}>
          Try again
        </button>
      )}
    </div>
  );
}

/* Renders loading / sign-in / error / content for a profile resource. */
export function ProfileResourceState({ loading, error, onRetry, signInLabel, children }) {
  if (loading) return <ProfileLoading />;
  if (error) {
    if (error.status === 401) return <ProfileSignIn label={signInLabel} />;
    return <ProfileErrorState message={error.message} onRetry={onRetry} />;
  }
  return children;
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className={PROFILE_LABEL}>{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[var(--pf-muted)]">{hint}</span>}
    </label>
  );
}

export function ProfileModal({ title, description, onClose, children, maxWidth = "max-w-lg" }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`pf-card w-full ${maxWidth} max-h-[92vh] overflow-y-auto rounded-b-none p-5 sm:rounded-xl sm:p-6`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-extrabold">{title}</h2>
            {description && <p className="mt-1 text-xs text-[var(--pf-text-2)]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--pf-border)] text-[var(--pf-muted)] hover:border-[var(--pf-brand)] hover:text-[var(--pf-brand)]"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
