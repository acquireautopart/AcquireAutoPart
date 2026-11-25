"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { adminApi } from "@/features/admin/lib/adminApi";
import { Button } from "@/features/admin/shared/components/ui";

export function AdminSignIn({ onSuccess }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await adminApi.login({
        email: form.get("email"),
        password: form.get("password"),
      });
      onSuccess(result.admin);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f5f3] p-5 dark:bg-[#090909]">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-7 shadow-xl dark:border-neutral-800 dark:bg-[#111]"
      >
        <div className="mb-8 max-w-[230px]">
          <span className="block rounded-lg bg-[#101010] px-2 py-1">
            <img src="/logo.png" alt="AcquireAuto Parts" className="h-14 w-full object-contain" />
          </span>
          <small className="mt-2 block text-[8px] font-bold tracking-[.18em] text-neutral-500">ADMIN CONSOLE</small>
        </div>
        <div className="flex items-center gap-2 text-brand">
          <ShieldCheck size={16} />
          <span className="text-[10px] font-extrabold tracking-widest">SUPER ADMIN ACCESS</span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-extrabold">Sign in to your console</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Use the administrator credentials configured for this API.
        </p>
        <label className="mt-5 block text-xs font-bold">
          Email address
          <input
            type="email"
            name="email"
            required
            autoComplete="username"
            className="mt-1.5 h-11 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm outline-none focus:border-brand dark:border-neutral-700"
          />
        </label>
        <label className="mt-4 block text-xs font-bold">
          Password
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="mt-1.5 h-11 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm outline-none focus:border-brand dark:border-neutral-700"
          />
        </label>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={busy} className="mt-6 w-full">
          {busy ? "Signing in…" : "Sign in securely"}
        </Button>
      </form>
    </main>
  );
}
