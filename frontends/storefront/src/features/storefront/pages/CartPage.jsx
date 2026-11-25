"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Banknote,
  Building2,
  Check,
  ChevronRight,
  CreditCard,
  Home,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import SiteHeader from "@/features/storefront/components/SiteHeader";
import SiteFooter from "@/features/storefront/components/SiteFooter";
import useCart, { MAX_CART_QUANTITY, summariseCart } from "@/features/storefront/hooks/useCart";
import { formatPrice as formatCurrency } from "@/features/storefront/lib/format";
import profileApi from "@/features/storefront/lib/profileApi";
import { ordersApi } from "@/features/storefront/lib/shopApi";
import { requestCustomerAuthDialog } from "@/lib/authApi";
import { getImageUrl } from "@/features/storefront/lib/imageUrl";

const FREE_SHIPPING_THRESHOLD = 35;

const PAYMENT_OPTIONS = [
  {
    id: "Stripe",
    label: "Credit or debit card",
    hint: "Secure payment powered by Stripe",
    Icon: CreditCard,
  },
  { id: "Wallet", label: "AcquireAuto Wallet", hint: "Pay from your wallet balance", Icon: Wallet },
  {
    id: "Cash on delivery",
    label: "Cash on Delivery",
    hint: "Pay in cash when the order arrives",
    Icon: Banknote,
  },
];

function addressIcon(label) {
  if (/office|work/i.test(label)) return Building2;
  if (/home/i.test(label)) return Home;
  return MapPin;
}

function CartItem({
  item,
  selected,
  onToggleSelected,
  updateQuantity,
  removeItem,
  deliveryLabel,
  onMoveToWishlist,
  onBuyNow,
  wishlistBusy,
}) {
  const image = item.image ? getImageUrl(item.image, { width: 360, quality: 80 }) : "";

  const quantityControl = (
    <div className="flex h-9 items-center justify-between rounded-md border border-[#d1d5db] bg-white px-1">
      <button
        className="grid h-7 w-7 place-items-center rounded text-[#52525b] hover:bg-[#f4f4f5] disabled:cursor-not-allowed disabled:opacity-35"
        aria-label={`Decrease ${item.name} quantity`}
        disabled={item.quantity <= 1}
        onClick={() => updateQuantity(item.id, item.quantity - 1)}
      >
        <Minus size={14} />
      </button>
      <span className="min-w-6 text-center text-sm font-bold" aria-live="polite">
        {item.quantity}
      </span>
      <button
        className="grid h-7 w-7 place-items-center rounded text-[#27272a] hover:bg-[#f4f4f5] disabled:cursor-not-allowed disabled:opacity-35"
        aria-label={`Increase ${item.name} quantity`}
        disabled={item.quantity >= MAX_CART_QUANTITY}
        onClick={() => updateQuantity(item.id, item.quantity + 1)}
      >
        <Plus size={16} />
      </button>
    </div>
  );
  const desktopQuantity = (
    <label className="mt-3 hidden w-24 items-center justify-between gap-1 text-xs text-[#52525b] sm:flex">
      Qty:
      <span className="flex h-8 items-center rounded border border-[#d4d4d8] bg-white">
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded text-[#52525b] hover:bg-[#f4f4f5] disabled:cursor-not-allowed disabled:opacity-35"
          aria-label={`Decrease ${item.name} quantity`}
          disabled={item.quantity <= 1}
          onClick={() => updateQuantity(item.id, item.quantity - 1)}
        >
          <Minus size={13} />
        </button>
        <span className="min-w-6 text-center text-xs font-bold" aria-live="polite">
          {item.quantity}
        </span>
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded text-[#27272a] hover:bg-[#f4f4f5] disabled:cursor-not-allowed disabled:opacity-35"
          aria-label={`Increase ${item.name} quantity`}
          disabled={item.quantity >= MAX_CART_QUANTITY}
          onClick={() => updateQuantity(item.id, item.quantity + 1)}
        >
          <Plus size={14} />
        </button>
      </span>
    </label>
  );
  const discount =
    item.oldPrice > item.price ? Math.round((1 - item.price / item.oldPrice) * 100) : 0;

  return (
    <article
      className={`border-b border-[#e8e9eb] px-4 py-5 last:border-b-0 sm:px-4 sm:py-5 ${selected ? "" : "opacity-70"}`}
    >
      <div className="grid grid-cols-[auto_minmax(84px,26%)_minmax(0,1fr)] gap-3 sm:grid-cols-[auto_80px_minmax(0,1fr)] sm:gap-3">
        <label className="flex items-start pt-1" title={selected ? "Unselect item" : "Select item"}>
          <input
            type="checkbox"
            className="h-5 w-5 cursor-pointer accent-[#ff663b]"
            checked={selected}
            onChange={() => onToggleSelected(item.id)}
            aria-label={`${selected ? "Unselect" : "Select"} ${item.name}`}
          />
        </label>
        <div className="sm:hidden">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-[#f3f4f6]">
            {image ? (
              <Image src={image} alt={item.name} fill sizes="30vw" className="object-cover" />
            ) : (
              <ShoppingCart className="absolute inset-0 m-auto text-[#a1a1aa]" />
            )}
          </div>
          <div className="mt-2">{quantityControl}</div>
        </div>
        <div className="hidden sm:block">
          <div className="relative h-[72px] w-20 overflow-hidden rounded border border-[#e4e4e7] bg-[#f3f4f6]">
            {image ? (
              <Image src={image} alt={item.name} fill sizes="80px" className="object-cover" />
            ) : (
              <ShoppingCart className="absolute inset-0 m-auto text-[#a1a1aa]" />
            )}
          </div>
          {desktopQuantity}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#71717a] sm:hidden">
            {item.category || "Auto part"}
          </p>
          <h2 className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-[#202124] sm:mt-0 sm:truncate sm:text-[15px]">
            {item.name}
          </h2>
          {item.variant && (
            <p className="mt-0.5 text-xs text-[#71717a] sm:hidden">{item.variant}</p>
          )}
          <p className="mt-1 text-[11px] text-[#71717a] sm:mt-1">
            {item.variant && <span className="sm:hidden">Size: {item.variant} · </span>}Sold by:{" "}
            {item.brand || "AcquireAuto"}
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {discount > 0 && <span className="text-sm font-bold text-[#13804a]">↓{discount}%</span>}
            {discount > 0 && (
              <del className="text-xs text-[#858585]">
                {formatCurrency(item.oldPrice * item.quantity, item.currency || "USD")}
              </del>
            )}
            <strong className="text-base font-extrabold text-[#202124]">
              {formatCurrency(item.price * item.quantity, item.currency || "USD")}
            </strong>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-[#f4f5f7] px-3 py-3 text-sm text-[#3f3f46] sm:mt-4">
        <p className="flex items-center gap-2">
          <Truck size={17} className="shrink-0" />
          <span className="sm:hidden">Delivery estimate shown at checkout</span>
          <span className="hidden sm:inline">Estimated delivery by {deliveryLabel}</span>
        </p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-0">
        <button
          onClick={() => removeItem(item.id)}
          className="min-h-10 rounded-md border border-[#d4d4d8] text-[11px] font-semibold text-[#3f3f46] hover:bg-[#f4f4f5] sm:rounded-r-none sm:text-sm"
        >
          Remove
        </button>
        <button
          disabled={wishlistBusy}
          onClick={() => onMoveToWishlist(item)}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-[#d4d4d8] text-[11px] font-semibold text-[#3f3f46] hover:bg-[#f4f4f5] disabled:opacity-60 sm:rounded-none sm:border-x-0 sm:text-sm"
        >
          {wishlistBusy ? <Loader2 size={13} className="animate-spin" /> : null}
          {wishlistBusy ? "Moving…" : "Move to Wishlist"}
        </button>
        <button
          onClick={() => onBuyNow(item)}
          className="min-h-10 rounded-md border border-[#d4d4d8] text-[11px] font-semibold text-[#3f3f46] hover:bg-[#f4f4f5] sm:rounded-l-none sm:text-sm"
        >
          Buy Now
        </button>
      </div>
    </article>
  );
}

export default function CartPage() {
  const router = useRouter();
  const { items, count, ready, signedIn, updateQuantity, removeItem, clearCart, addItem } =
    useCart();

  const [notice, setNotice] = useState(null);
  /*
   * Every line is selected by default; we only remember what the customer
   * unticked so a freshly added part is always ready to check out.
   */
  const [deselectedIds, setDeselectedIds] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [addressesStatus, setAddressesStatus] = useState("idle");
  const [addressesError, setAddressesError] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Stripe");
  const [wallet, setWallet] = useState(null);
  const [checkoutQuote, setCheckoutQuote] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponPreview, setCouponPreview] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [wishlistBusyId, setWishlistBusyId] = useState("");

  function showNotice(text, tone = "info") {
    setNotice({ text, tone });
    window.setTimeout(() => setNotice(null), 3200);
  }

  /* Delivery addresses always come from the signed-in customer's account. */
  useEffect(() => {
    if (!ready) return undefined;
    if (!signedIn) {
      setAddresses([]);
      setAddressesStatus("idle");
      setSelectedAddressId("");
      return undefined;
    }

    let cancelled = false;
    setAddressesStatus("loading");
    setAddressesError("");
    profileApi
      .addresses()
      .then(({ addresses: list }) => {
        if (cancelled) return;
        setAddresses(list);
        setAddressesStatus("ready");
        setSelectedAddressId((current) => {
          if (current && list.some((address) => address.id === current)) return current;
          const preferred = list.find((address) => address.isDefault) || list[0];
          return preferred ? preferred.id : "";
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setAddressesStatus("error");
        setAddressesError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, signedIn]);

  /* Wallet balance is only needed when the customer opens checkout. */
  useEffect(() => {
    if (!signedIn) {
      setWallet(null);
      return undefined;
    }

    let cancelled = false;
    profileApi
      .wallet()
      .then((walletData) => {
        if (cancelled) return;
        setWallet(walletData.wallet);
      })
      .catch(() => {
        /* Checkout surfaces a clear error if a method turns out to be unusable. */
      });

    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) || null;
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 10);
  const deliveryLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(deliveryDate);

  /* Selection drives the price panel, the checkout payload and the sticky bar. */
  const selectedItems = items.filter((item) => !deselectedIds.includes(String(item.id)));
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const selectedTotals = summariseCart(selectedItems);
  const selectedItemIdsKey = selectedItems.map((item) => String(item.id)).join(",");
  const appliedCouponCode = couponPreview?.code || "";
  const cartCurrency = selectedItems[0]?.currency || items[0]?.currency || "USD";
  const formatPrice = (amount) => formatCurrency(amount, cartCurrency);
  const quoteTotals = checkoutQuote?.totals;
  const payableTotal = Number(quoteTotals?.total) || 0;

  useEffect(() => {
    if (!checkoutOpen || !selectedAddressId || !selectedItemIdsKey) {
      setCheckoutQuote(null);
      setQuoteStatus("idle");
      return undefined;
    }
    const controller = new AbortController();
    setCheckoutQuote(null);
    setQuoteStatus("loading");
    setCheckoutError("");
    const payload = {
      addressId: selectedAddressId,
      paymentMethod,
      productIds: selectedItemIdsKey.split(","),
    };
    if (appliedCouponCode) payload.couponCode = appliedCouponCode;
    ordersApi
      .quote(payload, { signal: controller.signal })
      .then(({ quote }) => {
        setCheckoutQuote(quote);
        setQuoteStatus("ready");
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setQuoteStatus("error");
        setCheckoutError(error.message);
      });
    return () => controller.abort();
  }, [checkoutOpen, selectedAddressId, paymentMethod, selectedItemIdsKey, appliedCouponCode]);

  function toggleSelected(id) {
    const key = String(id);
    setDeselectedIds((current) =>
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key],
    );
  }

  function toggleSelectAll() {
    setDeselectedIds(allSelected ? items.map((item) => String(item.id)) : []);
  }

  function openCheckout() {
    setCheckoutError("");
    setCheckoutOpen(true);
  }

  function handleProceedToBuy() {
    if (!selectedItems.length) {
      showNotice("Select at least one item to check out.", "error");
      return;
    }
    if (!signedIn) {
      requestCustomerAuthDialog();
      return;
    }
    if (!selectedAddress) {
      setAddressPickerOpen(true);
      return;
    }
    openCheckout();
  }

  function buyNow(item) {
    if (!items.some((line) => String(line.id) === String(item.id))) {
      addItem(item, 1);
    }
    handleProceedToBuy();
  }

  async function moveToWishlist(item) {
    if (!signedIn) {
      requestCustomerAuthDialog();
      return;
    }
    setWishlistBusyId(item.id);
    try {
      await profileApi.addWishlistItem({
        productId: String(item.id),
        name: item.name,
        brand: item.brand || "",
        category: item.category || "",
        price: item.price,
        oldPrice: item.oldPrice || null,
        image: item.image || "",
      });
      removeItem(item.id);
      showNotice(`${item.name} moved to your wishlist.`);
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setWishlistBusyId("");
    }
  }

  async function placeOrder() {
    if (quoteStatus !== "ready" || !quoteTotals) {
      setCheckoutError("The order total is still being calculated. Please try again.");
      return;
    }
    if (!selectedAddress) {
      setCheckoutError("Choose a delivery address first.");
      return;
    }
    if (!selectedItems.length) {
      setCheckoutError("Select at least one item to place the order.");
      return;
    }
    if (
      paymentMethod === "Wallet" &&
      wallet &&
      wallet.balance < payableTotal
    ) {
      setCheckoutError(
        "Your wallet balance is too low for this order. Add funds or pay another way.",
      );
      return;
    }

    setPlacing(true);
    setCheckoutError("");
    try {
      const payload = {
        addressId: selectedAddress.id,
        paymentMethod,
        productIds: selectedItems.map((item) => String(item.id)),
      };
      if (appliedCouponCode) payload.couponCode = appliedCouponCode;
      const result = await ordersApi.create(payload);
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      const { order } = result;
      /* Only the ordered lines leave the cart, so unselected parts stay put. */
      setDeselectedIds([]);
      setCheckoutOpen(false);
      showNotice(
        order.appliedDiscount
          ? `Coupon ${order.appliedDiscount.code} applied. Order ${order.code} placed.`
          : `Order ${order.code} placed successfully.`,
      );
      router.push("/profile/orders");
    } catch (error) {
      setCheckoutError(error.message);
    } finally {
      setPlacing(false);
    }
  }

  function selectAddress(address) {
    setSelectedAddressId(address.id);
    setAddressPickerOpen(false);
    setCheckoutError("");
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-[65vh] bg-[#f1f2f4] px-3 pb-28 pt-4 text-[#202124] sm:px-6 sm:py-8 lg:pb-12">
        <div className="mx-auto max-w-6xl">
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex items-center gap-2 overflow-hidden rounded-lg bg-white px-4 py-3 text-sm text-[#52525b] shadow-sm sm:mb-6"
          >
            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-2 font-semibold hover:text-[#ef6b36]"
            >
              <Home size={17} /> Home
            </Link>
            <ChevronRight size={16} className="shrink-0 text-[#a1a1aa]" />
            <span className="truncate font-medium text-[#202124]">Shopping Cart ({count})</span>
          </nav>

          {!ready && items.length === 0 ? (
            <section className="flex min-h-60 items-center justify-center gap-2 rounded-lg bg-white p-8 text-sm text-[#52525b] shadow-sm">
              <Loader2 size={18} className="animate-spin text-[#ef6b36]" /> Loading your cart…
            </section>
          ) : items.length === 0 ? (
            <section className="flex min-h-80 flex-col items-center justify-center rounded-lg bg-white p-8 text-center shadow-sm">
              <ShoppingCart size={44} className="text-[#ef6b36]" />
              <h1 className="mt-4 text-xl font-bold">Your cart is empty</h1>
              <p className="mt-2 max-w-sm text-sm text-[#71717a]">
                {signedIn
                  ? "Browse parts and add the items you need. Your cart is saved to your account."
                  : "Browse parts and add the items you need, then sign in to check out."}
              </p>
              <Link
                className="mt-5 rounded-md bg-[#ff663b] px-6 py-3 text-sm font-bold text-white hover:bg-[#e9562e]"
                href="/parts"
              >
                Continue shopping
              </Link>
            </section>
          ) : (
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5">
              <section
                className="overflow-hidden rounded-lg bg-white shadow-sm"
                aria-label="Cart items"
              >
                <div className="flex items-center justify-between gap-3 border-b border-[#e8e9eb] px-4 py-4 sm:px-6">
                  <label className="flex min-w-0 cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      className="h-5 w-5 shrink-0 cursor-pointer accent-[#ff663b]"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label={allSelected ? "Unselect all items" : "Select all items"}
                    />
                    <span className="min-w-0">
                      <h1 className="text-lg font-bold sm:text-xl">My Cart</h1>
                      <p className="mt-0.5 text-xs text-[#71717a]">
                        {count} {count === 1 ? "item" : "items"} · {selectedItems.length} selected
                      </p>
                    </span>
                  </label>
                  <button
                    onClick={clearCart}
                    className="shrink-0 text-sm font-semibold text-[#52525b] underline underline-offset-2 hover:text-red-600"
                  >
                    Clear cart
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 text-sm sm:px-6">
                  <span className="min-w-0 truncate font-medium sm:hidden">
                    {signedIn
                      ? selectedAddress
                        ? `Deliver to ${selectedAddress.label}`
                        : "Select a delivery address"
                      : "Sign in to save addresses"}
                  </span>
                  <span className="hidden min-w-0 truncate font-medium sm:block">
                    {signedIn
                      ? selectedAddress
                        ? `Deliver to ${selectedAddress.label}: ${selectedAddress.line}`
                        : "From Saved Addresses"
                      : "Sign in to use your saved addresses"}
                  </span>
                  {signedIn ? (
                    <>
                      <button
                        onClick={() => setAddressPickerOpen(true)}
                        className="shrink-0 rounded-md border border-[#d4d4d8] px-3 py-2 text-xs font-semibold text-[#3f3f46] hover:bg-[#f4f4f5] sm:hidden"
                      >
                        {selectedAddress ? "Change" : "Select"}
                      </button>
                      <button
                        onClick={() => setAddressPickerOpen(true)}
                        className="hidden shrink-0 rounded-md border border-[#d4d4d8] px-3 py-2 text-xs font-semibold text-[#1236a5] hover:bg-[#f4f4f5] sm:block"
                      >
                        {selectedAddress ? "Change address" : "Choose address"}
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/profile"
                      className="shrink-0 rounded-md border border-[#d4d4d8] px-3 py-2 text-xs font-semibold text-[#1236a5] hover:bg-[#f4f4f5]"
                    >
                      Sign in
                    </Link>
                  )}
                </div>
                {addressesStatus === "error" && signedIn && (
                  <p className="border-t border-[#f4d7d7] bg-[#fdf2f2] px-4 py-2 text-xs text-[#b42318] sm:px-6">
                    {addressesError}
                  </p>
                )}
                {items.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    selected={!deselectedIds.includes(String(item.id))}
                    onToggleSelected={toggleSelected}
                    updateQuantity={updateQuantity}
                    removeItem={removeItem}
                    deliveryLabel={deliveryLabel}
                    onMoveToWishlist={moveToWishlist}
                    onBuyNow={buyNow}
                    wishlistBusy={wishlistBusyId === item.id}
                  />
                ))}
                <div className="flex justify-end px-4 py-4 sm:px-6">
                  <Link
                    href="/parts"
                    className="text-sm font-semibold text-[#1236a5] hover:underline"
                  >
                    Continue shopping
                  </Link>
                </div>
              </section>

              <aside className="hidden overflow-hidden rounded-lg bg-white shadow-sm lg:sticky lg:top-6 lg:block">
                <h2 className="border-b border-[#e8e9eb] bg-[#f5f6f8] px-5 py-4 text-base font-bold">
                  Price Details
                </h2>
                <div className="space-y-4 px-5 py-5 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#52525b]">
                      Selling Price ({selectedTotals.count} items)
                    </span>
                    <strong>{formatPrice(selectedTotals.subtotal + selectedTotals.savings)}</strong>
                  </div>
                  {selectedTotals.savings > 0 && (
                    <div className="flex justify-between gap-4">
                      <span className="text-[#52525b]">Discount</span>
                      <strong className="text-[#15803d]">
                        −{formatPrice(selectedTotals.savings)}
                      </strong>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <span className="text-[#52525b]">Delivery</span>
                    <strong className={selectedTotals.shipping === 0 ? "text-[#15803d]" : ""}>
                      {selectedTotals.shipping === 0
                        ? "FREE"
                        : formatPrice(selectedTotals.shipping)}
                    </strong>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-[#d4d4d8] pt-4 text-base">
                    <strong>Total Amount</strong>
                    <strong>{formatPrice(selectedTotals.total)}</strong>
                  </div>
                  {selectedTotals.savings > 0 && (
                    <p className="rounded-md bg-[#dcfce7] px-3 py-2.5 text-center text-sm font-medium text-[#15803d]">
                      You save {formatPrice(selectedTotals.savings)} on this order
                    </p>
                  )}
                  {selectedTotals.shipping > 0 && (
                    <p className="text-xs text-[#71717a]">
                      Add {formatPrice(FREE_SHIPPING_THRESHOLD - selectedTotals.subtotal)} more for
                      free delivery.
                    </p>
                  )}
                </div>
                <div className="flex items-start gap-3 border-t border-[#e8e9eb] px-5 py-4 text-xs leading-5 text-[#52525b]">
                  <ShieldCheck size={20} className="shrink-0 text-[#71717a]" />
                  <span>
                    Secure transaction. Your payment is charged from your AcquireAuto account.
                  </span>
                </div>
                <div className="px-5 pb-5">
                  <button
                    className="w-full rounded-md bg-brand px-5 py-3 text-sm font-bold text-[#202124] hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!ready || !selectedItems.length}
                    onClick={handleProceedToBuy}
                  >
                    {signedIn ? "Proceed to buy" : "Sign in to buy"}
                  </button>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>

      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[60] bg-white/95 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,.12)] backdrop-blur lg:hidden">
          <div className="mx-auto max-w-3xl rounded-[22px] border border-[#dedfe3] bg-white p-2.5">
            {selectedTotals.savings > 0 && (
              <p className="mb-2 rounded-full bg-[#e2f8ed] px-3 py-2 text-xs font-semibold text-[#16804a]">
                You’ll save <strong>{formatPrice(selectedTotals.savings)}</strong> on this order
              </p>
            )}
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                {selectedTotals.savings > 0 && (
                  <del className="block text-xs text-[#858585]">
                    {formatPrice(selectedTotals.subtotal + selectedTotals.savings)}
                  </del>
                )}
                <p className="text-[10px] text-[#71717a]">
                  {selectedTotals.count} of {count} selected · Total{" "}
                  {selectedTotals.shipping > 0
                    ? `(+ ${formatPrice(selectedTotals.shipping)} delivery)`
                    : "(free delivery)"}
                </p>
                <strong className="text-lg leading-6">{formatPrice(selectedTotals.total)}</strong>
              </div>
              <button
                className="min-h-12 shrink-0 rounded-full bg-brand px-6 text-sm font-extrabold text-[#202124] shadow-sm hover:bg-brand disabled:opacity-60"
                disabled={!ready || !selectedItems.length}
                onClick={handleProceedToBuy}
              >
                {signedIn ? "Proceed to buy" : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      )}

      {addressPickerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end bg-black/65 lg:items-stretch lg:justify-end"
          onClick={() => setAddressPickerOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-picker-title"
            className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl lg:h-full lg:max-h-none lg:w-[min(480px,42vw)] lg:rounded-none"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-14 shrink-0 rounded-full bg-[#d4d4d8] lg:hidden" />
            <header className="flex items-center justify-between border-b border-dashed border-[#d4d4d8] px-5 py-4 sm:px-6">
              <h2 id="address-picker-title" className="text-lg font-bold text-[#202124]">
                Select delivery address
              </h2>
              <button
                className="grid h-9 w-9 place-items-center rounded-full text-[#52525b] hover:bg-[#f4f4f5]"
                onClick={() => setAddressPickerOpen(false)}
                aria-label="Close address selection"
              >
                <X size={22} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4 sm:px-6">
              <Link
                href="/address/new"
                onClick={() => setAddressPickerOpen(false)}
                className="flex min-h-14 w-full items-center justify-between rounded-xl border border-[#cfe2fa] bg-[#eff7ff] px-4 text-left text-base font-bold text-[#1766c1] hover:bg-[#e6f2ff] lg:hidden"
              >
                <span className="flex items-center gap-3">
                  <Plus size={22} strokeWidth={3} /> Add New
                </span>
                <ChevronRight size={20} />
              </Link>
              <div className="mt-2 hidden items-center justify-between lg:flex">
                <h3 className="text-sm font-bold text-[#202124]">Saved addresses</h3>
                <Link
                  href="/address/new"
                  onClick={() => setAddressPickerOpen(false)}
                  className="inline-flex items-center gap-1 text-sm font-bold text-[#1766c1] hover:underline"
                >
                  <Plus size={16} /> Add New
                </Link>
              </div>
              <h3 className="mb-3 mt-6 text-sm font-bold text-[#71717a] lg:hidden">
                Saved addresses
              </h3>
              {addressesStatus === "loading" ? (
                <p className="flex items-center gap-2 py-6 text-sm text-[#71717a]">
                  <Loader2 size={16} className="animate-spin" /> Loading your addresses…
                </p>
              ) : addresses.length === 0 ? (
                <p className="py-6 text-sm text-[#71717a]">
                  No saved addresses yet. Add one to continue with delivery.
                </p>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => {
                    const AddressIcon = addressIcon(address.label);
                    const selected = selectedAddressId === address.id;
                    return (
                      <button
                        key={address.id}
                        onClick={() => selectAddress(address)}
                        className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${selected ? "border-[#7db8ef] bg-[#f4f9ff]" : "border-[#d4d4d8] hover:bg-[#fafafa]"}`}
                      >
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-[#e4e4e7] bg-[#f7f8fa] text-[#27272a]">
                          <AddressIcon size={24} strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-sm font-bold text-[#202124]">
                            {address.label}
                            {selected && (
                              <span className="rounded bg-[#d8edff] px-2 py-0.5 text-[10px] font-bold text-[#1766c1]">
                                Selected
                              </span>
                            )}
                            {address.isDefault && !selected && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#71717a]">
                                Default
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block text-sm font-semibold text-[#3f3f46]">
                            {address.name}
                            {address.phone ? ` · ${address.phone}` : ""}
                          </span>
                          <span className="mt-0.5 block line-clamp-2 text-sm leading-5 text-[#71717a]">
                            {[address.line, address.city, address.region, address.postalCode]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </span>
                        <ChevronRight size={18} className="mt-1 shrink-0 text-[#71717a]" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end bg-black/65 lg:items-center lg:justify-center"
          onClick={() => (placing ? null : setCheckoutOpen(false))}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
            className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white text-[#202124] shadow-2xl lg:max-h-[88dvh] lg:w-[min(560px,92vw)] lg:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-14 shrink-0 rounded-full bg-[#d4d4d8] lg:hidden" />
            <header className="flex items-center justify-between border-b border-[#e8e9eb] px-5 py-4">
              <h2 id="checkout-title" className="text-lg font-bold">
                Checkout
              </h2>
              <button
                disabled={placing}
                onClick={() => setCheckoutOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full text-[#52525b] hover:bg-[#f4f4f5] disabled:opacity-50"
                aria-label="Close checkout"
              >
                <X size={22} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="rounded-lg border border-[#e4e4e7] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#71717a]">
                      Deliver to
                    </p>
                    {selectedAddress ? (
                      <>
                        <p className="mt-1 text-sm font-bold">
                          {selectedAddress.name} · {selectedAddress.label}
                        </p>
                        <p className="mt-0.5 text-xs leading-5 text-[#52525b]">
                          {[
                            selectedAddress.line,
                            selectedAddress.city,
                            selectedAddress.region,
                            selectedAddress.postalCode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        {selectedAddress.phone && (
                          <p className="mt-0.5 text-xs text-[#71717a]">{selectedAddress.phone}</p>
                        )}
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-[#b42318]">No delivery address selected.</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setCheckoutOpen(false);
                      setAddressPickerOpen(true);
                    }}
                    className="shrink-0 text-xs font-semibold text-[#1236a5] hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>

              <h3 className="mt-5 text-sm font-bold">Payment method</h3>
              <div className="mt-2 space-y-2">
                {PAYMENT_OPTIONS.map((option) => {
                  const disabled =
                    option.id === "Wallet" &&
                    (quoteStatus !== "ready" ||
                      !wallet ||
                      wallet.balance < payableTotal);
                  const selected = paymentMethod === option.id;
                  return (
                    <div key={option.id}>
                      <button
                        type="button"
                        disabled={disabled || placing}
                        onClick={() => {
                          setPaymentMethod(option.id);
                          setCheckoutError("");
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition disabled:opacity-55 ${selected && !disabled ? "border-[#ff663b] bg-[#fff7f2]" : "border-[#e4e4e7] hover:border-[#c9c9cd]"}`}
                      >
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${selected && !disabled ? "bg-[#ffe3d5] text-[#c2410c]" : "bg-[#f4f4f5] text-[#52525b]"}`}
                        >
                          <option.Icon size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{option.label}</span>
                          <span className="mt-0.5 block text-xs text-[#71717a]">
                            {option.id === "Wallet" && wallet
                              ? `Balance ${formatPrice(wallet.balance)}${wallet.balance < selectedTotals.total ? " · not enough for this order" : ""}`
                              : option.hint}
                          </span>
                        </span>
                        {selected && !disabled && (
                          <Check size={18} className="shrink-0 text-[#ff663b]" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              <h3 className="mt-5 text-sm font-bold">Order summary</h3>
              <label className="mt-3 block text-xs font-semibold text-[#52525b]">
                Discount code
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(event) => {
                      setCouponCode(event.target.value.toUpperCase());
                      setCouponPreview(null);
                    }}
                    disabled={placing}
                    placeholder="Enter coupon code"
                    className="h-10 min-w-0 flex-1 rounded-lg border border-[#e4e4e7] bg-white px-3 text-sm uppercase outline-none focus:border-[#ff663b]"
                  />
                  <button
                    type="button"
                    disabled={placing || couponBusy || !couponCode.trim()}
                    onClick={async () => {
                      setCouponBusy(true);
                      setCheckoutError("");
                      try {
                        const result = await ordersApi.validateCoupon(
                          couponCode,
                          selectedItems.map((item) => String(item.id)),
                        );
                        setCouponPreview(result.coupon);
                      } catch (error) {
                        setCouponPreview(null);
                        setCheckoutError(error.message);
                      } finally {
                        setCouponBusy(false);
                      }
                    }}
                    className="rounded-lg border border-[#e4e4e7] px-3 text-xs font-bold text-[#c2410c] disabled:opacity-50"
                  >
                    {couponBusy ? "Checking…" : couponPreview ? "Applied" : "Apply"}
                  </button>
                </div>
                {couponPreview && (
                  <span className="mt-1 block text-[11px] font-semibold text-[#15803d]">
                    {couponPreview.code} applied · save {formatPrice(couponPreview.amount)}
                  </span>
                )}
              </label>
              <div className="mt-2 space-y-2.5 rounded-lg bg-[#f7f8fa] p-3 text-sm">
                {quoteTotals ? (
                  <>
                    <div className="flex justify-between gap-4">
                      <span className="text-[#52525b]">Items ({selectedTotals.count})</span>
                      <strong>{formatPrice(quoteTotals.subtotal)}</strong>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[#52525b]">Delivery</span>
                      <strong>{quoteTotals.shipping === 0 ? "FREE" : formatPrice(quoteTotals.shipping)}</strong>
                    </div>
                    {quoteTotals.tax > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-[#52525b]">Tax</span>
                        <strong>{formatPrice(quoteTotals.tax)}</strong>
                      </div>
                    )}
                    {quoteTotals.savings > (checkoutQuote.appliedDiscount?.amount || 0) && (
                      <div className="flex justify-between gap-4">
                        <span className="text-[#52525b]">Savings vs original price</span>
                        <strong className="text-[#15803d]">{formatPrice(quoteTotals.savings - (checkoutQuote.appliedDiscount?.amount || 0))}</strong>
                      </div>
                    )}
                    {checkoutQuote.appliedDiscount?.amount > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-[#52525b]">Coupon · {checkoutQuote.appliedDiscount.code}</span>
                        <strong className="text-[#15803d]">−{formatPrice(checkoutQuote.appliedDiscount.amount)}</strong>
                      </div>
                    )}
                    {quoteTotals.platformFee > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-[#52525b]">Platform fee ({checkoutQuote.platformFeeRate}%)</span>
                        <strong>{formatPrice(quoteTotals.platformFee)}</strong>
                      </div>
                    )}
                    <div className="flex justify-between gap-4 border-t border-dashed border-[#d4d4d8] pt-2.5 text-base">
                      <strong>Total payable</strong>
                      <strong>{formatPrice(payableTotal)}</strong>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[#71717a]">
                    {quoteStatus === "loading" ? "Calculating items, delivery, tax, and platform fee…" : "Order total will appear here."}
                  </p>
                )}
              </div>

              {checkoutError && (
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#fdf2f2] px-3 py-2.5 text-sm text-[#b42318]">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {checkoutError}
                </p>
              )}
            </div>

            <div className="border-t border-[#e8e9eb] px-5 py-4">
              <button
                onClick={placeOrder}
                disabled={placing || !selectedItems.length || quoteStatus !== "ready"}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#ff663b] text-sm font-bold text-white hover:bg-[#e9562e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {placing && <Loader2 size={16} className="animate-spin" />}
                {placing
                  ? "Placing your order…"
                  : quoteStatus === "loading"
                    ? "Calculating order total…"
                    : quoteStatus === "ready"
                      ? `Place order · ${formatPrice(payableTotal)}`
                      : "Order total unavailable"}
              </button>
              <p className="mt-2 text-center text-[11px] text-[#71717a]">
                By placing this order you agree to the AcquireAuto terms of sale.
              </p>
            </div>
          </section>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className={`fixed inset-x-4 bottom-24 z-[120] mx-auto max-w-sm rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg lg:bottom-6 ${notice.tone === "error" ? "bg-[#b42318]" : "bg-[#202124]"}`}
        >
          {notice.text}
        </div>
      )}

      <SiteFooter />
    </>
  );
}
