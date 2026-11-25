"use client";

import { useEffect, useState } from "react";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import { SettingsSection } from "@/features/admin/settings/components/SettingsSection";
import { PageHeading } from "@/features/admin/shared/components/ui";
import { adminApi } from "@/features/admin/lib/adminApi";

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    adminApi
      .settings()
      .then((data) => {
        setSettings(data.settings);
        setError("");
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  async function saveSettings(value) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const data = await adminApi.updateSettings(value);
      setSettings(data.settings);
      setSuccess("Marketplace settings saved.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPageLayout activeSection="Settings">
      <PageHeading title="Settings" sub="Marketplace controls and platform policy" />
      {loading ? (
        <p className="rounded-xl border border-neutral-200 p-5 text-sm text-neutral-500 dark:border-neutral-800">
          Loading marketplace settings…
        </p>
      ) : settings ? (
        <SettingsSection
          settings={settings}
          onSave={saveSettings}
          busy={saving}
          error={error}
          success={success}
        />
      ) : (
        <p role="alert" className="rounded-xl border border-red-200 p-5 text-sm text-red-700">
          Could not load marketplace settings: {error}
        </p>
      )}
    </AdminPageLayout>
  );
}
