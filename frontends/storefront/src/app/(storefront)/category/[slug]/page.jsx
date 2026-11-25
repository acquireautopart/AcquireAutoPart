import { notFound } from "next/navigation";
import { navItems } from "@/features/storefront/data/storefront";
import CategoryPage from "@/features/storefront/pages/CategoryPage";

export function generateStaticParams() {
  return navItems.map(({ slug }) => ({ slug }));
}

export default async function CategoryRoute({ params }) {
  const { slug } = await params;
  const category = navItems.find((item) => item.slug === slug);
  if (!category) notFound();

  return <CategoryPage category={category} />;
}
