"use client";

import { useState } from "react";
import Link from "next/link";
import { CarFront } from "lucide-react";
import { Button, Field } from "@/features/seller/shared/components/ui";
import { sellerApi } from "@/features/seller/lib/sellerApi";

export default function ResetPassword({ token }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }

    try {
      await sellerApi.resetPassword({ token, password });
      setComplete(true);
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f7f5] p-5 dark:bg-[#090909]">
      <section className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-7 shadow-xl dark:border-neutral-800 dark:bg-[#111]">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white">
            <CarFront size={25} />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">
            Acquire<span className="text-brand">auto</span>
            <small className="block text-[8px] tracking-[.18em] text-neutral-400">SELLER HUB</small>
          </span>
        </Link>
        {complete ? (
          <>
            <h1 className="font-display text-2xl font-extrabold">Password updated</h1>
            <p className="mt-2 text-sm text-neutral-500">
              Your seller password has been reset. Sign in with your new password.
            </p>
            <Link
              className="mt-5 inline-flex min-h-9 w-full items-center justify-center rounded-lg bg-brand px-3 text-xs font-bold text-white hover:bg-brand-dark"
              href="/seller"
            >
              Return to seller sign in
            </Link>
          </>
        ) : (
          <>
            <p className="text-[10px] font-extrabold tracking-[.15em] text-brand">
              SELLER ACCOUNT
            </p>
            <h1 className="mt-2 font-display text-2xl font-extrabold">Choose a new password</h1>
            <p className="mt-2 text-sm text-neutral-500">
              Use at least 10 characters. This reset link expires after 30 minutes.
            </p>
            <form className="mt-2" onSubmit={submit}>
              <Field
                name="password"
                label="New password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
              />
              <Field
                name="confirmPassword"
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
              />
              {error && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
                >
                  {error}
                </p>
              )}
              <Button type="submit" variant="primary" className="mt-5 w-full" disabled={busy || !token}>
                {busy ? "Please wait…" : "Reset password"}
              </Button>
              {!token && (
                <p className="mt-3 text-center text-xs text-red-600" role="alert">
                  This password reset link is invalid or has expired.
                </p>
              )}
            </form>
            <Link className="mt-5 block text-center text-xs text-neutral-500 hover:text-brand" href="/seller">
              Back to seller sign in
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
