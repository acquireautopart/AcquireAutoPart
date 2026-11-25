import SiteHeader from "@/features/storefront/components/SiteHeader";
import PromoStrip from "@/features/storefront/components/PromoStrip";
import CategoryGrid from "@/features/storefront/components/CategoryGrid";
import ProductSection from "@/features/storefront/components/ProductSection";
import FeatureBand from "@/features/storefront/components/FeatureBand";
import SiteFooter from "@/features/storefront/components/SiteFooter";
import PopularModels from "@/features/storefront/components/PopularModels";
import ServiceHighlights from "@/features/storefront/components/ServiceHighlights";
import BrandShowcase from "@/features/storefront/components/BrandShowcase";
import MarketplaceHighlights from "@/features/storefront/components/MarketplaceHighlights";
import AppPromotion from "@/features/storefront/components/AppPromotion";
import SellerCallout from "@/features/storefront/components/SellerCallout";
import VehicleSearchForm from "@/features/storefront/components/VehicleSearchForm";
import DeferredHeroVideo from "@/features/storefront/components/DeferredHeroVideo";
import RepairGuides from "@/features/storefront/components/RepairGuides";
import HomeProductShelf from "@/features/storefront/components/HomeProductShelf";

export default function HomePage() {
  return (
    <>
      <PromoStrip />
      <SiteHeader />
      <main>
        <section className="relative isolate overflow-hidden bg-[#171916]">
          <DeferredHeroVideo />
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#11130f]/90 via-[#11130f]/65 to-[#11130f]/35" />
          <div className="relative z-20 mx-auto grid w-[calc(100%-2rem)] max-w-[1224px] grid-cols-1 items-center gap-8 pb-20 pt-12 sm:w-[calc(100%-3rem)] sm:gap-10 sm:py-16 lg:min-h-[610px] lg:grid-cols-[minmax(0,1fr)_minmax(460px,500px)] lg:py-20 xl:grid-cols-[minmax(0,1fr)_minmax(500px,560px)]">
            <div className="mx-auto w-full max-w-[610px] text-white lg:mx-0">
              <span className="text-[10px] font-extrabold uppercase tracking-[.18em] text-brand">
                THE ROAD-READY STORE
              </span>
              <h1 className="mt-4 font-display text-[clamp(2.25rem,8vw,4.5rem)] font-extrabold leading-[.98] tracking-[-.065em] sm:text-7xl">
                Parts that keep
                <br />
                <em className="font-semibold text-brand">you moving.</em>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-white/80 sm:text-lg">
                Browse products listed by approved sellers. Review fitment details, seller pricing,
                and stock before you order.
              </p>
              <a
                className="button mt-7 bg-brand text-white transition hover:bg-brand-dark"
                href="#popular"
              >
                Shop popular parts <span aria-hidden="true">↗</span>
              </a>
              <p className="mt-3 text-[10px] text-white/60">
                Engine repair footage from{" "}
                <a
                  className="underline underline-offset-2 hover:text-white"
                  href="https://mixkit.co/free-stock-video/mechanic-repairing-a-car-engine-4716/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Mixkit
                </a>{" "}
              </p>
            </div>
            <VehicleSearchForm />
          </div>
        </section>

        <HomeProductShelf title="Still looking for these?" mode="recent" sort="popular" />
        <HomeProductShelf title="Top Value Deals" mode="deals" sort="price-low" />

        <div className="border-b border-line bg-ink text-white">
          <div className="site-container grid gap-5 py-5 sm:grid-cols-3 sm:gap-8">
            {[
              ["✓", "Fitment-first shopping", "Choose your vehicle to get started"],
              ["↗", "Parts for real life", "Everyday repairs to weekend projects"],
              ["◎", "Here to help", "Support when you need it"],
            ].map(([icon, title, detail]) => (
              <div className="flex items-center gap-3" key={title}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-lg font-bold text-brand">
                  {icon}
                </span>
                <span>
                  <strong className="block text-sm">{title}</strong>
                  <small className="mt-1 block text-xs text-white/60">{detail}</small>
                </span>
              </div>
            ))}
          </div>
        </div>

        <PopularModels />

        <section className="site-container section-pad">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FIND YOUR FIX</span>
              <h2 className="section-title">Shop by category</h2>
            </div>
            <a className="text-link hidden sm:block" href="#popular">
              Explore all parts <span className="ml-2 text-brand">→</span>
            </a>
          </div>
          <CategoryGrid />
        </section>

        <section className="section-pad bg-white" id="popular">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">CUSTOMER FAVORITES</span>
                <h2 className="section-title">Popular parts</h2>
                <p className="mt-3 text-sm text-muted">
                  The essentials to get your vehicle back on the road.
                </p>
              </div>
              <a className="text-link hidden sm:block" href="#categories">
                Shop all parts <span className="ml-2 text-brand">→</span>
              </a>
            </div>
            <ProductSection lazyLoad sort="popular" homePage />
          </div>
        </section>
        <section className="section-pad" id="best-selling">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">MOST PURCHASED</span>
                <h2 className="section-title">Best-selling parts</h2>
                <p className="mt-3 text-sm text-muted">
                  Ranked using recorded product sales from approved sellers.
                </p>
              </div>
              <a className="text-link hidden sm:block" href="/parts">
                Browse all parts <span className="ml-2 text-brand">→</span>
              </a>
            </div>
            <ProductSection lazyLoad sort="best-selling" homePage />
          </div>
        </section>
        <section className="section-pad bg-white" id="top-rated">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">VERIFIED CUSTOMER REVIEWS</span>
                <h2 className="section-title">Top-rated parts</h2>
                <p className="mt-3 text-sm text-muted">
                  Highest-rated products, based on reviews from customers who received them.
                </p>
              </div>
              <a className="text-link hidden sm:block" href="/parts">
                Browse all parts <span className="ml-2 text-brand">→</span>
              </a>
            </div>
            <ProductSection lazyLoad sort="top-rated" homePage />
          </div>
        </section>
        <RepairGuides />
        <ServiceHighlights />
        <FeatureBand />
        <BrandShowcase />
        <MarketplaceHighlights />
        <AppPromotion />
        <SellerCallout />
      </main>
      <SiteFooter />
    </>
  );
}
