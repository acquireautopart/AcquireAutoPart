"use client";

import { useEffect, useState } from "react";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import { BannersSection } from "@/features/admin/settings/components/BannersSection";
import { PageHeading } from "@/features/admin/shared/components/ui";
import { adminApi } from "@/features/admin/lib/adminApi";

export default function BannersPage() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    adminApi
      .settings()
      .then((data) => setSettings(data.settings))
      .catch(() => setSettings(null));
  }, []);

  async function saveSettings(value) {
    try {
      await adminApi.updateSettings(value);
      const data = await adminApi.settings();
      setSettings(data.settings);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <AdminPageLayout activeSection="Banners & content">
      <PageHeading title="Banners & content" sub="Manage storefront announcements and banners" />
      <BannersSection settings={settings} onSave={saveSettings} busy={false} />
    </AdminPageLayout>
  );
}
