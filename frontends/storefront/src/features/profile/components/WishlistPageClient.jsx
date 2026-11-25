"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Search, ShoppingCart, Star, Trash2, ArrowRight, PackageSearch } from "lucide-react";
import { formatPrice } from "@/features/storefront/lib/format";
import { getImageUrl } from "@/features/storefront/lib/imageUrl";
import { profileApi } from "@/features/storefront/lib/profileApi";
import useCart from "@/features/storefront/hooks/useCart";
import ProfileSubpageFrame from "@/features/profile/components/ProfileSubpageFrame";
import { SectionNotice, useSectionNotice } from "@/features/profile/components/SectionNotice";
import {
  ProfileResourceState,
  useProfileResource,
} from "@/features/profile/components/ProfileFormKit";

const SORTS = [
  { id: "recent", label: "Recently added" },
  { id: "price-low", label: "Price: low to high" },
  { id: "price-high", label: "Price: high to low" },
  { id: "rating", label: "Top rated" },
];

function Stars({ value, reviews }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={12}
            className={n <= value ? "fill-[#facc15] text-[#facc15]" : "text-[var(--pf-muted)]"}
          />
        ))}
      </span>
      <span className="text-[11px] text-[var(--pf-muted)]">
        {value.toFixed(1)} ({reviews})
      </span>
    </div>
  );
}

export default function WishlistPageClient() {
  const { data, loading, error, reload, setData } = useProfileResource(profileApi.wishlist);
  const items = data?.items || [];
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [removingId, setRemovingId] = useState("");
  const [notice, setNotice] = useSectionNotice();
  const { addItem } = useCart();

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term
      ? items.filter((item) =>
          `${item.name} ${item.brand} ${item.category}`.toLowerCase().includes(term),
        )
      : [...items];

    if (sort === "price-low") filtered.sort((a, b) => a.price - b.price);
    else if (sort === "price-high") filtered.sort((a, b) => b.price - a.price);
    else if (sort === "rating")
      filtered.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    return filtered;
  }, [items, query, sort]);

  const savings = items.reduce(
    (total, item) => total + (item.oldPrice ? item.oldPrice - item.price : 0),
    0,
  );

  function handleAddToCart(item) {
    addItem(item);
    setNotice(`${item.name} added to your cart`);
  }

  function handleAddAll() {
    visible.forEach((item) => addItem(item));
    setNotice(`${visible.length} item${visible.length === 1 ? "" : "s"} added to your cart`);
  }

  async function handleRemove(item) {
    setRemovingId(item.id);
    try {
      await profileApi.removeWishlistItem(item.id);
      setData({ items: (data?.items || []).filter((entry) => entry.id !== item.id) });
      setNotice(`${item.name} removed from your wishlist`);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setRemovingId("");
    }
  }

  return (
    <ProfileSubpageFrame activeId="wishlist">
      <ProfileResourceState
        loading={loading}
        error={error}
        onRetry={reload}
        signInLabel="Sign in to your customer account to view your wishlist."
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2.5 font-display text-2xl font-extrabold sm:text-3xl">
              <Heart size={24} className="shrink-0 text-[var(--pf-brand)]" strokeWidth={2} />
              My Wishlist
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-[var(--pf-text-2)]">
              Parts you saved for later. Add them to your cart whenever you are ready.
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={handleAddAll}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--pf-brand)] px-4 text-sm font-bold text-white hover:brightness-110"
            >
              <ShoppingCart size={16} /> Add all to cart
            </button>
          )}
        </header>

        {items.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pf-muted)]"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search saved items"
                aria-label="Search saved items"
                className="h-11 w-full rounded-lg border border-[var(--pf-border)] bg-[var(--pf-card)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--pf-muted)] focus:border-[var(--pf-brand)]"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--pf-text-2)]">
              <span className="hidden sm:inline">Sort</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                aria-label="Sort wishlist"
                className="h-11 flex-1 rounded-lg border border-[var(--pf-border)] bg-[var(--pf-card)] px-3 text-sm outline-none focus:border-[var(--pf-brand)] sm:flex-none"
              >
                {SORTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--pf-muted)]">
            <span>
              {items.length} saved item{items.length === 1 ? "" : "s"}
            </span>
            {savings > 0 && (
              <span className="font-semibold text-[var(--pf-ok)]">
                You save {formatPrice(savings, items[0]?.currency)}
              </span>
            )}
            <span className="hidden sm:inline">Prices include GST</span>
          </div>
        )}

        {visible.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {visible.map((item) => {
              const discount = item.oldPrice
                ? Math.round((1 - item.price / item.oldPrice) * 100)
                : 0;
              const inStock = item.stock.toLowerCase().startsWith("in stock");
              return (
                <article
                  key={item.id}
                  className="pf-card group flex flex-col overflow-hidden transition-colors hover:border-[var(--pf-brand)]"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--pf-card-2)]">
                    {item.image ? (
                      <img
                        src={getImageUrl(item.image, { width: 480, quality: 80 })}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center">
                        <Heart size={34} className="text-[var(--pf-muted)]" strokeWidth={1.3} />
                      </span>
                    )}
                    {discount > 0 && (
                      <span className="absolute left-2.5 top-2.5 rounded bg-[var(--pf-brand)] px-2 py-0.5 text-[10px] font-bold text-white">
                        -{discount}%
                      </span>
                    )}
                    <button
                      onClick={() => handleRemove(item)}
                      disabled={removingId === item.id}
                      aria-label={`Remove ${item.name} from wishlist`}
                      title="Remove from wishlist"
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-[var(--pf-border)] bg-[var(--pf-card)] text-[var(--pf-muted)] transition-colors hover:border-[var(--pf-brand)] hover:text-[var(--pf-brand)] disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col p-3 sm:p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--pf-muted)]">
                      {item.brand} · {item.category}
                    </span>
                    <h2 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug">
                      {item.name}
                    </h2>
                    <div className="mt-1.5">
                      <Stars value={item.rating} reviews={item.reviews} />
                    </div>

                    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-lg font-extrabold text-[var(--pf-brand)]">
                        {formatPrice(item.price, item.currency)}
                      </span>
                      {item.oldPrice && (
                        <span className="text-xs text-[var(--pf-muted)] line-through">
                          {formatPrice(item.oldPrice, item.currency)}
                        </span>
                      )}
                    </div>
                    <span
                      className={`mt-1 text-[11px] font-semibold ${
                        inStock ? "text-[var(--pf-ok)]" : "text-[var(--pf-warn)]"
                      }`}
                    >
                      {item.stock}
                    </span>

                    <div className="mt-auto flex items-center gap-2 pt-3">
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--pf-brand)] px-3 text-xs font-bold text-white hover:brightness-110"
                      >
                        <ShoppingCart size={15} /> Add to Cart
                      </button>
                      <Link
                        href="/parts"
                        aria-label={`View details for ${item.name}`}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--pf-border)] text-[var(--pf-text-2)] hover:border-[var(--pf-brand)] hover:text-[var(--pf-brand)]"
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : items.length ? (
          <div className="pf-card mt-4 grid place-items-center px-5 py-14 text-center">
            <PackageSearch size={32} className="text-[var(--pf-brand)]" />
            <h2 className="mt-3 font-bold">No saved items match “{query}”</h2>
            <p className="mt-1 text-sm text-[var(--pf-muted)]">
              Try a different part name or clear the search.
            </p>
            <button onClick={() => setQuery("")} className="pf-outline-btn mt-4">
              Clear search
            </button>
          </div>
        ) : (
          <div className="pf-card mt-4 grid place-items-center px-5 py-14 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
              <Heart size={28} />
            </span>
            <h2 className="mt-4 font-display text-xl font-extrabold">Your wishlist is empty</h2>
            <p className="mt-2 max-w-sm text-sm text-[var(--pf-text-2)]">
              Tap the heart on any part to save it here and pick up where you left off.
            </p>
            <Link
              href="/parts"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--pf-brand)] px-5 text-sm font-bold text-white hover:brightness-110"
            >
              Browse parts <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </ProfileResourceState>

      <SectionNotice message={notice} />
    </ProfileSubpageFrame>
  );
}
