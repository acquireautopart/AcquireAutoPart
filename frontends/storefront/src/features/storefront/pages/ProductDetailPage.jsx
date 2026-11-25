import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, Star } from "lucide-react";
import ProductBuyBox from "@/features/storefront/components/ProductBuyBox";
import ProductImageZoom from "@/features/storefront/components/ProductImageZoom";
import ProductReviews from "@/features/storefront/components/ProductReviews";
import ProductAlertControl from "@/features/storefront/components/ProductAlertControl";
import { RecentlyViewedTracker } from "@/features/storefront/components/HomeProductShelf";
import PromoStrip from "@/features/storefront/components/PromoStrip";
import SiteHeader from "@/features/storefront/components/SiteHeader";
import SiteFooter from "@/features/storefront/components/SiteFooter";
import { formatPrice } from "@/features/storefront/lib/format";
import { getImageUrl } from "@/features/storefront/lib/imageUrl";

function getImageSource(image) {
  return image ? getImageUrl(image) : "";
}

function getProductMedia(product) {
  const images = [product.gallery, product.images, product.media].find(
    (value) => Array.isArray(value) && value.length > 0,
  );
  const entries = images || [product.image];
  const items = entries.flatMap((entry) => {
    if (typeof entry === "string") {
      if (!entry.trim()) return [];
      return [{ type: "image", src: getImageSource(entry), alt: product.name }];
    }

    if (!entry || typeof entry !== "object") return [];

    const src = entry.src || entry.url || entry.image;
    if (!src) return [];

    return [
      {
        type: entry.type === "video" ? "video" : "image",
        src: entry.type === "video" ? src : getImageSource(src),
        poster: entry.poster ? getImageSource(entry.poster) : undefined,
        alt: entry.alt || product.name,
      },
    ];
  });

  const videos = [product.video, ...(Array.isArray(product.videos) ? product.videos : [])].filter(
    Boolean,
  );

  for (const video of videos) {
    const src = typeof video === "string" ? video : video.src || video.url;
    if (!src) continue;
    items.push({
      type: "video",
      src,
      poster: typeof video === "object" && video.poster ? getImageSource(video.poster) : undefined,
      alt: product.name,
    });
  }

  return items;
}

export default async function ProductDetailPage({ params, searchParams }) {
  const { id } = await params;
  const { country = "US" } = await searchParams;
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(
    /\/+$/,
    "",
  );
  const response = await fetch(
    `${apiBase}/catalog/products/${encodeURIComponent(id)}?country=${encodeURIComponent(country)}`,
    { cache: "no-store", signal: AbortSignal.timeout(8000) },
  );
  if (response.status === 404) notFound();
  const productData = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(productData?.message || "Unable to load this marketplace product.");
  }
  const sellerProduct = productData?.product;
  if (!sellerProduct) throw new Error("The product service returned an invalid response.");
  const product = {
    ...sellerProduct,
    sellerListing: true,
    image: sellerProduct.images?.[0] || "",
    oldPrice: sellerProduct.compareAtPrice || null,
    variant: sellerProduct.variants?.[0]?.name || "",
  };

  const structuredFitmentLabel = (product.fitments || []).map((fitment) => {
    const years = fitment.yearFrom || fitment.yearTo ? `${fitment.yearFrom || "…"}-${fitment.yearTo || "…"}` : "";
    return [years, fitment.make, fitment.model, fitment.trim, fitment.engine].filter(Boolean).join(" ");
  }).join("; ");
  const vehicleLabel = product.fitment || structuredFitmentLabel;
  const productMedia = getProductMedia(product);
  const hasDiscount = product.oldPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;
  const savings = hasDiscount ? product.oldPrice - product.price : 0;
  const matchPartsHref = product.fitment
    ? `/parts?${new URLSearchParams({ q: product.fitment, country }).toString()}`
    : "/parts";

  const aboutItems = [
    `Replacement ${product.category ? product.category.toLowerCase() : "auto part"} listed as ${
      product.variant ? product.variant.toLowerCase() : "a standard replacement"
    }.`,
    `${product.brand ? `${product.brand} part number ${product.sku || product.id}.` : `Part number ${product.sku || product.id}.`} Match it against the part you are replacing before ordering.`,
    product.partNumber ? `Manufacturer / interchange part number: ${product.partNumber}. Search this number to find cross-reference listings, then confirm the replacement with the seller.` : "Ask the seller for the manufacturer or interchange number if you need to cross-reference this part.",
    vehicleLabel
      ? `Seller-provided fitment: ${vehicleLabel}${product.variant ? ` (${product.variant})` : ""}.`
      : "No vehicle fitment was provided. Confirm compatibility with the seller before ordering.",
    `Listed by ${product.storeName || "an AcquireAuto seller"}. Contact the seller if you need to confirm fitment.`,
  ];

  let relatedProducts = [];
  if (product.category) {
    const relatedParams = new URLSearchParams({
      country,
      category: product.category,
      pageSize: "5",
    });
    const relatedResponse = await fetch(`${apiBase}/catalog/products?${relatedParams}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const relatedData = await relatedResponse.json().catch(() => null);
    if (!relatedResponse.ok) {
      throw new Error(relatedData?.message || "Unable to load related products.");
    }
    relatedProducts = (relatedData.products || [])
      .filter((item) => item.id !== product.id)
      .slice(0, 4)
      .map((item) => ({ ...item, image: item.images?.[0] || "" }));
  }

  const detailRows = [
    ["Brand", product.brand],
    ["Part number", product.sku || product.id],
    ["Manufacturer part number", product.partNumber],
    ["Product type", product.category],
    ["Variant", product.variant],
    ["Compatible vehicle", vehicleLabel],
    ["Condition", product.condition || "New"],
    ["Warranty", product.warranty],
  ].filter(([, value]) => Boolean(value));

  // Short spec list shown under the gallery, like Amazon's key-facts table.
  const specRows = [
    ["Brand", product.brand],
    ["Product type", product.category],
    ["Manufacturer part number", product.partNumber],
    ["Variant", product.variant],
    ["Compatible vehicle", vehicleLabel],
    ["Condition", product.condition || "New"],
    ["Warranty", product.warranty],
  ].filter(([, value]) => Boolean(value));
  const compareProducts = [product, ...relatedProducts.slice(0, 3)];

  return (
    <>
      <PromoStrip />
      <SiteHeader />
      <RecentlyViewedTracker product={product} />
      <main className="min-h-[70vh] bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-4 pb-12 pt-3 sm:px-6 lg:px-8">
          <nav
            className="flex flex-wrap items-center gap-1 text-[12px] text-[#686b65]"
            aria-label="Breadcrumb"
          >
            <Link className="hover:text-[#e9562e] hover:underline" href="/">
              Home
            </Link>
            <ChevronRight size={12} className="shrink-0" />
            <Link className="hover:text-[#e9562e] hover:underline" href="/parts">
              Product list
            </Link>
            {product.category && (
              <>
                <ChevronRight size={12} className="shrink-0" />
                <span className="truncate">{product.category}</span>
              </>
            )}
            <ChevronRight size={12} className="shrink-0" />
            <span className="truncate font-semibold text-[#20221f]">{product.name}</span>
          </nav>

          <div className="mt-4 grid items-start gap-6 lg:grid-cols-[352px_minmax(0,1fr)_236px] xl:grid-cols-[420px_minmax(0,1fr)_284px] xl:gap-8">
            {/* Gallery stays pinned while the description scrolls, like Amazon. */}
            <div className="lg:sticky lg:top-4 lg:self-start">
              <ProductImageZoom items={productMedia} alt={product.name} />

              {specRows.length > 0 && (
                <table className="mt-5 w-full border-collapse text-[11px]">
                  <tbody>
                    {specRows.map(([label, value]) => (
                      <tr key={label} className="border-b border-[#ececea]">
                        <th className="w-[45%] py-1.5 pr-3 text-left align-top font-normal text-[#686b65]">
                          {label}
                        </th>
                        <td className="py-1.5 align-top font-semibold text-[#292b27]">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="relative min-w-0">
              {/* Target for the ProductImageZoom portal to cover the description column */}
              <div id="product-zoom-portal" className="absolute inset-0 z-30 pointer-events-none" />

              <section className="min-w-0">
                <h1 className="text-xl font-bold leading-snug text-[#20221f] sm:text-2xl">
                  {product.name}
                </h1>

                {product.brand && (
                  <p className="mt-1.5 text-sm text-[#464942]">
                    Visit the{" "}
                    <Link className="font-medium text-[#e9562e] hover:underline" href="/parts">
                      {product.brand} Store
                    </Link>
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#464942]">
                  <span className="flex items-center gap-0.5" aria-label={`${product.ratingAverage || 0} out of 5 customer rating`}>
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star key={index} size={14} className={index < Math.round(product.ratingAverage || 0) ? "fill-amber-400 text-amber-400" : "text-[#c8cbc6]"} />
                    ))}
                  </span>
                  <span className="font-semibold text-[#20221f]">{product.ratingCount ? Number(product.ratingAverage).toFixed(1) : "No ratings yet"}</span>
                  {product.ratingCount > 0 && <span className="text-[#686b65]">({product.ratingCount} verified {product.ratingCount === 1 ? "rating" : "ratings"})</span>}
                  {product.tag && (
                    <>
                      <span className="text-[#c8cbc6]">|</span>
                      <span className="font-semibold text-[#777a73]">{product.tag}</span>
                    </>
                  )}
                </div>

                <div className="mt-4 border-y border-[#ececea] py-4">
                  {hasDiscount && (
                    <p className="text-lg font-medium text-[#d14a1f]">-{discountPercent}%</p>
                  )}
                  <p className="flex items-baseline gap-2">
                    <span className="text-3xl font-medium tracking-tight text-[#20221f]">
                      {product.sellerListing && product.variants?.length
                        ? `From ${formatPrice(Math.min(...product.variants.map((variant) => variant.price)), product.currency || "USD")}`
                        : formatPrice(product.price, product.currency || "USD")}
                    </span>
                  </p>
                  {hasDiscount && (
                    <p className="mt-1 text-xs text-[#686b65]">
                      M.R.P.: <del>{formatPrice(product.oldPrice, product.currency || "USD")}</del>
                    </p>
                  )}
                  {hasDiscount && (
                    <p className="mt-0.5 text-xs text-[#686b65]">
                      You Save:{" "}
                      <span className="font-semibold">
                        {formatPrice(savings, product.currency || "USD")}
                      </span>{" "}
                      ({discountPercent}%)
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-[#686b65]">Inclusive of all taxes</p>
                </div>

                <p className="mt-3 text-xs leading-5 text-[#464942]">
                  <span className="font-bold">
                    {product.sellerListing ? "Seller shipping" : "FREE delivery"}
                  </span>{" "}
                  — estimated dispatch in{" "}
                  <span className="font-semibold">
                    {product.sellerListing
                      ? `${product.shippingDays || 3} business days`
                      : "3–5 business days"}
                  </span>
                  .{" "}
                  {product.sellerListing
                    ? "Shipping and tax are confirmed at checkout."
                    : "Demo listing: delivery estimates are not verified."}
                </p>

                {product.sellerListing && (
                  <section className="mt-3 rounded-lg border border-[#e5e5e2] bg-[#fafaf9] p-3" aria-label="Seller return terms">
                    <p className="text-xs font-extrabold text-[#20221f]">Returns from this seller</p>
                    <p className="mt-1 text-xs text-[#464942]">
                      {product.returnWindowDays === 0 ? "This seller lists the item as final sale." : `${product.returnWindowDays ?? 30}-day return window, subject to the seller's policy.`}
                    </p>
                    {product.returnPolicy && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#686b65]">{product.returnPolicy}</p>}
                  </section>
                )}

                <section className="mt-6">
                  <h2 className="text-base font-bold text-[#20221f]">About this item</h2>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-[#464942]">
                    {aboutItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                    Vehicle fitment is provided by the seller and has not been independently verified. Confirm year, make, model, engine and trim with the seller before ordering.
                  </p>
                </section>

                <Link
                  className="mt-4 inline-flex text-sm font-semibold text-[#e9562e] hover:underline"
                  href="#productDetails"
                >
                  › See more product details
                </Link>

                <p className="mt-3">
                  <Link
                    className="text-sm font-semibold text-[#e9562e] underline underline-offset-4"
                    href={matchPartsHref}
                  >
                    See all parts that match this vehicle
                  </Link>
                </p>
                {product.partNumber && (
                  <p className="mt-2">
                    <Link className="text-sm font-semibold text-[#e9562e] underline underline-offset-4" href={`/parts?${new URLSearchParams({ q: product.partNumber, country }).toString()}`}>
                      Find matching part-number listings
                    </Link>
                  </p>
                )}
              </section>

              <section id="productDescription" className="mt-8 border-t border-[#ececea] pt-6">
                <h2 className="text-lg font-bold text-[#20221f]">Product description</h2>
                <p className="mt-3 text-sm leading-6 text-[#464942]">
                  {product.description ||
                    `${product.name} listed in the ${product.category || "auto parts"} category.${
                      vehicleLabel ? ` Compatible with ${vehicleLabel}.` : ""
                    }`}
                </p>
              </section>

              <section id="productDetails" className="mt-8 border-t border-[#ececea] pt-6">
                <h2 className="text-lg font-bold text-[#20221f]">Product information</h2>
                <h3 className="mt-4 text-sm font-bold text-[#20221f]">Item details</h3>
                <table className="mt-2 w-full border-collapse text-sm">
                  <tbody>
                    {detailRows.map(([label, value]) => (
                      <tr key={label} className="border-b border-[#ececea] align-top">
                        <th className="w-[180px] py-2 pr-4 text-left font-normal text-[#686b65]">
                          {label}
                        </th>
                        <td className="py-2 font-semibold text-[#292b27]">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="mt-8 border-t border-[#ececea] pt-6">
                <h2 className="text-lg font-bold text-[#20221f]">What is in the box?</h2>
                <p className="mt-3 text-sm leading-6 text-[#464942]">{product.name} — 1 unit</p>
              </section>
            </div>

            <div className="space-y-3">
              <ProductBuyBox product={product} />
              {product.sellerListing && <ProductAlertControl product={product} />}
            </div>
          </div>

          <ProductReviews productId={product.id} productImage={product.image} productName={product.name} />

          {relatedProducts.length > 0 && (
            <section className="mt-10 border-t border-[#ececea] pt-6">
              <h2 className="text-lg font-bold text-[#20221f]">Products related to this item</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {relatedProducts.map((item) => (
                  <Link
                    key={item.id}
                    className="group rounded-lg border border-[#ececea] bg-white p-3 transition hover:border-[#ff663b]"
                    href={`/product/${encodeURIComponent(item.id)}`}
                  >
                    <div className="relative grid aspect-square place-items-center overflow-hidden rounded bg-[#f7f7f5]">
                      {item.image ? (
                        <Image
                          alt={item.name}
                          className="object-contain p-2 transition group-hover:scale-105"
                          fill
                          sizes="(min-width: 1024px) 22vw, 45vw"
                          src={getImageSource(item.image)}
                          unoptimized
                        />
                      ) : (
                        <span className="text-xs text-[#92948f]">No product image</span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 min-h-9 text-xs font-semibold leading-4 text-[#292b27]">
                      {item.name}
                    </p>
                    <p className="mt-1.5 text-sm font-bold text-[#20221f]">
                      {formatPrice(item.price, item.currency || "USD")}
                    </p>
                  </Link>
                ))}
              </div>
              <div className="mt-8">
                <h3 className="text-base font-bold text-[#20221f]">Compare similar parts</h3>
                <p className="mt-1 text-xs text-[#686b65]">This item is compared automatically with other available products in the same category.</p>
                <div className="mt-3 overflow-x-auto rounded-lg border border-[#ececea]">
                  <div className="grid min-w-[660px]" style={{ gridTemplateColumns: `120px repeat(${compareProducts.length}, minmax(150px, 1fr))` }}>
                    <div className="border-b border-[#ececea] bg-[#f8f8f6] p-3 text-[10px] font-bold uppercase text-[#686b65]">Product</div>
                    {compareProducts.map((item) => (
                      <div className="border-b border-l border-[#ececea] p-3" key={`compare-product-${item.id}`}>
                        {item.image && <img src={item.image} alt="" className="h-20 w-full object-contain" />}
                        <Link className="mt-2 block line-clamp-2 text-xs font-bold text-[#20221f] hover:text-[#e9562e]" href={`/product/${encodeURIComponent(item.id)}?country=${country}`}>{item.name}</Link>
                      </div>
                    ))}
                    {[
                      ["Price", (item) => formatPrice(item.price, item.currency || product.currency || "USD")],
                      ["Rating", (item) => Number(item.ratingCount) > 0 ? `${Number(item.ratingAverage).toFixed(1)} / 5 (${item.ratingCount})` : "No ratings yet"],
                      ["Brand", (item) => item.brand || "Not listed"],
                      ["Part number", (item) => item.partNumber || item.sku || item.id],
                      ["Vehicle fitment", (item) => item.fitment || (item.fitments || []).map((fitment) => `${fitment.make} ${fitment.model}`).join(", ") || "Confirm with seller"],
                      ["Availability", (item) => Number(item.stock) > 0 ? "In stock" : "Check listing"],
                    ].map(([label, value]) => (
                      <div className="contents" key={label}>
                        <div className="border-b border-[#ececea] bg-[#f8f8f6] p-3 text-[10px] font-bold uppercase text-[#686b65]">{label}</div>
                        {compareProducts.map((item) => <div className="border-b border-l border-[#ececea] p-3 text-xs text-[#292b27]" key={`${label}-${item.id}`}>{value(item)}</div>)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
