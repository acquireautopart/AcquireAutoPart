"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Headphones,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  PackageCheck,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { requestAuth, requestCurrentCustomer } from "@/lib/authApi";
import { useMarket } from "@/features/storefront/lib/market";

function BrandMark() {
  return (
    <div className="flex items-center">
      <img src="https://res.cloudinary.com/l8vkwojw/image/upload/v1794229944/acquireauto/project-images/2563ce9d24339d6a1155dae32dd3e736.png" alt="AcquireAutoPart Logo" className="h-[72px] w-auto object-contain" />
    </div>
  );
}

export default function AuthDialog({ isOpen, customer, onAuthenticated, onClose }) {
  const { country } = useMarket();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;
    const controller = new AbortController();
    setCheckingSession(true);
    setError("");
    setNotice("");

    requestCurrentCustomer({ signal: controller.signal })
      .then(({ customer: currentCustomer }) => onAuthenticated(currentCustomer))
      .catch((requestError) => {
        if (requestError.name === "AbortError") return;
        if (requestError.status === 401) {
          onAuthenticated(null);
          return;
        }
        setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCheckingSession(false);
      });

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      controller.abort();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onAuthenticated, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const data = await requestAuth(mode, {
        method: "POST",
        body: JSON.stringify({ name, email, password, country }),
      });
      onAuthenticated(data.customer);
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const data = await requestAuth("logout", { method: "POST" });
      onAuthenticated(null);
      setMode("login");
      setName("");
      setPassword("");
      setNotice(data.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
    setPassword("");
    setShowPassword(false);
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-white/10 bg-[#171919] pl-12 pr-11 text-sm text-white outline-none transition placeholder:text-white/40 hover:border-white/20 focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00]/30";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/50 p-3 backdrop-blur-[7px] animate-[authFadeIn_.22s_ease-out] sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="theme-keep auth-dialog-grid relative h-[min(555px,calc(100dvh-24px))] w-full max-w-[865px] overflow-visible rounded-[24px] border border-[#ff8a24] bg-[#0d0e0e] text-white shadow-[0_0_24px_rgba(255,107,0,0.42),8px_0_28px_rgba(255,107,0,0.48)] animate-[authModalIn_.3s_cubic-bezier(.2,.8,.2,1)] sm:rounded-[28px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-auth-title"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Close Button - Circular exactly like image */}
        <button
          className="absolute -right-5 -top-5 z-50 grid h-10 w-10 place-items-center rounded-full border border-white/40 bg-[#121212] text-white shadow-[0_0_14px_rgba(255,126,35,0.42)] transition hover:bg-white hover:text-black sm:h-11 sm:w-11"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="absolute inset-0 z-0 grid grid-cols-1 overflow-hidden rounded-[inherit] lg:grid-cols-[49.5%_50.5%]">
          {/* Left Panel: Showcase - High Atmosphere */}
          <div className="auth-showcase auth-left-bg relative hidden min-h-0 flex-col justify-between overflow-hidden p-8 xl:p-10 lg:flex">
            <div className="relative z-10">
              <BrandMark />
              <div className="mt-4">
                <h3 className="text-[32px] font-bold leading-[1.08] tracking-[-.04em] text-white">
                  Drive Better <br />
                  <span className="block whitespace-nowrap">
                    with <span className="text-[26px] text-[#ff6b00]">AcquireAutoPart</span>
                  </span>
                </h3>
                <p className="mt-3 text-[15px] leading-snug text-white/75">
                  Premium Auto Parts for a <br />
                  Smoother Journey.
                </p>
              </div>
            </div>

            {/* <div className="auth-car-art absolute bottom-[110px] left-10 right-10 z-0 h-[195px] overflow-hidden">
            <img
              src="https://res.cloudinary.com/l8vkwojw/image/upload/v1794229941/acquireauto/project-images/64ff6b29128b589ae02a506f439597b5.png"
              alt=""
              aria-hidden="true"
              className="relative z-10 h-full w-full object-contain"
            />
          </div> */}
            <div className="relative z-0 flex min-h-0 flex-1 items-center justify-center">
              <img
                src="https://res.cloudinary.com/l8vkwojw/image/upload/v1794229941/acquireauto/project-images/64ff6b29128b589ae02a506f439597b5.png"
                alt="Performance car"
                className="relative z-10 h-full max-h-[285px] w-full scale-[1.35] object-contain drop-shadow-[0_22px_48px_rgba(0,0,0,1)]"
              />
            </div>

            <div className="relative z-10 mt-auto flex items-center justify-between border-t border-white/10 pt-4">
              {[
                { icon: ShieldCheck, label: "Trusted Quality" },
                { icon: PackageCheck, label: "Fast Delivery" },
                { icon: Headphones, label: "24/7 Support" },
              ].map(({ icon: Icon, label }) => (
                <div className="flex items-center gap-2" key={label}>
                  <Icon size={20} className="shrink-0 text-[#ff6b00]" strokeWidth={1.5} />
                  <span className="text-[10px] font-semibold leading-tight text-white/70">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Auth Form */}
          <div className="auth-form-panel relative flex min-h-0 flex-col justify-center px-6 py-8 sm:px-8 lg:px-7 lg:py-7 xl:px-10">
            {checkingSession ? (
              <div className="flex flex-1 items-center justify-center gap-4 text-sm text-white/50">
                <LoaderCircle className="animate-spin text-[#ff6b00]" size={24} />
                Establishing secure connection...
              </div>
            ) : customer ? (
              <div className="flex flex-1 flex-col justify-center">
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ff6b00]/10 text-[#ff6b00] shadow-[0_0_30px_rgba(255,107,0,0.15)]">
                  <UserRound size={32} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-3xl font-bold tracking-tight text-white">Customer Account</h2>
                  <span className="rounded-full border border-[#ff6b00]/35 bg-[#ff6b00]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#ff8a00]">
                    {customer.role || "customer"}
                  </span>
                </div>
                <div className="mt-8 space-y-2 rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                  <p className="text-base font-medium text-white/90">{customer.name}</p>
                  <p className="text-sm text-white/40">{customer.email}</p>
                </div>
                <a
                  href="/profile"
                  onClick={onClose}
                  className="mt-8 flex h-[56px] w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#ff8a00] to-[#f45a00] text-sm font-bold text-white shadow-[0_8px_22px_rgba(255,107,0,0.25)] transition hover:-translate-y-0.5"
                >
                  <UserRound size={20} />
                  View My Profile
                  <ArrowRight size={18} />
                </a>
                <button
                  className="mt-4 flex h-[56px] w-full items-center justify-center gap-3 rounded-xl border border-white/10 text-sm font-bold transition hover:border-[#ff6b00] hover:text-[#ff6b00] hover:bg-[#ff6b00]/5"
                  onClick={signOut}
                  disabled={submitting}
                >
                  {submitting ? (
                    <LoaderCircle className="animate-spin" size={20} />
                  ) : (
                    <LogOut size={20} />
                  )}
                  Sign Out from Portal
                </button>
              </div>
            ) : (
              <>
                <div className="auth-form-tabs flex h-12 gap-1 rounded-xl border border-white/10 bg-black/10 p-0.5">
                  <button
                    onClick={() => changeMode("login")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] text-sm font-bold transition-all duration-300 ${
                      mode === "login"
                        ? "bg-gradient-to-r from-[#ff8a00] to-[#f45a00] text-white shadow-[0_0_20px_rgba(255,107,0,0.35)]"
                        : "text-white/65 hover:text-white"
                    }`}
                  >
                    <UserRound size={20} /> Login
                  </button>
                  <button
                    onClick={() => changeMode("register")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] text-sm font-bold transition-all duration-300 ${
                      mode === "register"
                        ? "bg-gradient-to-r from-[#ff8a00] to-[#f45a00] text-white shadow-[0_0_20px_rgba(255,107,0,0.35)]"
                        : "text-white/65 hover:text-white"
                    }`}
                  >
                    <LockKeyhole size={20} /> Register
                  </button>
                </div>

                <div className="auth-form-heading mt-5">
                  <h2
                    id="customer-auth-title"
                    className="text-[27px] font-bold leading-tight tracking-tight text-white xl:text-[29px]"
                  >
                    {mode === "login" ? "Welcome Back!" : "Get Started"}
                  </h2>
                  <p className="mt-1 text-[14px] text-white/75">
                    {mode === "login"
                      ? "Sign in to your customer account"
                      : "Create a customer account to start your journey"}
                  </p>
                </div>

                <form className="auth-form mt-5 space-y-2.5" onSubmit={submit}>
                  {notice && (
                    <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                      {notice}
                    </div>
                  )}

                  {mode === "register" && (
                    <div className="relative">
                      <UserRound
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45"
                      />
                      <input
                        className={inputClass}
                        placeholder="Full Name"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45"
                    />
                    <input
                      className={inputClass}
                      type="email"
                      placeholder="Email Address"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45"
                    />
                    <input
                      className={inputClass}
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      autoComplete={
                        mode === "register" ? "new-password" : "current-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {mode === "login" && (
                    <div className="flex items-center justify-between">
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-white/10 bg-white/5 accent-[#ff6b00]"
                        />
                        <span className="text-xs text-white/75">Remember me</span>
                      </label>
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#ff8a00] hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff8a00] to-[#f45a00] text-[15px] font-bold text-white shadow-[0_8px_22px_rgba(255,107,0,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(255,107,0,0.4)] disabled:opacity-50"
                  >
                    {submitting ? (
                      <LoaderCircle className="animate-spin" size={20} />
                    ) : (
                      <>
                        {mode === "login" ? "Sign In" : "Register"} <ArrowRight size={19} />
                      </>
                    )}
                  </button>
                </form>

                <div className="auth-extra-divider mt-2.5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-xs font-medium text-white/70">or</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>

                <button className="auth-google-button mt-2.5 flex h-11 w-full items-center justify-center gap-3 rounded-xl bg-white text-sm font-bold text-[#0d0e0e] transition-all hover:bg-white/90">
                  <svg width="21" height="21" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.766 12.27c0-.796-.069-1.571-.197-2.314H12.48v4.382h6.323c-.269 1.416-1.045 2.616-2.213 3.414v2.836h3.577c2.092-1.927 3.299-4.764 3.299-7.318Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12.48 24c3.24 0 5.957-1.075 7.942-2.912l-3.577-2.836c-.992.67-2.266 1.069-3.577 1.069-3.136 0-5.789-2.119-6.735-4.97H2.912v2.93C4.897 21.173 8.474 24 12.48 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.745 15.251c-.24-.716-.378-1.482-.378-2.251 0-.769.138-1.535.378-2.251V7.819H2.912C2.105 9.447 1.645 11.271 1.645 13.2c0 1.929.46 3.753 1.267 5.381l2.833-2.93a7.815 7.815 0 0 1 0-4.4Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12.48 4.717c1.763 0 3.346.606 4.59 1.798l3.446-3.447C18.43 1.192 15.72 0 12.48 0 8.474 0 4.897 2.827 2.912 6.781l2.833 2.93c.946-2.851 3.599-4.994 6.735-4.994Z"
                    />
                  </svg>
                  Continue with Google
                </button>

                <p className="auth-footer mt-2.5 text-center text-xs text-white/70">
                  {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => changeMode(mode === "login" ? "register" : "login")}
                    className="font-bold text-[#ff8a00] hover:underline"
                  >
                    {mode === "login" ? "Register" : "Login"}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </section>
      <style jsx global>{`
        /* Left showcase background only */
        .auth-left-bg {
          isolation: isolate;
          background:
            radial-gradient(ellipse at 68% 68%, rgba(255, 103, 0, 0.2) 0%, transparent 38%),
            radial-gradient(ellipse at 4% 75%, rgba(255, 104, 0, 0.12) 0%, transparent 36%),
            linear-gradient(145deg, #030303 0%, #100a06 54%, #050505 100%);
        }

        .auth-left-bg::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            linear-gradient(
              132deg,
              transparent 49%,
              rgba(255, 99, 0, 0.02) 53%,
              rgba(255, 116, 0, 0.58) 54.5%,
              rgba(255, 116, 0, 0.14) 55.2%,
              transparent 59%
            ),
            linear-gradient(
              132deg,
              transparent 56%,
              rgba(255, 129, 18, 0.02) 59%,
              rgba(255, 129, 18, 0.32) 60%,
              rgba(255, 129, 18, 0.08) 60.5%,
              transparent 64%
            ),
            linear-gradient(
              132deg,
              transparent 62%,
              rgba(255, 121, 0, 0.34) 63%,
              rgba(255, 121, 0, 0.08) 63.5%,
              transparent 67%
            ),
            linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.34) 0%,
              rgba(0, 0, 0, 0.02) 42%,
              rgba(0, 0, 0, 0.16) 70%,
              rgba(0, 0, 0, 0.82) 100%
            );
        }

        .auth-left-bg::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse at 52% 72%, rgba(255, 110, 0, 0.15), transparent 43%),
            linear-gradient(90deg, rgba(0, 0, 0, 0.28), transparent 42%, rgba(0, 0, 0, 0.08)),
            linear-gradient(0deg, rgba(0, 0, 0, 0.42), transparent 38%);
        }

        .auth-left-bg > :not(.auth-car-art) {
          position: relative;
        }

        .auth-dialog-grid::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 30;
          pointer-events: none;
          border: 1px solid rgba(255, 137, 43, 0.68);
          border-right-color: #ff7a1a;
          border-bottom-color: rgba(255, 116, 21, 0.9);
          border-radius: inherit;
          box-shadow:
            inset -2px 0 5px rgba(255, 108, 0, 0.25),
            inset 0 -2px 5px rgba(255, 108, 0, 0.28);
        }

        .auth-car-art {
          background:
            radial-gradient(ellipse at 55% 90%, rgba(255, 104, 0, 0.3) 0%, transparent 55%),
            linear-gradient(145deg, #080706 0%, #17100b 52%, #090807 100%);
        }

        .auth-form-panel {
          background:
            radial-gradient(ellipse at 48% 38%, rgba(72, 72, 72, 0.26) 0%, transparent 58%),
            radial-gradient(ellipse at 100% 100%, rgba(255, 103, 0, 0.3) 0%, transparent 42%),
            linear-gradient(145deg, #1b1b1b 0%, #141414 48%, #0b0b0b 100%);
          box-shadow:
            inset 1px 0 rgba(255, 255, 255, 0.035),
            inset -2px 0 rgba(255, 112, 0, 0.55),
            inset 0 -2px rgba(255, 112, 0, 0.7);
        }

        .auth-form input:-webkit-autofill,
        .auth-form input:-webkit-autofill:hover,
        .auth-form input:-webkit-autofill:focus,
        .auth-form input:-webkit-autofill:active {
          -webkit-text-fill-color: #fff !important;
          -webkit-box-shadow: 0 0 0 1000px #171919 inset !important;
          box-shadow: 0 0 0 1000px #171919 inset !important;
          caret-color: #ff8a00;
          transition: background-color 99999s ease-out 0s;
        }

        .auth-form input:autofill {
          color: #fff !important;
          box-shadow: 0 0 0 1000px #171919 inset !important;
          caret-color: #ff8a00;
        }

        .auth-form-panel::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, transparent 40%, rgba(255, 105, 0, 0.55) 82%, #ff7415 100%)
              bottom / 100% 2px no-repeat,
            linear-gradient(0deg, #ff7415 0%, rgba(255, 105, 0, 0.22) 34%, transparent 100%) right /
              2px 46% no-repeat;
          filter: drop-shadow(0 0 7px rgba(255, 96, 0, 0.7));
        }

        @keyframes authFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes authModalIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="authFadeIn"],
          [class*="authModalIn"] {
            animation: none !important;
          }
        }
        @media (max-height: 560px) {
          .auth-dialog-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .auth-showcase {
            display: none !important;
          }
          .auth-form-panel {
            width: 100%;
            max-width: 520px;
            justify-self: center;
            padding-top: 10px !important;
            padding-bottom: 10px !important;
          }
          .auth-form-tabs {
            height: 40px !important;
          }
          .auth-form-heading {
            margin-top: 8px !important;
          }
          .auth-form {
            margin-top: 8px !important;
            row-gap: 6px !important;
          }
          .auth-form input:not([type="checkbox"]) {
            height: 40px !important;
          }
          .auth-form button[type="submit"] {
            height: 40px !important;
          }
          .auth-extra-divider,
          .auth-google-button,
          .auth-footer {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
