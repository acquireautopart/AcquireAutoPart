import Link from "next/link";
import { ArrowRight, CarFront } from "lucide-react";
import SiteHeader from "@/features/storefront/components/SiteHeader";
import SiteFooter from "@/features/storefront/components/SiteFooter";
import ProductSection from "@/features/storefront/components/ProductSection";
import { navItems } from "@/features/storefront/data/storefront";

export default function CategoryPage({ category }) {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative isolate overflow-hidden bg-[#10100f] text-white">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-40 -z-10 h-[28rem] w-[28rem] rounded-full bg-brand/20 blur-[100px]"
          />
          <div className="site-container py-10 sm:py-14 lg:py-[72px]">
            <nav aria-label="Breadcrumb" className="mb-8 text-xs font-semibold text-white/55">
              <Link className="transition hover:text-white" href="/">
                Home
              </Link>
              <span className="mx-2 text-white/30">/</span>
              <span className="text-white/75">Shop by category</span>
            </nav>

            <div className="max-w-3xl">
              <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-brand">
                SHOP BY CATEGORY
              </p>
              <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-[-.045em] text-white sm:text-5xl lg:text-6xl">
                {category.label}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
                Find the parts you need from the AcquireautoParts marketplace. Select your vehicle
                to check fitment before you buy.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-[#10100f]"
                  href="/#vehicle-search"
                >
                  <CarFront size={17} />
                  Choose your vehicle
                  <ArrowRight size={16} />
                </Link>
                <a
                  className="inline-flex min-h-11 items-center rounded-md border border-white/20 px-5 text-sm font-bold text-white transition hover:border-brand hover:text-brand"
                  href="#category-products"
                >
                  Browse products
                </a>
              </div>
            </div>

            <nav aria-label="Product categories" className="mt-10 border-t border-white/10 pt-5">
              <ul className="flex gap-2 overflow-x-auto pb-2">
                {navItems.map((item) => {
                  const isActive = item.slug === category.slug;
                  return (
                    <li className="shrink-0" key={item.slug}>
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-xs font-semibold transition ${
                          isActive
                            ? "border-brand bg-brand text-white"
                            : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
                        }`}
                        href={item.href}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </section>

        <section
          className="bg-[#f7f7f5] py-10 text-[#171916] dark:bg-[#090909] dark:text-white sm:py-14"
          id="category-products"
        >
          <div className="site-container">
            <div className="mb-6 flex flex-col gap-2 border-b border-line-light pb-5 dark:border-neutral-800 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-brand">
                  AVAILABLE PRODUCTS
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Shop {category.label}
                </h2>
              </div>
              <p className="max-w-md text-xs leading-5 text-neutral-500 dark:text-neutral-400 sm:text-right">
                Product fitment can vary by vehicle. Choose your vehicle to find parts that match.
              </p>
            </div>
            <ProductSection category={category} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
