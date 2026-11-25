"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ChevronRight,
  Heart,
  Info,
  Search,
  Star,
  ShoppingCart,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react";
import PromoStrip from "@/features/storefront/components/PromoStrip";
import SiteHeader from "@/features/storefront/components/SiteHeader";
import SiteFooter from "@/features/storefront/components/SiteFooter";
import useCart from "@/features/storefront/hooks/useCart";
import { formatPrice } from "@/features/storefront/lib/format";
import { getImageUrl } from "@/features/storefront/lib/imageUrl";
import { useMarket } from "@/features/storefront/lib/market";

function getFitmentStatus(product, vehicle) {
  if (!vehicle.make || !vehicle.model) return "";
  const matches = (product.fitments || []).filter((fitment) =>
    fitment.make?.toLowerCase() === vehicle.make.toLowerCase() &&
    fitment.model?.toLowerCase() === vehicle.model.toLowerCase() &&
    (!vehicle.year || ((!fitment.yearFrom || Number(vehicle.year) >= fitment.yearFrom) && (!fitment.yearTo || Number(vehicle.year) <= fitment.yearTo)))
  );
  const complete = matches.some((fitment) =>
    (!vehicle.year || Boolean(fitment.yearFrom || fitment.yearTo)) &&
    (!vehicle.trim || fitment.trim?.toLowerCase() === vehicle.trim.toLowerCase()) &&
    (!vehicle.engine || fitment.engine?.toLowerCase().includes(vehicle.engine.toLowerCase()))
  );
  if (complete) return "Seller lists this vehicle fitment";
  if (matches.length) return "Possible match · confirm details with seller";
  return product.fitment ? "Possible match · confirm with seller" : "Confirm fitment with seller";
}

function ProductCard({ product, favorite, added, comparing, vehicle, onToggleFavorite, onToggleCompare, onAdd }) {
  const { country } = useMarket();
  const discountPercent =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0;

  return (
    <article className="overflow-hidden rounded-lg border border-[#e2e3e1] bg-white transition hover:border-[#ff7047] hover:shadow-[0_8px_24px_rgba(37,39,35,.09)]">
      <div className="relative grid aspect-[1.48] place-items-center overflow-hidden border-b border-[#ededeb] bg-[#f7f7f5]">
        {discountPercent > 0 && (
          <span className="absolute left-2 top-2 z-10 rounded-sm bg-[#1236a5] px-2 py-1 text-[9px] font-extrabold uppercase text-white">
            {discountPercent}% off
          </span>
        )}
        <button
          className={`absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-white/95 shadow-sm ${
            favorite ? "text-[#ff663b]" : "text-[#343733]"
          }`}
          type="button"
          onClick={() => onToggleFavorite(product.id)}
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart size={15} fill={favorite ? "currentColor" : "none"} />
        </button>
        {product.image && (
          <Image
            alt={product.name}
            className="object-contain p-3"
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
            src={getImageUrl(product.image, { width: 600, quality: 80 })}
            unoptimized
          />
        )}
        {!product.image && <span className="text-xs text-[#92948f]">No product image</span>}
        <Link
          className="absolute inset-0 z-[1]"
          href={`/product/${encodeURIComponent(product.id)}?country=${country}`}
          aria-label={`View ${product.name}`}
        />
      </div>
      <div className="p-3">
        <h2 className="min-h-9 text-[11px] font-extrabold uppercase leading-4 text-[#292b27]">
          <Link
            className="hover:text-[#e9562e]"
            href={`/product/${encodeURIComponent(product.id)}?country=${country}`}
          >
            {product.name}
          </Link>
        </h2>
        <p className="mt-1 flex items-center gap-1 text-[10px] text-[#686b65]" aria-label={`${product.ratingAverage || 0} out of 5; ${product.ratingCount || 0} verified ratings`}>
          <Star size={12} className={Number(product.ratingCount) > 0 ? "fill-amber-400 text-amber-400" : "text-[#a4a7a1]"} aria-hidden="true" />
          {Number(product.ratingCount) > 0 ? `${Number(product.ratingAverage).toFixed(1)} · ${product.ratingCount} verified ${product.ratingCount === 1 ? "rating" : "ratings"}` : "No ratings yet"}
        </p>
        <div className="mt-2 space-y-1.5 text-[10px] text-[#777a73]">
          <p className="flex items-center gap-1.5">
            <Info size={11} className="shrink-0 text-[#ff663b]" />
            <span>Part No: {product.sku || product.id}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Tag size={11} className="shrink-0 text-[#ff663b]" />
            <span>Type: {product.category}</span>
          </p>
        <p className="text-[10px] font-semibold text-[#555851]">{product.condition || "New"}{product.warranty ? ` · ${product.warranty} warranty` : ""}</p>
          {product.brand && (
            <p className="flex items-center gap-1.5">
              <Tag size={11} className="shrink-0 text-[#ff663b]" />
              <span>Brand: {product.brand}</span>
            </p>
          )}
          {product.fitment && <p className="line-clamp-2">Fitment: {product.fitment}</p>}
          {getFitmentStatus(product, vehicle) && <p className="rounded bg-[#fff3ed] px-2 py-1 text-[9px] font-bold text-[#aa3b16]">{getFitmentStatus(product, vehicle)}</p>}
        </div>
        <div className="mt-2 flex items-baseline gap-2 border-t border-dashed border-[#dedfdd] pt-2">
          <strong className="text-sm font-extrabold text-[#20221f]">
            {formatPrice(product.price, product.currency || "USD")}
          </strong>
          {product.oldPrice && (
            <del className="text-[10px] text-[#92948f]">
              {formatPrice(product.oldPrice, product.currency || "USD")}
            </del>
          )}
        </div>
        <button
          className="mt-2.5 flex h-8 w-full items-center justify-center gap-2 rounded-full bg-[#ff663b] text-[10px] font-extrabold text-white transition hover:bg-[#e9562e]"
          type="button"
          onClick={() => onAdd(product)}
        >
          {added ? <Check size={13} /> : <ShoppingCart size={13} />}
          {added ? "Added to cart" : "Add to cart"}
        </button>
        <button
          className={`mt-2 flex h-8 w-full items-center justify-center gap-2 rounded-full border text-[10px] font-bold transition ${
            comparing
              ? "border-[#ff663b] bg-[#fff3ed] text-[#c44720]"
              : "border-[#dedfdd] bg-white text-[#52554f] hover:border-[#ff663b]"
          }`}
          type="button"
          onClick={() => onToggleCompare(product)}
          aria-pressed={comparing}
        >
          {comparing ? "Added to compare" : "Compare this part"}
        </button>
      </div>
    </article>
  );
}

function PartsCatalog() {
  const { country } = useMarket();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") || "";
  const brandParam = searchParams.get("brand") || "";
  const conditionParam = searchParams.get("condition") || "";
  const initialQuery = searchParams.get("q") || "";
  const initialVehicle = {
    year: searchParams.get("year") || "",
    make: searchParams.get("make") || "",
    model: searchParams.get("model") || "",
    trim: searchParams.get("trim") || "",
    engine: searchParams.get("engine") || "",
  };
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState(
    searchParams.get("brand") ? [searchParams.get("brand")] : [],
  );
  const [selectedCategories, setSelectedCategories] = useState(
    searchParams.get("category") ? [searchParams.get("category")] : [],
  );
  const [condition, setCondition] = useState(conditionParam);
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [sort, setSort] = useState("featured");
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [search, setSearch] = useState(initialQuery);
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [added, setAdded] = useState([]);
  const [compareItems, setCompareItems] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("acquireauto-compare") || "[]");
      if (Array.isArray(saved)) setCompareItems(saved.slice(0, 3));
    } catch {
      window.localStorage.removeItem("acquireauto-compare");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("acquireauto-compare", JSON.stringify(compareItems));
  }, [compareItems]);

  useEffect(() => {
    setSearchInput(initialQuery);
    setSearch(initialQuery);
    setSelectedCategories(categoryParam ? [categoryParam] : []);
    setSelectedBrands(brandParam ? [brandParam] : []);
    setCondition(conditionParam);
    setVehicle(initialVehicle);
    setPage(1);
  }, [initialQuery, categoryParam, brandParam, conditionParam, initialVehicle.year, initialVehicle.make, initialVehicle.model, initialVehicle.trim, initialVehicle.engine]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProducts() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          country,
          page: String(page),
          pageSize: "24",
          sort,
        });
        if (search) params.set("q", search);
        if (selectedBrands.length) params.set("brand", selectedBrands.join(","));
        if (selectedCategories.length) params.set("category", selectedCategories.join(","));
        if (condition) params.set("condition", condition);
        for (const key of ["year", "make", "model", "trim", "engine"]) if (vehicle[key]) params.set(key, vehicle[key]);
        if (minPrice !== "") params.set("minPrice", minPrice);
        if (maxPrice !== "") params.set("maxPrice", maxPrice);

        const response = await fetch(`/api/parts?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load marketplace products.");

        setProducts((current) =>
          page === 1 ? data.products || [] : [...current, ...(data.products || [])],
        );
        setBrands(data.brands || []);
        setCategories(data.categories || []);
        setTotal(data.total || 0);
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadProducts();
    return () => controller.abort();
  }, [country, page, search, selectedBrands, selectedCategories, condition, vehicle, sort, minPrice, maxPrice]);

  useEffect(() => {
    if (!filtersOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [filtersOpen]);

  function toggleSelection(value, setter) {
    setter((current) =>
      current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value],
    );
    setPage(1);
  }

  function applySearch(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setVehicle({ year: "", make: "", model: "", trim: "", engine: "" });
    setPage(1);
  }

  function applyPrice(event) {
    event.preventDefault();
    const minimum = minPriceInput === "" ? "" : Number(minPriceInput);
    const maximum = maxPriceInput === "" ? "" : Number(maxPriceInput);
    if (
      (minimum !== "" && (!Number.isFinite(minimum) || minimum < 0)) ||
      (maximum !== "" &&
        (!Number.isFinite(maximum) || maximum < 0 || (minimum !== "" && maximum < minimum)))
    ) {
      setError("Enter a valid price range.");
      return;
    }
    setMinPrice(minimum === "" ? "" : String(minimum));
    setMaxPrice(maximum === "" ? "" : String(maximum));
    setPage(1);
  }

  function clearFilters() {
    setSelectedBrands([]);
    setSelectedCategories([]);
    setCondition("");
    setVehicle({ year: "", make: "", model: "", trim: "", engine: "" });
    setSort("featured");
    setSearch("");
    setSearchInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  }

  function addToCart(product) {
    addItem(product);
    setAdded((current) => (current.includes(product.id) ? current : [...current, product.id]));
  }

  function toggleCompare(product) {
    setCompareItems((current) => {
      const exists = current.some((item) => item.id === product.id);
      if (exists) return current.filter((item) => item.id !== product.id);
      if (current.length >= 3) return current;
      return [...current, product];
    });
  }

  return (
    <>
      <PromoStrip />
      <SiteHeader />
      <main className="min-h-[70vh] bg-[#f5f6f7] pb-12">
        <div className="mx-auto max-w-[1440px] px-4 pt-5 sm:px-6 lg:px-8">
          <nav
            className="mb-2 flex items-center gap-1 text-[12px] text-[#777a73]"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="font-bold text-[#20221f] hover:text-[#ff663b]">
              Home
            </Link>
            <ChevronRight size={12} />
            <span className="font-bold text-[#ff663b]">Marketplace products</span>
          </nav>

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold text-[#20221f] sm:text-2xl">
                Marketplace products{" "}
                <span className="font-normal text-[#777a73]">
                  ({total.toLocaleString("en-US")})
                </span>
              </h1>
              <p className="mt-1 text-xs text-[#777a73]">
                {search ? `Search results for "${search}"` : vehicle.make && vehicle.model ? `Vehicle search: ${[vehicle.year, vehicle.make, vehicle.model, vehicle.trim, vehicle.engine].filter(Boolean).join(" ")}` : "Products currently listed by sellers"}
              </p>
            </div>
            {(search ||
              selectedBrands.length ||
              selectedCategories.length ||
              condition ||
              minPrice ||
              maxPrice) && (
              <button
                className="text-xs font-bold text-[#e9562e] underline underline-offset-4"
                type="button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>

          <form
            className="mb-4 flex h-11 overflow-hidden rounded-md border border-[#dedfdd] bg-white focus-within:border-[#ff663b]"
            onSubmit={applySearch}
          >
            <input
              className="min-w-0 flex-1 px-3 text-sm text-[#20221f] outline-none"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search any part, vehicle, brand, or part number"
              value={searchInput}
              aria-label="Search marketplace products"
            />
            <button
              className="flex shrink-0 items-center gap-2 bg-[#ff663b] px-4 text-sm font-bold text-white"
              type="submit"
            >
              <Search size={16} />
              Search
            </button>
          </form>

          <div className="mb-3 flex items-center justify-between lg:hidden">
            <button
              className="flex items-center gap-2 rounded-full border border-[#e1e2e2] bg-white px-4 py-2 text-xs font-bold"
              onClick={() => setFiltersOpen(true)}
              type="button"
            >
              <SlidersHorizontal size={14} />
              Filters
            </button>
            <label className="flex items-center gap-2 text-xs">
              Sort
              <select
                className="h-9 rounded border border-[#dedfdd] bg-white px-2"
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
                value={sort}
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Product Name</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside
              className={`fixed inset-0 z-[100] bg-black/45 lg:sticky lg:top-4 lg:z-auto lg:block lg:bg-transparent ${
                filtersOpen ? "block" : "hidden"
              }`}
              onClick={() => setFiltersOpen(false)}
              aria-label="Product filters"
            >
              <div
                className={`h-full w-[min(340px,88vw)] overflow-y-auto bg-white p-5 shadow-2xl lg:h-auto lg:w-auto lg:rounded-lg lg:border lg:border-[#e1e2e2] lg:p-4 lg:shadow-none ${
                  filtersOpen ? "block" : "hidden lg:block"
                }`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between border-b border-[#ececeb] pb-3">
                  <h2 className="text-xs font-extrabold uppercase tracking-wide">Filters</h2>
                  <button
                    className="text-xs font-bold text-[#e9562e] lg:hidden"
                    onClick={() => setFiltersOpen(false)}
                    type="button"
                  >
                    Done
                  </button>
                </div>

                <section className="border-b border-[#ececeb] py-3">
                  <h3 className="mb-2 text-[10px] font-extrabold uppercase tracking-wide">
                    Sort by
                  </h3>
                  {[
                    ["featured", "Featured"],
                    ["price-low", "Price: Low to High"],
                    ["price-high", "Price: High to Low"],
                    ["name", "Product Name"],
                  ].map(([value, label]) => (
                    <label
                      className="flex cursor-pointer items-center gap-2 py-1.5 text-xs"
                      key={value}
                    >
                      <input
                        checked={sort === value}
                        className="accent-[#ff663b]"
                        name="sort"
                        onChange={() => {
                          setSort(value);
                          setPage(1);
                        }}
                        type="radio"
                        value={value}
                      />
                      {label}
                    </label>
                  ))}
                </section>

                <form className="border-b border-[#ececeb] py-3" onSubmit={applyPrice}>
                  <h3 className="mb-2 text-[10px] font-extrabold uppercase tracking-wide">
                    Price range
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[9px] text-[#777a73]">
                      Min
                      <input
                        className="mt-1 h-8 w-full rounded border border-[#dedfdd] px-2 text-xs"
                        min="0"
                        onChange={(event) => setMinPriceInput(event.target.value)}
                        placeholder="0"
                        step="0.01"
                        type="number"
                        value={minPriceInput}
                      />
                    </label>
                    <label className="text-[9px] text-[#777a73]">
                      Max
                      <input
                        className="mt-1 h-8 w-full rounded border border-[#dedfdd] px-2 text-xs"
                        min="0"
                        onChange={(event) => setMaxPriceInput(event.target.value)}
                        placeholder="Any"
                        step="0.01"
                        type="number"
                        value={maxPriceInput}
                      />
                    </label>
                  </div>
                  <button
                    className="mt-3 h-8 w-full rounded bg-[#ff663b] text-xs font-bold text-white"
                    type="submit"
                  >
                    Apply price
                  </button>
                </form>

                <section className="border-b border-[#ececeb] py-3">
                  <h3 className="mb-1 text-[10px] font-extrabold uppercase tracking-wide">
                    Category
                  </h3>
                  {categories.map((category) => (
                    <label
                      className="flex cursor-pointer items-center gap-2 py-1.5 text-xs"
                      key={category}
                    >
                      <input
                        checked={selectedCategories.includes(category)}
                        className="accent-[#ff663b]"
                        onChange={() => toggleSelection(category, setSelectedCategories)}
                        type="checkbox"
                      />
                      <span className="truncate">{category}</span>
                    </label>
                  ))}
                </section>

                <section className="border-b border-[#ececeb] py-3">
                  <h3 className="mb-2 text-[10px] font-extrabold uppercase tracking-wide">Condition</h3>
                  <select value={condition} onChange={(event) => { setCondition(event.target.value); setPage(1); }} className="h-9 w-full rounded border border-[#dedfdd] bg-white px-2 text-xs">
                    <option value="">All conditions</option><option>New</option><option>Refurbished</option><option>Used</option>
                  </select>
                </section>

                <section className="py-3">
                  <h3 className="mb-1 text-[10px] font-extrabold uppercase tracking-wide">Brand</h3>
                  {brands.map((brand) => (
                    <label
                      className="flex cursor-pointer items-center gap-2 py-1.5 text-xs"
                      key={brand}
                    >
                      <input
                        checked={selectedBrands.includes(brand)}
                        className="accent-[#ff663b]"
                        onChange={() => toggleSelection(brand, setSelectedBrands)}
                        type="checkbox"
                      />
                      <span className="truncate">{brand}</span>
                    </label>
                  ))}
                </section>
                <button
                  className="mt-2 w-full rounded border border-[#dedfdd] py-2 text-xs font-bold"
                  onClick={clearFilters}
                  type="button"
                >
                  Clear all filters
                </button>
              </div>
            </aside>

            <section className="min-w-0">
              <p className="mb-2 px-1 text-[11px] text-[#686b65]" aria-live="polite">
                {loading
                  ? "Loading products..."
                  : `Showing ${products.length ? 1 : 0}-${products.length} of ${total.toLocaleString("en-US")}`}
              </p>
              {error && (
                <p
                  className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {!loading && !error && !products.length && (
                <div className="rounded-lg border border-[#e1e2e2] bg-white p-8 text-center">
                  <h2 className="text-base font-bold text-[#282a26]">No matching products found</h2>
                  <p className="mt-1 text-xs text-[#777a73]">
                    Try another search or clear one or more filters.
                  </p>
                  <button
                    className="mt-4 text-xs font-bold text-[#e9562e] underline underline-offset-4"
                    onClick={clearFilters}
                    type="button"
                  >
                    Clear filters
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard
                    added={added.includes(product.id)}
                    comparing={compareItems.some((item) => item.id === product.id)}
                    favorite={favorites.includes(product.id)}
                    vehicle={vehicle}
                    key={product.id}
                    onAdd={addToCart}
                    onToggleCompare={toggleCompare}
                    onToggleFavorite={(id) =>
                      setFavorites((current) =>
                        current.includes(id)
                          ? current.filter((favoriteId) => favoriteId !== id)
                          : [...current, id],
                      )
                    }
                    product={product}
                  />
                ))}
              </div>
              {products.length < total && (
                <button
                  className="mx-auto mt-5 flex min-h-10 items-center rounded-full border border-[#dedfdd] bg-white px-5 text-xs font-bold hover:border-[#ff663b] disabled:opacity-60"
                  disabled={loading}
                  onClick={() => setPage((current) => current + 1)}
                  type="button"
                >
                  {loading ? "Loading..." : "Load more products"}
                </button>
              )}
            </section>
          </div>
        </div>
      </main>
      {compareItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[90] border-t border-[#dedfdd] bg-white/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,.12)] backdrop-blur">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-1 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
              <strong className="shrink-0 text-xs text-[#20221f]">Compare ({compareItems.length}/3)</strong>
              {compareItems.map((item) => (
                <span key={item.id} className="flex max-w-48 shrink-0 items-center gap-1 rounded-full bg-[#f5f6f7] px-3 py-1.5 text-[10px] font-semibold text-[#454842]">
                  <span className="truncate">{item.name}</span>
                  <button type="button" aria-label={`Remove ${item.name} from comparison`} onClick={() => toggleCompare(item)}>
                    <X size={12} />
                  </button>
                </span>
              ))}
              {compareItems.length < 2 && <span className="text-[10px] text-[#777a73]">Add one more product to compare</span>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" className="rounded-full border border-[#dedfdd] px-3 py-2 text-[10px] font-bold" onClick={() => setCompareItems([])}>Clear</button>
              <button type="button" disabled={compareItems.length < 2} className="rounded-full bg-[#ff663b] px-4 py-2 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setCompareOpen(true)}>Compare parts</button>
            </div>
          </div>
        </div>
      )}
      {compareOpen && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/55 p-3" role="presentation" onClick={() => setCompareOpen(false)}>
          <section className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl bg-white p-4 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="compare-heading" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-extrabold uppercase tracking-widest text-[#e9562e]">Side by side</p><h2 id="compare-heading" className="mt-1 text-xl font-extrabold text-[#20221f]">Compare products</h2></div>
              <button type="button" aria-label="Close comparison" className="rounded-full border border-[#dedfdd] p-2" onClick={() => setCompareOpen(false)}><X size={16} /></button>
            </div>
            <div className="grid min-w-[540px]" style={{ gridTemplateColumns: `120px repeat(${compareItems.length}, minmax(150px, 1fr))` }}>
              {[
                ["Product", (item) => <Link className="font-bold text-[#e9562e] hover:underline" href={`/product/${encodeURIComponent(item.id)}?country=${country}`}>{item.name}</Link>],
                ["Price", (item) => <strong>{formatPrice(item.price, item.currency || "USD")}</strong>],
                ["Brand", (item) => item.brand || "Not listed"],
                ["Part number", (item) => item.sku || item.id],
                ["Category", (item) => item.category || "Not listed"],
                ["Vehicle fitment", (item) => item.fitment || "Ask seller to confirm"],
                ["Seller", (item) => item.storeName || item.tag || "Marketplace seller"],
                ["Availability", (item) => Number(item.stock) > 0 ? `${item.stock} in stock` : "Check listing"],
              ].map(([label, value]) => (
                <div className="contents" key={label}>
                  <div className="border-b border-[#ececeb] bg-[#f7f7f5] p-3 text-[10px] font-extrabold uppercase text-[#686b65]">{label}</div>
                  {compareItems.map((item) => <div className="border-b border-[#ececeb] p-3 text-xs text-[#292b27]" key={`${label}-${item.id}`}>{value(item)}</div>)}
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10px] leading-5 text-[#777a73]">Fitment information is supplied by sellers. Confirm the exact year, make, model and engine with the seller before ordering.</p>
          </section>
        </div>
      )}
      <SiteFooter />
    </>
  );
}

export default function PartsPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] bg-[#f5f6f7]" />}>
      <PartsCatalog />
    </Suspense>
  );
}
