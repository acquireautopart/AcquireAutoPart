"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { requestCurrentCustomer, SESSION_EVENT } from "@/lib/authApi";
import { cartApi } from "@/features/storefront/lib/shopApi";

const CART_STORAGE_KEY = "acquireauto-cart";
const CART_EVENT = "acquireauto-cart-change";

/* Mirrors the shop service so a guest cart previews the same money maths. */
const FREE_SHIPPING_THRESHOLD = 35;
const SHIPPING_FEE = 5.99;

/*
 * Guests keep their cart in localStorage; signed-in customers keep it on the
 * server. These module values are shared by every hook instance so navigating
 * between pages paints the last known cart instantly, then refreshes it.
 */
let sharedMode = null; // "guest" | "server" | null while the session is unknown
let sharedItems = null; // last cart the server returned

/*
 * Collapses duplicate lines onto a single entry keyed by product id. Older
 * guest carts could store the same part on two lines, and the storefront
 * renders one React child per line, so the ids have to stay unique.
 */
function dedupeItems(items) {
  const unique = [];
  const seen = new Map();

  for (const item of items || []) {
    const id = item?.id === undefined || item?.id === null ? null : String(item.id);
    if (!id) {
      unique.push(item);
      continue;
    }

    const index = seen.get(id);
    if (index === undefined) {
      seen.set(id, unique.length);
      unique.push({ ...item, id });
    } else {
      unique[index] = {
        ...unique[index],
        quantity: (Number(unique[index].quantity) || 0) + (Number(item.quantity) || 0),
      };
    }
  }

  return unique;
}

function readLocalCart() {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? dedupeItems(
          parsed.filter((item) =>
            /^[a-f\d]{24}$/i.test(String(item?.productId || item?.id || "").split("::")[0]),
          ),
        )
      : [];
  } catch {
    return [];
  }
}

function writeLocalCart(items) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Keep the cart usable for this tab if browser storage is unavailable.
  }
}

function emitCartChange(items) {
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: { items } }));
}

/* Server items expose `productId`; the storefront UI works with `id`. */
function normaliseServerItems(items) {
  const normalised = (items || []).map((item) => ({
    id: item.variantId ? `${item.productId}::${item.variantId}` : String(item.productId),
    productId: String(item.productId),
    variantId: item.variantId || "",
    name: item.name,
    price: Number(item.price) || 0,
    currency: item.currency || "USD",
    oldPrice: item.oldPrice === null || item.oldPrice === undefined ? 0 : Number(item.oldPrice),
    brand: item.brand || "",
    variant: item.variant || "",
    image: item.image || "",
    category: item.category || "",
    quantity: Number(item.quantity) || 0,
  }));
  return dedupeItems(normalised);
}

function toServerItem(item, quantity) {
  return {
    productId: String(item.productId || item.id).split("::")[0],
    variantId: item.variantId || String(item.id).split("::")[1] || "",
    name: item.name,
    price: Number(item.price) || 0,
    currency: item.currency || "USD",
    oldPrice: Number(item.oldPrice) || null,
    brand: item.brand || "",
    category: item.category || "",
    variant: item.variant || "",
    image: item.image || "",
    quantity,
  };
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

/* Matches the server-side cart line limit. */
export const MAX_CART_QUANTITY = 99;

function clampQuantity(value) {
  const amount = Math.floor(Number(value) || 0);
  return Math.min(MAX_CART_QUANTITY, Math.max(0, amount));
}

/*
 * Shared money maths so the cart preview and the cart page (which may total up
 * only the selected lines) can never disagree.
 */
export function summariseCart(items) {
  const list = items || [];
  const count = list.reduce((total, item) => total + item.quantity, 0);
  const subtotal = roundMoney(list.reduce((total, item) => total + item.price * item.quantity, 0));
  const savings = roundMoney(
    list.reduce(
      (total, item) =>
        total + Math.max(0, (item.oldPrice || item.price) - item.price) * item.quantity,
      0,
    ),
  );
  const shipping = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;
  return { count, subtotal, savings, shipping, total: roundMoney(subtotal + shipping) };
}

export default function useCart() {
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState("guest");
  const [ready, setReady] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);

  const itemsRef = useRef([]);
  const modeRef = useRef("guest");
  /*
   * Bumped on every local change. A server reply is only applied when it still
   * belongs to the newest change, so tapping "+" faster than the network can
   * answer never snaps the quantity back to an older value.
   */
  const writeVersionRef = useRef(0);

  const setSnapshot = useCallback((next) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  /* Guest writes persist locally; signed-in writes stay server-side. */
  const commitGuest = useCallback(
    (next) => {
      setSnapshot(next);
      sharedMode = "guest";
      sharedItems = null;
      writeLocalCart(next);
      emitCartChange(next);
    },
    [setSnapshot],
  );

  const commitServer = useCallback(
    (cart) => {
      const next = normaliseServerItems(cart?.items);
      setSnapshot(next);
      sharedMode = "server";
      sharedItems = next;
      emitCartChange(next);
    },
    [setSnapshot],
  );

  /* Optimistic server write — reverted by the caller if the request fails. */
  const previewServer = useCallback(
    (next) => {
      setSnapshot(next);
      sharedItems = next;
      emitCartChange(next);
    },
    [setSnapshot],
  );

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function bootstrap() {
      /* Paint the last known cart immediately, then reconcile with the server. */
      if (sharedMode === "guest") {
        const cached = readLocalCart();
        if (cached.length) setSnapshot(cached);
      } else if (sharedItems) {
        setSnapshot(sharedItems);
      }

      let customer = null;
      try {
        const session = await requestCurrentCustomer({ signal: controller.signal });
        customer = session?.customer || null;
      } catch (error) {
        if (error.name === "AbortError") return;
        customer = null;
      }
      if (cancelled) return;

      if (!customer) {
        modeRef.current = "guest";
        sharedMode = "guest";
        sharedItems = null;
        setMode("guest");
        setSnapshot(readLocalCart());
        setReady(true);
        return;
      }

      modeRef.current = "server";
      sharedMode = "server";
      setMode("server");

      try {
        /* A guest cart carried into sign-in is folded into the server cart. */
        const guestItems = readLocalCart();
        const data = guestItems.length
          ? await cartApi.merge(guestItems.map((item) => toServerItem(item, item.quantity)))
          : await cartApi.get();
        if (cancelled) return;
        if (guestItems.length) writeLocalCart([]);
        commitServer(data.cart);
      } catch (error) {
        if (error.name === "AbortError") return;
        /* Keep showing the local snapshot when the shop is unreachable. */
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    bootstrap();

    const sync = (event) => {
      if (event.type === "storage" && event.key && event.key !== CART_STORAGE_KEY) return;
      setSnapshot(event.detail?.items || readLocalCart());
    };
    const onSessionChange = () => setSessionVersion((version) => version + 1);

    window.addEventListener(CART_EVENT, sync);
    window.addEventListener("storage", sync);
    window.addEventListener(SESSION_EVENT, onSessionChange);
    return () => {
      cancelled = true;
      controller.abort();
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(SESSION_EVENT, onSessionChange);
    };
  }, [commitServer, setSnapshot, sessionVersion]);

  const addItem = useCallback(
    (product, quantity = 1) => {
      if (!product) return;
      const amount = Math.max(1, clampQuantity(quantity) || 1);
      const productId = String(
        product.productId ?? product.id ?? product.name ?? `item-${Date.now()}`,
      ).split("::")[0];
      const variantId = String(product.variantId || "");
      const id = variantId ? `${productId}::${variantId}` : productId;
      const current = itemsRef.current;
      const found = current.find((item) => String(item.id) === id);

      /* Freshest catalogue snapshot wins, falling back to what we already show. */
      const snapshot = {
        id,
        productId,
        variantId,
        name: product.name || found?.name || "Auto part",
        price: Number(product.price) || found?.price || 0,
        currency: product.currency || found?.currency || "USD",
        oldPrice: Number(product.oldPrice) || found?.oldPrice || 0,
        brand: product.brand || found?.brand || "",
        variant: product.variant || found?.variant || "",
        image: product.image || found?.image || "",
        category: product.category || found?.category || "",
      };
      const next = found
        ? current.map((item) =>
            String(item.id) === id
              ? { ...snapshot, quantity: Math.min(MAX_CART_QUANTITY, item.quantity + amount) }
              : item,
          )
        : [...current, { ...snapshot, quantity: amount }];

      if (modeRef.current !== "server") {
        commitGuest(next);
        return;
      }

      const version = (writeVersionRef.current += 1);
      previewServer(next);
      cartApi
        .addItem(toServerItem(snapshot, amount))
        .then((data) => {
          if (version === writeVersionRef.current) commitServer(data.cart);
        })
        .catch(() => {
          if (version === writeVersionRef.current) previewServer(current);
        });
    },
    [commitGuest, commitServer, previewServer],
  );

  const updateQuantity = useCallback(
    (id, quantity) => {
      const amount = clampQuantity(quantity);
      const current = itemsRef.current;
      const next =
        amount <= 0
          ? current.filter((item) => String(item.id) !== String(id))
          : current.map((item) =>
              String(item.id) === String(id) ? { ...item, quantity: amount } : item,
            );

      if (modeRef.current !== "server") {
        commitGuest(next);
        return;
      }

      const version = (writeVersionRef.current += 1);
      previewServer(next);
      const request = amount <= 0 ? cartApi.removeItem(id) : cartApi.setQuantity(id, amount);
      request
        .then((data) => {
          if (version === writeVersionRef.current) commitServer(data.cart);
        })
        .catch(() => {
          if (version === writeVersionRef.current) previewServer(current);
        });
    },
    [commitGuest, commitServer, previewServer],
  );

  const removeItem = useCallback((id) => updateQuantity(id, 0), [updateQuantity]);

  const clearCart = useCallback(() => {
    const current = itemsRef.current;
    if (modeRef.current !== "server") {
      commitGuest([]);
      return;
    }

    const version = (writeVersionRef.current += 1);
    previewServer([]);
    cartApi
      .clear()
      .then((data) => {
        if (version === writeVersionRef.current) commitServer(data.cart);
      })
      .catch(() => {
        if (version === writeVersionRef.current) previewServer(current);
      });
  }, [commitGuest, commitServer, previewServer]);

  const { count, subtotal, savings, shipping, total } = summariseCart(items);

  return {
    items,
    count,
    subtotal,
    savings,
    shipping,
    total,
    mode,
    signedIn: mode === "server",
    ready,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  };
}
