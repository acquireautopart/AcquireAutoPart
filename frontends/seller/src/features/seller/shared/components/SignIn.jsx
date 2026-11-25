import { useState } from "react";
import { Button, Field } from "@/features/seller/shared/components/ui";
import { sellerApi } from "@/features/seller/lib/sellerApi";

export function SignIn({ onSuccess, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (mode === "register") {
      if (String(payload.phone || "").replace(/\D/g, "").length < 7) {
        setError("Enter a valid mobile number.");
        return;
      }
      if (String(payload.address || "").trim().length < 10) {
        setError("Enter a complete pickup address.");
        return;
      }
      if (String(payload.password || "").length < 10) {
        setError("Password must be at least 10 characters.");
        return;
      }
      if (payload.password !== payload.confirmPassword) {
        setError("Password and confirm password do not match.");
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "forgot") {
        const result = await sellerApi.requestPasswordReset(payload);
        setNotice(result.message);
      } else if (mode === "login") {
        const result = await sellerApi.login(payload);
        onSuccess(result.seller);
      } else {
        const result = await sellerApi.register({
          phone: payload.phone,
          email: payload.email,
          address: payload.address,
          password: payload.password,
        });
        onSuccess(result.seller, { isNew: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f7f5] p-5 dark:bg-[#090909]">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-7 shadow-xl dark:border-neutral-800 dark:bg-[#111]"
      >
        <a href="/" className="mb-8 block max-w-[230px]">
          <span className="block rounded-lg bg-[#101010] px-2 py-1">
            <img src="/logo.png" alt="AcquireAuto Parts" className="h-14 w-full object-contain" />
          </span>
          <small className="mt-2 block text-[8px] font-bold tracking-[.18em] text-neutral-500">SELLER HUB</small>
        </a>
        <p className="text-[10px] font-extrabold tracking-[.15em] text-brand">SELLER ACCOUNT</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold">
          {mode === "login"
            ? "Welcome back"
            : mode === "forgot"
              ? "Reset your password"
              : "Create your seller account"}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {mode === "login"
            ? "Sign in to manage your store and orders."
            : mode === "forgot"
              ? "Enter your seller account email and we’ll send you a secure reset link."
              : "Your number, email, pickup address, and a password to get started."}
        </p>
        {mode === "register" && (
          <Field
            name="phone"
            label="Mobile number"
            type="tel"
            autoComplete="tel"
            placeholder="Include country code"
            required
          />
        )}
        <Field
          name="email"
          label="Email address"
          type="email"
          autoComplete="email"
          required
        />
        {mode === "register" && (
          <Field
            name="address"
            label="Pickup address"
            rows={3}
            autoComplete="street-address"
            placeholder="Street, area, city, state, PIN, landmark"
            hint="Where delivery partners pick up your parcels"
            required
          />
        )}
        {mode !== "forgot" && (
          <Field
            name="password"
            label="Password"
            type="password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            required
            hint={mode === "register" ? "At least 10 characters" : ""}
          />
        )}
        {mode === "register" && (
          <Field
            name="confirmPassword"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            required
          />
        )}
        {mode === "register" && (
          <p className="mt-2 text-[10px] leading-4 text-neutral-500">
            After this step you’ll complete your store details and identity verification.
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            {notice}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" className="mt-5 w-full" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : mode === "forgot"
                ? "Send reset link"
                : "Create seller account"}
        </Button>
        {mode === "login" && (
          <button
            type="button"
            onClick={() => {
              setMode("forgot");
              setError("");
              setNotice("");
            }}
            className="mt-4 w-full text-center text-xs font-semibold text-brand hover:underline"
          >
            Forgot password?
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "register" || mode === "forgot" ? "login" : "register");
            setError("");
            setNotice("");
          }}
          className="mt-5 w-full text-center text-xs text-neutral-500 hover:text-brand"
        >
          {mode === "register"
            ? "Already have a seller account? Sign in"
            : mode === "forgot"
              ? "Back to sign in"
              : "New to AcquireAuto? Create a seller account"}
        </button>
        <p className="mt-5 border-t border-neutral-100 pt-4 text-[10px] leading-5 text-neutral-400 dark:border-neutral-800">
          Seller accounts are separate from customer accounts. Use a secure password you do not use
          elsewhere.
        </p>
      </form>
    </main>
  );
}
