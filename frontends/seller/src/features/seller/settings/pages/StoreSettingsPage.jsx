"use client";

import { PageHeading } from "@/features/seller/shared/components/ui";
import { SettingsForm } from "@/features/seller/settings/components/SettingsForm";

export function StoreSettingsPage({ seller, saveSettings, formBusy }) {
  return (
    <>
      <PageHeading title="Store settings" sub="Manage your store profile, shipping and returns" />
      <SettingsForm seller={seller} onSubmit={saveSettings} busy={formBusy} />
    </>
  );
}
