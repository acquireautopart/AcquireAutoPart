"use client";
import { useEffect, useRef, useState } from "react";
import { Heart, ShoppingBag, Check, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/features/storefront/lib/format";
import useCart from "@/features/storefront/hooks/useCart";
import { useMarket } from "@/features/storefront/lib/market";
import { getImageUrl } from "@/features/storefront/lib/imageUrl";

/*
 * The catalog can repeat a product across pages — for example the "popular"
 * sort is ordered by live view counts, so items shift between requests and a
 * product may land on two pages. Merge pages while keeping ids unique so React
 * keys stay stable.
 */
function mergeUniqueProducts(current, incoming) {
  const seen = new Set();
  const merged = [];
  for (const product of [...current, ...incoming]) {
    const key = String(product.id);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(product);
  }
  return merged;
}

export default function ProductSection({
  category = null,
  sort = "featured",
  lazyLoad = false,
  homePage = false,
}) {
  const { country } = useMarket();
  const categorySearch = category?.matches?.join(",") || "";
  const [favorites, setFavorites] = useState([]);
  const [added, setAdded] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [enteredViewport, setEnteredViewport] = useState(!lazyLoad);
  const sectionRef = useRef(null);
  const loadMoreRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const { addItem } = useCart();

  useEffect(() => {
    setPage(1);
    setSellerProducts([]);
    setTotal(0);
  }, [country, categorySearch]);

  useEffect(() => {
    if (!lazyLoad) {
      setEnteredViewport(true);
      return undefined;
    }

    const section = sectionRef.current;
    if (!section || enteredViewport) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEnteredViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [enteredViewport, lazyLoad]);

  useEffect(() => {
    if (!enteredViewport) return undefined;
    const controller = new AbortController();
    async function loadProducts() {
      loadingMoreRef.current = true;
      setLoading(true);
      setCatalogError("");
      try {
        const params = new URLSearchParams({
          country,
          page: String(page),
          pageSize: "24",
          sort,
        });
        if (categorySearch) params.set("searchAny", categorySearch);
        const response = await fetch(`/api/parts?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || "Could not load marketplace products.");
        const loadedProducts = (data.products || []).map((product) => ({
          ...product,
          image: product.images?.[0] || "",
          oldPrice: product.compareAtPrice || null,
          tag: product.storeName || "AcquireAuto seller",
        }));
        setSellerProducts((current) =>
          mergeUniqueProducts(page === 1 ? [] : current, loadedProducts),
        );
        setTotal(data.total || 0);
        setCatalogError("");
      } catch (error) {
        if (error.name !== "AbortError") setCatalogError(error.message);
      } finally {
        loadingMoreRef.current = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadProducts();
    return () => controller.abort();
  }, [country, page, categorySearch, sort, enteredViewport]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || loading || catalogError || sellerProducts.length >= total) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingMoreRef.current) {
          loadingMoreRef.current = true;
          setPage((current) => current + 1);
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [catalogError, loading, sellerProducts.length, total]);

  function loadMore() {
    if (loadingMoreRef.current || loading || sellerProducts.length >= total) return;
    loadingMoreRef.current = true;
    setPage((current) => current + 1);
  }

  function add(product) {
    addItem(product);
    setAdded((current) => [...current, product.id]);
    window.setTimeout(() => setAdded((current) => current.filter((id) => id !== product.id)), 1500);
  }

  function toggleFavorite(id) {
    setFavorites((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function getDiscountPercent(product) {
    const price = Number(product.price);
    const oldPrice = Number(product.oldPrice);
    return oldPrice > price && oldPrice > 0
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : 0;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" ref={sectionRef}>
      {sellerProducts.map((product) => (
        <article
          className={`group overflow-hidden bg-white transition duration-300 ${
            homePage
              ? "rounded-xl border border-line-light shadow-[0_4px_16px_rgba(23,25,22,.06)] hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_14px_32px_rgba(23,25,22,.13)]"
              : "border border-line-light hover:-translate-y-1 hover:border-brand/40 hover:shadow-card"
          }`}
          key={product.id}
        >
          <div
            className={`relative aspect-[1.18] overflow-hidden ${
              homePage ? "bg-[#f3f3f1]" : "bg-[#0f0f0f]"
            }`}
          >
            <span className={`absolute left-3 top-3 z-10 text-[9px] font-extrabold tracking-[.1em] text-white ${homePage ? "rounded-full bg-black/75 px-3 py-1.5 backdrop-blur-sm" : "bg-ink px-2 py-1"}`}>
              {product.tag}
            </span>
            {homePage && getDiscountPercent(product) > 0 && (
              <span className="absolute bottom-3 left-3 z-10 rounded-full bg-brand px-3 py-1.5 text-[10px] font-extrabold text-white shadow-sm">
                {getDiscountPercent(product)}% OFF
              </span>
            )}
            <button
              className={`absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-sm transition ${homePage ? "hover:scale-105" : ""} hover:text-brand ${favorites.includes(product.id) ? "text-brand" : "text-[#171916]"}`}
              onClick={() => toggleFavorite(product.id)}
              aria-label={
                favorites.includes(product.id) ? "Remove from favorites" : "Add to favorites"
              }
            >
              <Heart size={17} fill={favorites.includes(product.id) ? "currentColor" : "none"} />
            </button>
            {product.image ? (
              <Image
                alt={product.name}
                className="object-cover transition duration-500 group-hover:scale-105"
                fill
                quality={75}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                src={getImageUrl(product.image, { width: 700, quality: 80 })}
                unoptimized
              />
            ) : (
              <span className={`absolute inset-0 grid place-items-center text-xs ${homePage ? "text-[#92948f]" : "text-white/60"}`}>
                No product image
              </span>
            )}
            <Link
              className="absolute inset-0 z-[1]"
              href={`/product/${encodeURIComponent(product.id)}?country=${country}`}
              aria-label={`View ${product.name}`}
            />
          </div>
          <div className={homePage ? "flex min-h-[190px] flex-col p-4" : "p-4"}>
            <span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-brand">
              {product.category}
            </span>
            {sort === "best-selling" && product.soldCount > 0 && (
              <span className="ml-2 text-[10px] font-semibold text-muted">
                {product.soldCount} sold
              </span>
            )}
            <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-muted">
              <Star className={product.ratingCount > 0 ? "fill-amber-400 text-amber-400" : "text-[#a4a7a1]"} size={13} aria-hidden="true" />
              {product.ratingCount > 0 ? `${Number(product.ratingAverage || 0).toFixed(1)} (${product.ratingCount})` : "No ratings yet"}
            </span>
            <h3 className={`mt-2 min-h-10 text-sm font-bold leading-5 ${homePage ? "line-clamp-2" : ""}`}>
              <Link
                className="hover:text-brand"
                href={`/product/${encodeURIComponent(product.id)}?country=${country}`}
              >
                {product.name}
              </Link>
            </h3>
            <div className={`${homePage ? "mt-auto pt-3" : "mt-3"} flex flex-wrap items-baseline gap-x-2 gap-y-1`}>
              <strong className={`${homePage ? "text-xl" : "text-lg"} font-extrabold`}>
                {formatPrice(product.price, product.currency || "USD")}
              </strong>
              {product.oldPrice && (
                <del className="text-xs text-muted">
                  {formatPrice(product.oldPrice, product.currency || "USD")}
                </del>
              )}
              {homePage && getDiscountPercent(product) > 0 && (
                <span className="text-[10px] font-bold text-[#198754]">
                  {getDiscountPercent(product)}% off
                </span>
              )}
            </div>
            <button
              className={`mt-4 flex min-h-10 w-full items-center justify-center gap-2 text-xs font-extrabold transition ${homePage ? "rounded-lg bg-brand text-white shadow-sm hover:bg-brand-dark" : "border border-line-light bg-transparent text-[#171916] hover:border-brand hover:bg-brand hover:text-white"}`}
              onClick={() => add(product)}
            >
              {added.includes(product.id) ? (
                <>
                  <Check size={15} /> Added to cart
                </>
              ) : (
                <>
                  <ShoppingBag size={15} /> Add to cart
                </>
              )}
            </button>
          </div>
        </article>
      ))}
      {!sellerProducts.length && loading && (
        <p
          className="col-span-full rounded-lg border border-line-light bg-white p-6 text-center text-sm text-muted"
          role="status"
        >
          Loading seller-listed products…
        </p>
      )}
      {!sellerProducts.length && !loading && !catalogError && (
        <p className="col-span-full rounded-lg border border-line-light bg-white p-6 text-center text-sm text-muted">
          {sort === "top-rated"
            ? "Top-rated products will appear after customers submit verified-purchase reviews."
            : category
              ? "No active, in-stock products are available in this category."
              : "No active, in-stock seller products are available in this marketplace."}
        </p>
      )}
      {sellerProducts.length < total && (
        <div className="col-span-full h-1" ref={loadMoreRef} aria-hidden="true" />
      )}
      {sellerProducts.length < total && !catalogError && (
        <button
          className="col-span-full mx-auto rounded-full border border-line px-5 py-2 text-sm font-bold text-ink hover:border-brand hover:text-brand disabled:opacity-60"
          disabled={loading}
          onClick={loadMore}
          type="button"
        >
          {loading ? "Loading products..." : "Load more products"}
        </button>
      )}
      {catalogError && (
        <p className="col-span-full text-center text-xs text-red-600" role="status">
          {catalogError}
        </p>
      )}
    </div>
  );
}
