"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, MapPin, Menu, Moon, Plus, Search, Sun, X } from "lucide-react";
import { sellerApi } from "@/features/seller/lib/sellerApi";
import { DashboardPage } from "@/features/seller/dashboard/pages/DashboardPage";
import { ProductsPage } from "@/features/seller/products/pages/ProductsPage";
import { InventoryPage } from "@/features/seller/inventory/pages/InventoryPage";
import { OrdersPage } from "@/features/seller/orders/pages/OrdersPage";
import { ReturnsPage } from "@/features/seller/returns/pages/ReturnsPage";
import { PayoutsPage } from "@/features/seller/payouts/pages/PayoutsPage";
import { AnalyticsPage } from "@/features/seller/analytics/pages/AnalyticsPage";
import { DiscountsPage } from "@/features/seller/discounts/pages/DiscountsPage";
import { CustomersPage } from "@/features/seller/customers/pages/CustomersPage";
import { StoreSettingsPage } from "@/features/seller/settings/pages/StoreSettingsPage";
import { cx } from "@/features/seller/shared/components/utils";
import { SignIn } from "@/features/seller/shared/components/SignIn";
import IdentityVerification from "@/features/seller/shared/components/IdentityVerification";
import { Button, Panel, Icon } from "@/features/seller/shared/components/ui";
import { ProductForm } from "@/features/seller/products/components/ProductForm";
import { ProductImportDialog } from "@/features/seller/products/components/ProductImportDialog";
import { DiscountForm } from "@/features/seller/discounts/components/DiscountForm";
import SellerSidebar from "@/features/seller/shared/components/SellerSidebar";

const SECTION_PATHS = {
  Dashboard: "/seller",
  Products: "/seller/products",
  Orders: "/seller/orders",
  Inventory: "/seller/inventory",
  Returns: "/seller/returns",
  Payouts: "/seller/payouts",
  Analytics: "/seller/analytics",
  Discounts: "/seller/discounts",
  Customers: "/seller/customers",
  "Store settings": "/seller/settings",
};

function LocationAccessGate({ busy, error, onEnable }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f7f5] p-5 dark:bg-[#090909]">
      <Panel className="w-full max-w-md p-6 text-center">
        <MapPin className="mx-auto text-orange-600" size={28} />
        <h1 className="mt-3 text-lg font-extrabold">Location access is required</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Keep device location services on and allow location access in your browser to use the
          seller workspace.
        </p>
        {busy && (
          <p role="status" className="mt-3 text-xs text-neutral-500">
            Checking your current location…
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {error}
          </p>
        )}
        {!busy && (
          <Button
            variant="primary"
            className="mt-4 min-h-10"
            onClick={onEnable}
          >
            Enable location
          </Button>
        )}
      </Panel>
    </main>
  );
}

function SellerDashboard({ initialSection = "Dashboard" }) {
  const router = useRouter();
  const section = initialSection;
  const [seller, setSeller] = useState(null);
  const [busy, setBusy] = useState(true);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("initializing");
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState("");
  const locationWatchRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [dark, setDark] = useState(true);
  const [themeInitialized, setThemeInitialized] = useState(false);
  const [range, setRange] = useState(30);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState("");
  const [editing, setEditing] = useState(null);
  const [productFormError, setProductFormError] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [returns, setReturns] = useState([]);
  const [payouts, setPayouts] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const refreshNotifications = useCallback(async () => {
    const data = await sellerApi.notifications();
    setNotifications(data.notifications || []);
    setUnreadNotifications(data.unreadCount || 0);
  }, []);
  const fetchCore = useCallback(async () => {
    const [d, p, o, pay] = await Promise.all([
      sellerApi.dashboard(),
      sellerApi.products(),
      sellerApi.orders(),
      sellerApi.payouts(),
    ]);
    setDashboard(d);
    setProducts(p.products || []);
    setOrders(o.orders || []);
    setPayouts(pay);
    setSeller(d.seller);
  }, []);
  const startLocationWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(null);
      setLocationStatus("blocked");
      setLocationError("This device or browser does not support location access.");
      setLocationBusy(false);
      return;
    }
    if (locationWatchRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
    locationWatchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationStatus("ready");
        setLocationBusy(false);
        setLocationError("");
        try {
          localStorage.setItem("acquireauto-seller-location-granted", "true");
        } catch {
          setLocationError("Location access is on, but this browser cannot remember the setting.");
        }
      },
      (locationFailure) => {
        setLocation(null);
        setLocationStatus("blocked");
        setLocationBusy(false);
        if (locationFailure.code === 1) {
          try {
            localStorage.removeItem("acquireauto-seller-location-granted");
          } catch {
            setLocationError("Allow location access for this site in your browser settings.");
          }
        }
        setLocationError(
          locationFailure.code === 1
            ? "Allow location access for this site in your browser settings."
            : "Turn on device location services, then try again.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  }, []);
  const enableLocation = useCallback(() => {
    setLocation(null);
    setLocationBusy(true);
    setLocationError("");
    setLocationStatus("checking");
  }, []);
  useEffect(
    () => () => {
      if (locationWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
    },
    [],
  );
  useEffect(() => {
    try {
      const previouslyGranted =
        localStorage.getItem("acquireauto-seller-location-granted") === "true";
      if (previouslyGranted) {
        setLocationBusy(true);
        setLocationStatus("checking");
      } else {
        setLocationStatus("required");
      }
    } catch {
      setLocationStatus("required");
    }
  }, []);
  useEffect(() => {
    if (locationStatus === "checking") startLocationWatch();
  }, [locationStatus, startLocationWatch]);
  useEffect(() => {
    const theme = localStorage.getItem("acquireauto-theme");
    const value = theme !== "light";
    setDark(value);
    document.documentElement.dataset.theme = value ? "dark" : "light";
    document.documentElement.classList.toggle("dark", value);
    setThemeInitialized(true);
    sellerApi
      .me()
      .then(({ seller: s }) => {
        setSeller(s);
      })
      .catch((e) => {
        if (e.status !== 401) setError(e.message);
      })
      .finally(() => setBusy(false));
  }, [fetchCore]);
  const sellerId = seller?.id || seller?._id || "";
  const locationReady = Boolean(location);
  useEffect(() => {
    if (!sellerId || !locationReady) return undefined;
    let active = true;
    setBusy(true);
    fetchCore()
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [sellerId, locationReady, fetchCore]);
  useEffect(() => {
    if (!seller || !locationReady) return;
    if (!seller.storeName) router.replace("/seller/onboarding");
  }, [seller, router]);
  useEffect(() => {
    if (!seller) return;
    let active = true;
    const loadNotifications = async () => {
      try {
        const data = await sellerApi.notifications();
        if (!active) return;
        setNotifications(data.notifications || []);
        setUnreadNotifications(data.unreadCount || 0);
      } catch (notificationError) {
        if (active) setError(notificationError.message);
      }
    };
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [seller, locationReady]);
  useEffect(() => {
    if (!themeInitialized) return;
    localStorage.setItem("acquireauto-theme", dark ? "dark" : "light");
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", dark);
  }, [dark, themeInitialized]);
  useEffect(() => {
    if (!seller || !locationReady) return;
    setLoading(true);
    setError("");
    const task =
      section === "Discounts"
        ? sellerApi.discounts().then((d) => setDiscounts(d.discounts || []))
        : section === "Payouts"
          ? sellerApi.payouts().then(setPayouts)
          : section === "Returns"
            ? sellerApi.returns().then((d) => setReturns(d.returns || []))
            : section === "Orders" || section === "Customers"
              ? sellerApi.orders().then((d) => setOrders(d.orders || []))
              : section === "Products" || section === "Inventory"
                ? sellerApi.products(query).then((d) => setProducts(d.products || []))
                : Promise.resolve();
    task.catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [seller, locationReady, section, query]);
  useEffect(() => {
    if (!seller || !locationReady || !["Orders", "Returns"].includes(section)) return undefined;
    let active = true;
    const refreshTracking = async () => {
      try {
        if (section === "Orders") {
          const data = await sellerApi.orders();
          if (active) setOrders(data.orders || []);
        } else {
          const data = await sellerApi.returns();
          if (active) setReturns(data.returns || []);
        }
      } catch (trackingError) {
        if (active) setError(trackingError.message);
      }
    };
    const timer = window.setInterval(refreshTracking, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [seller, locationReady, section]);
  useEffect(() => {
    if (modal === "product") setProductFormError("");
  }, [modal, editing]);
  const refresh = useCallback(async () => {
    await fetchCore();
  }, [fetchCore]);
  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }
  async function run(action, message) {
    try {
      await action();
      await refresh();
      notify(message);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }
  async function logout() {
    await sellerApi.logout().catch(() => {});
    router.replace("/");
    router.refresh();
  }
  async function openNotification(notification) {
    try {
      await sellerApi.readNotification(notification.id);
      setNotifications((current) =>
        current.map((entry) =>
          entry.id === notification.id ? { ...entry, readAt: new Date().toISOString() } : entry,
        ),
      );
      setUnreadNotifications((count) => Math.max(0, count - (notification.readAt ? 0 : 1)));
      setNotificationsOpen(false);
      setPage("Orders");
    } catch (notificationError) {
      setError(notificationError.message);
    }
  }
  function setPage(name) {
    const path = SECTION_PATHS[name];
    if (path) router.push(path);
    setMobileNav(false);
    setError("");
  }
  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          (filter === "All" || p.status === filter) &&
          (filter !== "Low stock" ||
            p.stock <= (p.lowStockThreshold ?? seller?.settings?.lowStockThreshold ?? 5)) &&
          `${p.name} ${p.sku} ${p.fitment}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [products, filter, query, seller],
  );
  const customerMap = useMemo(() => {
    const map = new Map();
    orders.forEach((o) => {
      if (o.email) {
        const row = map.get(o.email) || {
          name: o.customer,
          email: o.email,
          orders: 0,
          spend: 0,
          last: o.placedAt,
          orderHistory: [],
        };
        row.orders += 1;
        row.spend += o.items.reduce((n, i) => n + i.price * i.quantity, 0);
        row.last = o.placedAt;
        row.orderHistory.push(o);
        map.set(o.email, row);
      }
    });
    return [...map.values()].sort((a, b) => b.spend - a.spend);
  }, [orders]);
  const searchedOrders = useMemo(
    () =>
      orders.filter((o) =>
        `${o.code} ${o.customer} ${o.email} ${o.items.map((i) => i.name).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [orders, query],
  );
  async function saveProduct(event) {
    event.preventDefault();
    setFormBusy(true);
    setProductFormError("");
    const f = new FormData(event.currentTarget);
    const variants = Array.from({ length: 50 }, (_, index) => ({
      name: String(f.get(`variantName-${index}`) || "").trim(),
      sku: String(f.get(`variantSku-${index}`) || "").trim(),
      price: Number(f.get(`variantPrice-${index}`)),
      stock: Number(f.get(`variantStock-${index}`)),
    })).filter((variant) => variant.name);
    let fitments = [];
    try { fitments = JSON.parse(String(f.get("fitments") || "[]")); } catch { fitments = []; }
    const values = {
      sku: f.get("sku"),
      partNumber: f.get("partNumber"),
      name: f.get("name"),
      description: f.get("description"),
      category: f.get("category"),
      subcategory: f.get("subcategory"),
      brand: f.get("brand"),
      fitment: f.get("fitment"),
      fitments,
      condition: f.get("condition"),
      warranty: f.get("warranty"),
      price: Number(f.get("price")),
      compareAtPrice: f.get("compareAtPrice") === "" ? null : Number(f.get("compareAtPrice")),
      stock: variants.length
        ? variants.reduce((sum, variant) => sum + variant.stock, 0)
        : Number(f.get("stock")),
      lowStockThreshold: Number(f.get("lowStockThreshold")),
      images: String(f.get("images") || "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      variants,
      status: f.get("status"),
    };
    try {
      if (editing) await sellerApi.updateProduct(editing.id, values);
      else await sellerApi.createProduct(values);
    } catch (e) {
      setProductFormError(e.message);
      setFormBusy(false);
      return;
    }
    setModal("");
    setFormBusy(false);
    notify(editing ? "Product updated" : "Product added");
    try {
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }
  async function saveDiscount(event) {
    event.preventDefault();
    setFormBusy(true);
    const f = new FormData(event.currentTarget);
    try {
      await sellerApi.createDiscount({
        code: f.get("code"),
        type: f.get("type"),
        value: Number(f.get("value")),
        endsAt: f.get("endsAt") || null,
        usageLimit: Number(f.get("usageLimit")) || 0,
      });
      const d = await sellerApi.discounts();
      setDiscounts(d.discounts);
      setModal("");
      notify("Discount created");
    } catch (e) {
      setError(e.message);
    } finally {
      setFormBusy(false);
    }
  }
  async function saveSettings(event) {
    event.preventDefault();
    setFormBusy(true);
    const f = new FormData(event.currentTarget);
    try {
      const { seller: s } = await sellerApi.updateSettings({
        name: f.get("name"),
        storeName: f.get("storeName"),
        address: f.get("address"),
        pickupPostalCode: f.get("pickupPostalCode"),
        currency: f.get("currency"),
        lowStockThreshold: Number(f.get("lowStockThreshold")),
        shippingDays: Number(f.get("shippingDays")),
        shippingFee: Number(f.get("shippingFee")),
        taxRate: Number(f.get("taxRate")),
        returnWindowDays: Number(f.get("returnWindowDays")),
        returnPolicy: f.get("returnPolicy"),
        notifications: {
          orders: f.has("notifyOrders"),
          inventory: f.has("notifyInventory"),
          payouts: f.has("notifyPayouts"),
        },
      });
      setSeller(s);
      await refresh();
      notify("Store settings saved");
    } catch (e) {
      setError(e.message);
    } finally {
      setFormBusy(false);
    }
  }
  if (busy)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f7f5] text-sm text-neutral-500 dark:bg-[#090909]">
        Loading your seller workspace…
      </div>
    );
  if (!seller)
    return (
      <SignIn
        onSuccess={(s) => {
          setSeller(s);
        }}
      />
    );
  if (!location)
    return (
      <LocationAccessGate
        busy={locationStatus === "initializing" || locationBusy}
        error={locationError}
        onEnable={enableLocation}
      />
    );
  const store = seller.storeName || "Your store";
  const currency = seller.settings?.currency || "USD";
  const metrics = dashboard?.metrics || {};
  const sales = dashboard?.sales || [];
  const metricCard = (label, value, icon, foot, positive = false) => (
    <Panel key={label} className="p-4 sm:p-5">
      <div className="flex items-center justify-between text-xs font-semibold text-neutral-500">
        {label}
        <Icon>{icon}</Icon>
      </div>
      <strong className="mt-3 block font-display text-2xl font-extrabold tracking-tight sm:text-[27px]">
        {value}
      </strong>
      <div
        className={cx(
          "mt-2 text-[10px]",
          positive ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-neutral-400",
        )}
      >
        {foot}
      </div>
    </Panel>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-neutral-900 dark:bg-[#090909] dark:text-neutral-100">
      <SellerSidebar
        activeSection={section}
        mobileNav={mobileNav}
        pendingOrders={metrics.pendingOrders || 0}
        onClose={() => setMobileNav(false)}
        onLogout={logout}
      />
      <main className="min-h-screen lg:ml-[248px]">
        <header className="sticky top-0 z-20 flex h-[62px] items-center justify-between border-b border-neutral-200 bg-white/90 px-4 backdrop-blur-xl dark:border-neutral-800 dark:bg-[#0c0c0c]/90 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileNav(true)}
              className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 lg:hidden"
            >
              <Menu size={19} />
            </button>
            <div className="relative hidden w-[min(420px,42vw)] sm:block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                size={15}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search orders, SKUs or products"
                className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-xs outline-none focus:border-orange-300 dark:border-neutral-800 dark:bg-neutral-900"
              />
            </div>
            <span className="truncate text-xs font-bold sm:hidden">{section}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="primary"
              className="min-h-9 px-3"
              onClick={() => {
                setEditing(null);
                setModal("product");
              }}
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Add part</span>
              <span className="sm:hidden">Add</span>
            </Button>
            <button
              aria-label="Toggle theme"
              onClick={() => setDark(!dark)}
              className="grid h-9 w-9 place-items-center rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="relative">
              <button
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative grid h-9 w-9 place-items-center rounded-full border border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300"
              >
                <Bell size={16} />
                {unreadNotifications > 0 && (
                  <i className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[8px] font-bold text-white">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </i>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
                  <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
                    <strong className="text-xs">Notifications</strong>
                  </div>
                  {notifications.length ? (
                    <ul className="max-h-80 overflow-y-auto">
                      {notifications.map((notification) => (
                        <li key={notification.id}>
                          <button
                            onClick={() => openNotification(notification)}
                            className={`w-full border-b border-neutral-100 px-4 py-3 text-left transition hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900 ${
                              notification.readAt ? "opacity-70" : ""
                            }`}
                          >
                            <span className="flex items-start justify-between gap-3">
                              <span className="text-xs font-semibold">{notification.message}</span>
                              {!notification.readAt && (
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
                              )}
                            </span>
                            <span className="mt-1 block text-[10px] text-neutral-500">
                              {notification.itemCount} item
                              {notification.itemCount === 1 ? "" : "s"} ·{" "}
                              {new Intl.NumberFormat(undefined, {
                                style: "currency",
                                currency: notification.currency || "USD",
                              }).format(notification.total)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-6 text-center text-xs text-neutral-500">
                      No order notifications yet.
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setNotificationsOpen(false);
                      refreshNotifications().catch((notificationError) =>
                        setError(notificationError.message),
                      );
                    }}
                    className="w-full px-4 py-2 text-left text-[10px] font-semibold text-brand hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  >
                    Refresh notifications
                  </button>
                </div>
              )}
            </div>
            <span className="hidden h-7 w-px bg-neutral-200 dark:bg-neutral-800 sm:block" />
            <span className="grid h-9 w-9 place-items-center rounded-full bg-orange-50 text-xs font-extrabold text-brand dark:bg-neutral-800">
              {seller.name
                ?.split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span className="hidden max-w-[150px] sm:block">
              <strong className="block truncate text-[10px]">{store}</strong>
              <small className="text-[9px] text-neutral-400">{seller.name}</small>
            </span>
          </div>
        </header>
        <div className="mx-auto max-w-[1450px] space-y-4 px-4 py-6 sm:px-7 sm:py-8">
          {error && (
            <div
              role="alert"
              className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
              <button onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {seller.verificationStatus !== "Approved" && (
            <IdentityVerification
              seller={seller}
              onSubmitted={(verification) =>
                setSeller((current) => ({
                  ...current,
                  country: verification.country,
                  settings: { ...current.settings, currency: verification.currency },
                  verificationStatus: verification.status,
                }))
              }
            />
          )}
          {section === "Dashboard" && (
            <DashboardPage
              {...{
                seller,
                store,
                metrics,
                currency,
                setEditing,
                setModal,
                setPage,
                metricCard,
                sales,
                range,
                setRange,
                payouts,
                searchedOrders,
                dashboard,
                orders,
              }}
            />
          )}
          {section === "Products" && (
            <ProductsPage
              {...{
                products,
                filteredProducts,
                currency,
                filter,
                setFilter,
                query,
                setQuery,
                setEditing,
                setModal,
                onImport: () => setModal("product-import"),
                run,
                sellerApi,
              }}
            />
          )}
          {section === "Inventory" && <InventoryPage {...{ products, currency, run, sellerApi }} />}
          {section === "Orders" && (
            <OrdersPage
              {...{ searchedOrders, currency, location, run, sellerApi, refresh, notify }}
            />
          )}
          {section === "Returns" && <ReturnsPage {...{ returns, run, sellerApi }} />}
          {section === "Payouts" && <PayoutsPage {...{ payouts, currency }} />}
          {section === "Analytics" && (
            <AnalyticsPage {...{ sales, currency, range, setRange, dashboard, metrics }} />
          )}
          {section === "Discounts" && (
            <DiscountsPage {...{ setModal, discounts, run, sellerApi }} />
          )}
          {section === "Customers" && <CustomersPage {...{ customerMap, currency }} />}
          {section === "Store settings" && (
            <StoreSettingsPage {...{ seller, saveSettings, formBusy }} />
          )}
        </div>
        {modal === "product" && (
          <ProductForm
            product={editing}
            busy={formBusy}
            error={productFormError}
            onClose={() => setModal("")}
            onSubmit={saveProduct}
            onUploadImages={async (files) => {
              const uploaded = [];
              for (const file of files) {
                uploaded.push(await sellerApi.uploadProductImage(file));
              }
              return uploaded;
            }}
          />
        )}
        {modal === "product-import" && (
          <ProductImportDialog
            onClose={() => setModal("")}
            onImported={async (count) => {
              setModal("");
              notify(`${count} products imported as drafts`);
              try {
                await refresh();
              } catch (refreshError) {
                setError(refreshError.message);
              }
            }}
          />
        )}
        {modal === "discount" && (
          <DiscountForm busy={formBusy} onClose={() => setModal("")} onSubmit={saveDiscount} />
        )}
        {toast && (
          <div
            role="status"
            className="fixed bottom-5 right-5 z-[90] flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-xs font-semibold text-white shadow-xl"
          >
            <Check size={16} className="text-emerald-400" />
            {toast}
          </div>
        )}
        {loading && (
          <div className="fixed bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-[10px] text-white shadow">
            Refreshing seller data…
          </div>
        )}
      </main>
    </div>
  );
}

export default SellerDashboard;
