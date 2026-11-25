import ResetPassword from "@/features/seller/shared/components/ResetPassword";

export default async function ResetSellerPasswordPage({ searchParams }) {
  const { token = "" } = await searchParams;
  return <ResetPassword token={token} />;
}
