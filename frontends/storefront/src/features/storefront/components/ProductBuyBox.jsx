"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, ShoppingCart, Zap } from "lucide-react";
import { formatPrice } from "@/features/storefront/lib/format";
import useCart, { MAX_CART_QUANTITY } from "@/features/storefront/hooks/useCart";
import profileApi from "@/features/storefront/lib/profileApi";
import { requestCustomerAuthDialog } from "@/lib/authApi";

const QUANTITY_OPTIONS = Array.from({ length: MAX_CART_QUANTITY }, (_, index) => index + 1);

export default function ProductBuyBox({ product }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [listState, setListState] = useState("idle"); // idle | busy | saved
  const variants = product.variants || [];
  const [variantId, setVariantId] = useState(variants[0]?._id || "");
  const selectedVariant = variants.find((variant) => variant._id === variantId);
  const variantMissing = variants.length > 0 && !selectedVariant;
  const activeProduct = selectedVariant
    ? {
        ...product,
        productId: product.id,
        variantId: selectedVariant._id,
        variant: selectedVariant.name,
        price: selectedVariant.price,
        oldPrice: product.oldPrice,
        currency: product.currency || "USD",
      }
    : product;
  const { addItem, signedIn } = useCart();
  const hasDiscount = product.oldPrice > product.price;

  function addToCart() {
    addItem(activeProduct, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  function buyNow() {
    addItem(activeProduct, quantity);
    router.push("/cart");
  }

  async function addToList() {
    if (!signedIn) {
      requestCustomerAuthDialog();
      return;
    }
    setListState("busy");
    try {
      await profileApi.addWishlistItem({
        productId: String(product.id),
        name: product.name,
        brand: product.brand || "",
        category: product.category || "",
        price: product.price,
        oldPrice: product.oldPrice || null,
        image: product.image || "",
      });
      setListState("saved");
      window.setTimeout(() => setListState("idle"), 2000);
    } catch {
      setListState("idle");
    }
  }

  return (
    <aside className="h-fit rounded-lg border border-[#e2e3e1] bg-white p-4 lg:sticky lg:top-4">
      <p className="text-2xl font-bold text-[#20221f]">
        {formatPrice(selectedVariant?.price ?? product.price, product.currency || "USD")}
      </p>
      {hasDiscount && !selectedVariant && (
        <p className="mt-1 text-xs text-[#777a73]">
          M.R.P.: <del>{formatPrice(product.oldPrice, product.currency || "USD")}</del>
        </p>
      )}

      {variants.length > 0 && (
        <label className="mt-3 block text-xs font-semibold text-[#464942]">
          Choose variant
          <select
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
            className="mt-1.5 h-9 w-full rounded-lg border border-[#d5d9d9] bg-white px-2 text-xs"
          >
            <option value="">Select an option</option>
            {variants.map((variant) => (
              <option key={variant._id} value={variant._id} disabled={variant.stock < 1}>
                {variant.name} · {formatPrice(variant.price, product.currency || "USD")} ·{" "}
                {variant.stock} left
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="mt-2 text-sm font-semibold text-[#1a7f37]">
        {selectedVariant
          ? `${selectedVariant.stock} in stock`
          : product.stock !== undefined
            ? `${product.stock} in stock`
            : "In stock"}
      </p>

      <p className="mt-3 text-xs leading-5 text-[#464942]">
        <span className="font-bold">Delivery</span> details are confirmed at checkout. Seller
        listings ship in {product.shippingDays || 3} business days.
      </p>

      <label className="mt-4 flex items-center gap-2 text-xs text-[#464942]">
        <span className="font-bold">Qty</span>
        <select
          className="h-8 w-16 rounded-lg border border-[#d5d9d9] bg-[#f7f7f5] px-2 text-xs font-semibold text-[#20221f] outline-none focus:border-[#ff663b]"
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
        >
          {QUANTITY_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <button
        className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#ff663b] text-sm font-extrabold text-white transition hover:bg-[#e9562e]"
        type="button"
        onClick={addToCart}
        disabled={variantMissing}
      >
        {added ? <Check size={15} /> : <ShoppingCart size={15} />}
        {added ? "Added to cart" : "Add to Cart"}
      </button>

      <button
        className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#1236a5] text-sm font-extrabold text-white transition hover:bg-[#0e2b83]"
        type="button"
        onClick={buyNow}
        disabled={variantMissing}
      >
        <Zap size={15} />
        Buy Now
      </button>

      <dl className="mt-4 grid grid-cols-[76px_minmax(0,1fr)] gap-y-1.5 border-t border-[#ececea] pt-3 text-[11px]">
        <dt className="text-[#686b65]">Ships from</dt>
        <dd className="font-semibold text-[#292b27]">AcquireAuto</dd>
        <dt className="text-[#686b65]">Sold by</dt>
        <dd className="font-semibold text-[#292b27]">
          {product.storeName || "AcquireAuto marketplace"}
        </dd>
        <dt className="text-[#686b65]">Returns</dt>
        <dd className="font-semibold text-[#292b27]">As per seller policy</dd>
      </dl>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#686b65]">
        <Lock size={12} className="shrink-0 text-[#686b65]" />
        Secure transaction
      </p>

      <button
        className="mt-3 h-9 w-full rounded-full border border-[#d5d9d9] bg-white text-xs font-bold text-[#292b27] transition hover:bg-[#f7f7f5] disabled:opacity-60"
        type="button"
        disabled={listState === "busy"}
        onClick={addToList}
      >
        {listState === "busy" ? "Saving…" : listState === "saved" ? "Saved to list" : "Add to List"}
      </button>
    </aside>
  );
}
