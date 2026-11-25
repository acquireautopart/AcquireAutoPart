import OrdersPageClient from "@/features/profile/components/OrdersPageClient";

export default async function OrdersPage({ searchParams }) {
  const params = await searchParams;
  return (
    <OrdersPageClient
      initialQuery={params?.q || ""}
      initialType={params?.type || "orders"}
      initialPeriod={params?.period || "all"}
    />
  );
}
