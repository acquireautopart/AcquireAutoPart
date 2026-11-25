import { notFound } from "next/navigation";
import WishlistPageClient from "@/features/profile/components/WishlistPageClient";
import VehiclesPageClient from "@/features/profile/components/VehiclesPageClient";
import AddressesPageClient from "@/features/profile/components/AddressesPageClient";
import PaymentsPageClient from "@/features/profile/components/PaymentsPageClient";
import WalletPageClient from "@/features/profile/components/WalletPageClient";
import LedgerPageClient from "@/features/profile/components/LedgerPageClient";
import KycPageClient from "@/features/profile/components/KycPageClient";
import ReturnsPageClient from "@/features/profile/components/ReturnsPageClient";
import SettingsPageClient from "@/features/profile/components/SettingsPageClient";
import ContactPageClient from "@/features/profile/components/ContactPageClient";

// Every profile section has a dedicated, fully designed page.
const dedicatedPages = {
  wishlist: WishlistPageClient,
  vehicles: VehiclesPageClient,
  addresses: AddressesPageClient,
  payments: PaymentsPageClient,
  wallet: WalletPageClient,
  ledger: LedgerPageClient,
  kyc: KycPageClient,
  returns: ReturnsPageClient,
  settings: SettingsPageClient,
  contact: ContactPageClient,
};

export default async function ProfileSectionPage({ params }) {
  const { section } = await params;
  const DedicatedPage = dedicatedPages[section];
  if (!DedicatedPage) notFound();

  return <DedicatedPage />;
}
