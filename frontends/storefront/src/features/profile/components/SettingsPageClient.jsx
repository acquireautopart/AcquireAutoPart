"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Settings,
  UserRound,
  Bell,
  ShieldCheck,
  KeyRound,
  Trash2,
  Save,
  AlertTriangle,
} from "lucide-react";
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

const PREFERENCE_META = [
  {
    key: "orderUpdates",
    label: "Order & delivery updates",
    detail: "Email and SMS alerts about your orders",
  },
  {
    key: "priceDrops",
    label: "Price drop alerts",
    detail: "Tell me when a saved part gets cheaper",
  },
  {
    key: "newsletter",
    label: "Offers & newsletter",
    detail: "Deals, new arrivals and garage tips",
  },
  {
    key: "twoFactor",
    label: "Two-factor authentication",
    detail: "Extra verification code at sign-in",
  },
];

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-[var(--pf-brand)]" : "bg-[var(--pf-border)]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ChangePasswordModal({ onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setSaving(true);
    try {
      await profileApi.changePassword({ currentPassword, newPassword });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProfileModal
      title="Change password"
      description="Choose a strong password you do not use anywhere else."
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Current password">
          <input
            type="password"
            autoComplete="current-password"
            className={PROFILE_INPUT}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </Field>
        <Field label="New password" hint="At least 8 characters.">
          <input
            type="password"
            autoComplete="new-password"
            className={PROFILE_INPUT}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </Field>
        <Field label="Confirm new password">
          <input
            type="password"
            autoComplete="new-password"
            className={PROFILE_INPUT}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </Field>

        {error && (
          <p className="text-xs font-semibold text-red-500" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={PROFILE_BTN_GHOST}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={PROFILE_BTN_PRIMARY}>
            {saving ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </ProfileModal>
  );
}

export default function SettingsPageClient() {
  const { data, loading, error, reload, setData } = useProfileResource(
    () => profileApi.overview(),
    [],
  );
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notice, setNotice] = useSectionNotice();

  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.customer?.name || "",
      email: data.customer?.email || "",
      phone: data.customer?.phone || "",
    });
    setPreferences(data.preferences || null);
  }, [data]);

  async function saveProfile(event) {
    event.preventDefault();
    if (saving) return;
    setFormError("");
    setSaving(true);
    try {
      const result = await profileApi.updateSettings({
        name: form.name,
        email: form.email,
        phone: form.phone,
      });
      setData({ ...(data || {}), customer: result.customer, preferences: result.preferences });
      setForm({
        name: result.customer.name || "",
        email: result.customer.email || "",
        phone: result.customer.phone || "",
      });
      window.dispatchEvent(new CustomEvent("profile-customer-change", { detail: result.customer }));
      setNotice("Profile updated");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePreference(key, value) {
    const previous = preferences?.[key];
    setPreferences((current) => ({ ...current, [key]: value }));
    try {
      const result = await profileApi.updatePreferences({ [key]: value });
      setPreferences(result.preferences);
      setNotice("Preference updated");
    } catch (err) {
      setPreferences((current) => ({ ...current, [key]: previous }));
      setNotice(err.message || "Could not update preference");
    }
  }

  return (
    <ProfileSubpageFrame activeId="settings">
      <header className="min-w-0">
        <h1 className="flex items-center gap-2.5 font-display text-2xl font-extrabold sm:text-3xl">
          <Settings size={24} className="shrink-0 text-[var(--pf-brand)]" strokeWidth={2} />
          Account Settings
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-[var(--pf-text-2)]">
          Manage your personal details, notifications and account security.
        </p>
      </header>

      <ProfileResourceState
        loading={loading}
        error={error}
        onRetry={() => reload()}
        signInLabel="Sign in to manage your account settings."
      >
        {data && (
          <>
            <section className="pf-card mt-4 p-4 sm:p-5">
              <div className="flex items-center gap-2.5">
                <UserRound size={18} className="shrink-0 text-[var(--pf-brand)]" />
                <h2 className="font-display text-base font-extrabold">Profile information</h2>
              </div>

              <form onSubmit={saveProfile}>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Full name">
                    <input
                      id="settings-name"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, name: event.target.value }))
                      }
                      className={PROFILE_INPUT}
                      placeholder="Your name"
                    />
                  </Field>
                  <Field label="Email address">
                    <input
                      id="settings-email"
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, email: event.target.value }))
                      }
                      className={PROFILE_INPUT}
                      placeholder="you@example.com"
                    />
                  </Field>
                  <Field
                    label="Mobile number"
                    hint="Optional. Used for delivery and verification alerts."
                    className="sm:col-span-2"
                  >
                    <input
                      id="settings-phone"
                      value={form.phone}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, phone: event.target.value }))
                      }
                      className={PROFILE_INPUT}
                      placeholder="+91 00000 00000"
                    />
                  </Field>
                </div>

                {formError && (
                  <p className="mt-3 text-xs font-semibold text-red-500" role="alert">
                    {formError}
                  </p>
                )}

                <button type="submit" disabled={saving} className={`${PROFILE_BTN_PRIMARY} mt-4`}>
                  <Save size={16} /> {saving ? "Saving…" : "Save changes"}
                </button>
              </form>
            </section>

            <section className="pf-card mt-4 p-4 sm:p-5">
              <div className="flex items-center gap-2.5">
                <Bell size={18} className="shrink-0 text-[var(--pf-brand)]" />
                <h2 className="font-display text-base font-extrabold">
                  Notifications &amp; preferences
                </h2>
              </div>

              <div className="mt-2 divide-y divide-[var(--pf-border)]">
                {PREFERENCE_META.map((item) => (
                  <div key={item.key} className="flex items-center gap-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{item.label}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--pf-muted)]">{item.detail}</p>
                    </div>
                    <Switch
                      checked={Boolean(preferences?.[item.key])}
                      onChange={(value) => togglePreference(item.key, value)}
                      label={item.label}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="pf-card mt-4 p-4 sm:p-5">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={18} className="shrink-0 text-[var(--pf-brand)]" />
                <h2 className="font-display text-base font-extrabold">Security</h2>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setPasswordOpen(true)} className="pf-outline-btn min-h-11">
                  <KeyRound size={16} /> Change password
                </button>
              </div>
            </section>

            <section
              className="mt-4 rounded-xl border p-4 sm:p-5"
              style={{
                borderColor: "rgba(239, 68, 68, 0.35)",
                background: "rgba(239, 68, 68, 0.06)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="shrink-0 text-[#ef4444]" />
                <h2 className="font-display text-base font-extrabold text-[#ef4444]">
                  Danger zone
                </h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--pf-text-2)]">
                Deleting your account removes your orders, saved vehicles and wishlist permanently.
                This action cannot be undone. To delete your account, contact our support team.
              </p>
              <Link
                href="/profile/contact"
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#ef4444] px-4 text-sm font-bold text-[#ef4444] transition-colors hover:bg-[#ef4444] hover:text-white"
              >
                <Trash2 size={16} /> Contact support to delete
              </Link>
            </section>
          </>
        )}
      </ProfileResourceState>

      {passwordOpen && (
        <ChangePasswordModal
          onClose={() => setPasswordOpen(false)}
          onSuccess={() => {
            setPasswordOpen(false);
            setNotice("Password updated");
          }}
        />
      )}

      <SectionNotice message={notice} />
    </ProfileSubpageFrame>
  );
}
