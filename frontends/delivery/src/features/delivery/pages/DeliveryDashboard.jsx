"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  LogOut,
  KeyRound,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  ScanLine,
  Truck,
} from "lucide-react";
import DeliveryShell from "@/features/delivery/shared/components/DeliveryShell";
import { getDeliverySections } from "@/features/delivery/shared/components/DeliverySidebar";
import EarningsPanel from "@/features/delivery/components/EarningsPanel";
import { deliveryApi } from "@/features/delivery/lib/deliveryApi";

const NEXT_EVENTS = {
  "Ready for Pickup": ["Picked Up"],
  "Reached Destination Hub": ["Out for Delivery"],
  "Out for Delivery": ["Delivery Attempted", "Delivered"],
  "Delivery Attempted": ["Out for Delivery", "RTO Initiated"],
  "RTO Initiated": ["RTO In Transit"],
  "RTO In Transit": ["RTO Delivered"],
};
const HUB_NEXT_EVENTS = {
  Packed: ["Picked Up"],
  "Picked Up": ["Arrived at Origin Hub"],
  "Arrived at Origin Hub": ["In Transit"],
  "In Transit": ["Arrived at Facility", "Reached Destination Hub"],
  "Arrived at Facility": ["Left Facility"],
  "Left Facility": ["Arrived at Facility", "Reached Destination Hub"],
};
const REVERSE_DRIVER_EVENTS = {
  "Ready for Pickup": ["Picked Up"],
  "Reached Destination Hub": ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
};
const REVERSE_HUB_EVENTS = {
  "Picked Up": ["Arrived at Facility"],
  "Arrived at Facility": ["Left Facility"],
  "Left Facility": ["Arrived at Facility"],
};
const ATTEMPT_REASONS = [
  "Customer unavailable",
  "Address issue",
  "Customer refused",
  "Phone unreachable",
];
const TERMINAL = new Set(["Delivered", "RTO Delivered", "Cancelled"]);
const JOURNEY_STAGES = [
  { status: "Order Placed", source: "System" },
  { status: "Order Confirmed", source: "Payment gateway" },
  { status: "Packed", source: "Seller" },
  { status: "Picked Up", source: "Pickup executive app" },
  { status: "Arrived at Origin Hub", source: "Hub staff or conveyor" },
  { status: "In Transit", source: "Loading scan" },
  { status: "Reached Destination Hub", source: "Hub staff" },
  { status: "Out for Delivery", source: "Delivery agent" },
  { status: "Delivered", source: "Customer OTP" },
  { status: "Payment settled", source: "Platform" },
];

function SignIn({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staffRole, setStaffRole] = useState("delivery_agent");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { agent } = await deliveryApi.login({ email, password, role: staffRole });
      onSuccess(agent);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-7 shadow-lg"
      >
        <div className="mb-6 grid h-12 w-12 place-items-center rounded-xl bg-orange-100 text-brand">
          <Truck />
        </div>
        <p className="text-xs font-extrabold tracking-[.18em] text-neutral-400">
          ACQUIREAUTO
        </p>
        <h1 className="mt-1 text-2xl font-extrabold">Delivery staff sign in</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Delivery partners apply online. Hub in-charges can register a hub and sign in after admin approval.
        </p>
        <label className="mt-5 block text-xs font-bold">
          Workspace
          <select
            value={staffRole}
            onChange={(event) => setStaffRole(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm"
          >
            <option value="delivery_agent">Delivery boy</option>
            <option value="hub_staff">Hub staff</option>
          </select>
        </label>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <label className="mt-5 block text-xs font-bold">
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm"
          />
        </label>
        <label className="mt-3 block text-xs font-bold">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm"
          />
        </label>
        {staffRole === "hub_staff" && (
          <Link
            href="/hub/register"
            className="mt-3 inline-block text-xs font-bold text-orange-700 underline"
          >
            Register a hub
          </Link>
        )}
        <button
          disabled={busy}
          className="mt-5 h-11 w-full rounded-lg bg-brand text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function LocationAccessGate({ checking, busy, error, onEnable, onViewEarnings }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-5">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-lg">
        <MapPin className="mx-auto text-orange-600" size={28} />
        <h1 className="mt-3 text-lg font-extrabold">Location access is required</h1>
        <p className="mt-2 text-sm text-slate-500">
          Keep device location services on and allow location access in your browser to use the
          delivery workspace.
        </p>
        {checking && (
          <p role="status" className="mt-3 text-xs text-slate-500">
            Checking your current location…
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {error}
          </p>
        )}
        {!checking && (
          <button
            type="button"
            disabled={busy}
            onClick={onEnable}
            className="mt-4 h-10 rounded-lg bg-brand px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Checking location…" : "Enable location"}
          </button>
        )}
        <button
          type="button"
          onClick={onViewEarnings}
          className="mt-3 h-10 rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700"
        >
          View earnings without location
        </button>
      </section>
    </main>
  );
}

function ScanDialog({ tasks, onSelect, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [scanValue, setScanValue] = useState("");
  const [error, setError] = useState("");

  const selectToken = useCallback(
    (value) => {
      const task = tasks.find(
        (item) => item.scanToken === String(value || "").trim(),
      );
      if (!task) {
        setError(
          "That barcode does not match an active package assigned to you.",
        );
        return;
      }
      onSelect(task);
    },
    [tasks, onSelect],
  );

  useEffect(() => {
    let active = true;
    async function startCamera() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (!active) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result) selectToken(result.getText());
          },
        );
        if (active) controlsRef.current = controls;
        else controls.stop();
      } catch (cameraError) {
        if (active)
          setError(
            cameraError.message ||
              "Camera is unavailable. Enter the barcode below.",
          );
      }
    }
    startCamera();
    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [selectToken]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-title"
        className="w-full max-w-lg rounded-2xl bg-white p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold tracking-widest text-neutral-400">
              PACKAGE SCAN
            </p>
            <h2 id="scan-title" className="mt-1 text-lg font-extrabold">
              Scan delivery label
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-bold text-neutral-500"
          >
            Close
          </button>
        </div>
        <video
          ref={videoRef}
          muted
          playsInline
          className="mt-4 aspect-video w-full rounded-xl bg-black object-cover"
        />
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            selectToken(scanValue);
          }}
        >
          <input
            autoFocus
            value={scanValue}
            onChange={(event) => setScanValue(event.target.value)}
            placeholder="Or enter scanned package code"
            className="h-11 min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 text-sm"
          />
          <button className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold text-white">
            <ScanLine size={16} /> Select
          </button>
        </form>
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"
          >
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

function formatAddress(address) {
  return [
    address.line,
    address.city,
    address.region,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function TaskCard({ task, scanned, pendingEvent, onSubmitEvent, agent }) {
  const [eventStatus, setEventStatus] = useState("");
  const [attemptReason, setAttemptReason] = useState(ATTEMPT_REASONS[0]);
  const [otp, setOtp] = useState("");
  const [codCollectedAmount, setCodCollectedAmount] = useState(
    task.codAmountDue ? String(task.codAmountDue) : "",
  );
  const [codCollectionMethod, setCodCollectionMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [locationLabel, setLocationLabel] = useState(
    agent.district || agent.state || "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isHubStaff = agent.staffRole === "hub_staff";
  const isPickupTask = task.taskType === "pickup";
  const options = [
    ...(task.taskType === "reverse"
      ? (isHubStaff ? REVERSE_HUB_EVENTS : REVERSE_DRIVER_EVENTS)[task.trackingStatus] || []
      : (isHubStaff ? HUB_NEXT_EVENTS : NEXT_EVENTS)[task.trackingStatus] || []),
  ];
  if (
    task.taskType === "reverse" &&
    isHubStaff &&
    task.returnType === "Return" &&
    task.trackingStatus === "Left Facility"
  ) {
    options.push("At Seller");
  } else if (
    task.taskType === "reverse" &&
    isHubStaff &&
    task.returnType === "Replacement" &&
    task.trackingStatus === "Left Facility"
  ) {
    options.push("Reached Destination Hub");
  }

  async function getLocation() {
    if (!navigator.geolocation)
      throw new Error("This device does not support GPS location.");
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          resolve({ latitude: coords.latitude, longitude: coords.longitude }),
        () =>
          reject(
            new Error(
              "Location permission was denied. Allow location access in your browser and turn on device location services.",
            ),
          ),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    });
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const location = await getLocation();
      await onSubmitEvent(task, {
        status: eventStatus,
        scanToken: task.scanToken,
        ...(eventStatus === "Delivery Attempted" ? { attemptReason } : {}),
        ...(eventStatus === "Delivered" ? { otp } : {}),
        ...(eventStatus === "Delivered" &&
        task.paymentMethod === "Cash on delivery"
          ? {
              codCollectedAmount: Number(codCollectedAmount),
              codCollectionMethod,
            }
          : {}),
        note,
        ...(location
          ? {
              location: {
                ...location,
                label: isHubStaff
                  ? locationLabel.trim()
                  : agent.district || agent.state || "GPS location",
              },
            }
          : {}),
      });
      setNotice(
        eventStatus === "Out for Delivery"
          ? task.taskType === "reverse"
            ? "Replacement delivery OTP issued. The customer can view it in Returns."
            : "Customer delivery OTP issued. The customer can view it in order details."
          : "Package tracking updated.",
      );
      setOtp("");
      setNote("");
      setEventStatus("");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm ${scanned ? "border-brand ring-2 ring-orange-100" : "border-neutral-200"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold tracking-widest text-neutral-400">
            {isPickupTask
              ? "NEW SELLER PICKUP"
              : task.taskType === "reverse"
                ? task.returnType
                : task.carrier || "COURIER"}{" "}
            · {isPickupTask || task.taskType === "reverse" ? "Order" : "AWB"}{" "}
            {task.orderCode || task.tracking}
          </p>
          <h2 className="mt-1 text-lg font-extrabold">
            {isPickupTask
              ? "Seller pickup"
              : task.taskType === "reverse"
                ? task.returnType
                : "Order"}{" "}
            #{task.orderCode}
          </h2>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
            <PackageCheck size={14} /> {task.trackingStatus}
          </p>
        </div>
        {scanned ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 size={14} /> Barcode scanned
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-500">
            <ScanLine size={14} /> Scan to update
          </span>
        )}
      </div>

      {isPickupTask && (
        <p role="status" className="mt-3 rounded-lg bg-orange-50 p-3 text-xs font-semibold text-orange-900">
          {task.pickup.storeName} has packed this order. Go to the seller address and scan the package to confirm pickup.
        </p>
      )}
      <div className="mt-4 grid gap-4 border-t border-neutral-100 pt-4 sm:grid-cols-2">
        {isPickupTask ? (
          <div>
            <p className="text-xs font-bold">{task.pickup.storeName}</p>
            <p className="mt-1 flex items-start gap-1.5 text-xs text-neutral-500">
              <MapPin size={14} className="mt-0.5 shrink-0" />{" "}
              {[task.pickup.address, task.pickup.postalCode].filter(Boolean).join(", ")}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-brand">
              {task.pickup.phone && <a href={`tel:${task.pickup.phone}`}>Call seller</a>}
              {task.pickup.email && <a href={`mailto:${task.pickup.email}`}>Email seller</a>}
            </div>
          </div>
        ) : (
          <div>
          <p className="text-xs font-bold">{task.customer.name}</p>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-neutral-500">
            <MapPin size={14} className="mt-0.5 shrink-0" />{" "}
            {formatAddress(task.address)}
          </p>
          {task.customer.phone && (
            <a
              href={`tel:${task.customer.phone}`}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand"
            >
              <Phone size={13} /> {task.customer.phone}
            </a>
          )}
          </div>
        )}
        <div className="text-xs text-neutral-500">
          {task.packageWeightGrams != null && (
            <p>
              Package weight:{" "}
              <b className="text-neutral-800">{task.packageWeightGrams} g</b>
            </p>
          )}
          {!isPickupTask && <p>
            Payment: <b className="text-neutral-800">{task.paymentMethod}</b>
          </p>}
          {!isPickupTask && task.paymentMethod === "Cash on delivery" && (
            <p className="mt-1">
              COD due:{" "}
              <b className="text-neutral-800">
                {task.codAmountDue.toFixed(2)} {task.currency}
              </b>
            </p>
          )}
          {!isPickupTask && <p className="mt-1">Attempts: {task.deliveryAttempts} / 3</p>}
        </div>
      </div>

      {pendingEvent && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"
        >
          {pendingEvent.status} is saved on this device and will sync when your
          connection returns.
        </p>
      )}
      {scanned && options.length > 0 && !pendingEvent && (
        <form
          onSubmit={submit}
          className="mt-4 space-y-3 rounded-xl bg-neutral-50 p-4"
        >
          <label className="block text-xs font-bold">
            Tracking update
            <select
              required
              value={eventStatus}
              onChange={(event) => setEventStatus(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm"
            >
              <option value="">Select next step</option>
              {options.map((status) => (
                <option
                  key={status}
                  value={status}
                  disabled={
                    status === "RTO Initiated" && task.deliveryAttempts < 3
                  }
                >
                  {status}
                  {status === "RTO Initiated" && task.deliveryAttempts < 3
                    ? " (after 3 failed attempts)"
                    : ""}
                </option>
              ))}
            </select>
          </label>
          {eventStatus === "Delivery Attempted" && (
            <label className="block text-xs font-bold">
              Attempt reason
              <select
                value={attemptReason}
                onChange={(event) => setAttemptReason(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm"
              >
                {ATTEMPT_REASONS.map((reason) => (
                  <option key={reason}>{reason}</option>
                ))}
              </select>
            </label>
          )}
          {eventStatus === "Delivered" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold">
                Customer OTP
                <input
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 font-mono text-lg tracking-widest"
                />
              </label>
              {task.paymentMethod === "Cash on delivery" && (
                <>
                  <label className="text-xs font-bold">
                    COD received ({task.currency})
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={codCollectedAmount}
                      onChange={(event) =>
                        setCodCollectedAmount(event.target.value)
                      }
                      className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3"
                    />
                  </label>
                  <label className="text-xs font-bold">
                    Collected by
                    <select
                      value={codCollectionMethod}
                      onChange={(event) =>
                        setCodCollectionMethod(event.target.value)
                      }
                      className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3"
                    >
                      <option>Cash</option>
                      <option>UPI</option>
                    </select>
                  </label>
                </>
              )}
            </div>
          )}
          <label className="block text-xs font-bold">
            {isHubStaff ? "Hub / facility name" : "Note (optional)"}
            <input
              maxLength={300}
              required={isHubStaff}
              value={isHubStaff ? locationLabel : note}
              onChange={(event) =>
                isHubStaff
                  ? setLocationLabel(event.target.value)
                  : setNote(event.target.value)
              }
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm"
            />
          </label>
          <p className="text-xs text-neutral-500">
            GPS is required and captured automatically for every update.
          </p>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-xs text-red-700"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700"
            >
              {notice}
            </p>
          )}
          <button
            disabled={busy || !eventStatus}
            className="h-10 w-full rounded-lg bg-brand text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Saving update…" : "Save tracking update"}
          </button>
        </form>
      )}
      {!scanned && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          Scan the package QR label before recording a delivery event.
        </p>
      )}
      {TERMINAL.has(task.trackingStatus) && (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
          This package is complete.
        </p>
      )}

      {task.events?.length > 0 && (
        <details className="mt-4 border-t border-neutral-100 pt-3">
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold text-neutral-600">
            <Clock3 size={14} /> Shipment timeline <ChevronDown size={14} />
          </summary>
          <ol className="mt-3 space-y-2 border-l-2 border-orange-100 pl-4">
            {task.events
              .slice()
              .reverse()
              .map((item, index) => (
                <li key={`${item.status}-${index}`} className="text-xs">
                  <b>{item.status}</b>
                  <span className="ml-2 text-neutral-400">
                    {new Date(item.occurredAt).toLocaleString()}
                  </span>
                  {item.attemptReason && (
                    <span className="block text-neutral-500">
                      {item.attemptReason}
                    </span>
                  )}
                  {item.location?.latitude != null &&
                    item.location?.longitude != null && (
                      <a
                        href={`https://www.google.com/maps?q=${item.location.latitude},${item.location.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-neutral-500 underline"
                      >
                        {item.location.label || "View scan location"}
                      </a>
                    )}
                </li>
              ))}
          </ol>
        </details>
      )}
    </article>
  );
}

export default function DeliveryDashboard() {
  const [agent, setAgent] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("initializing");
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [tasks, setTasks] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [scannedTaskId, setScannedTaskId] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [networkOn, setNetworkOn] = useState(true);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const syncingRef = useRef(false);
  const locationWatchRef = useRef(null);
  const locationReady = Boolean(location);

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
          localStorage.setItem("acquireauto-delivery-location-granted", "true");
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
            localStorage.removeItem("acquireauto-delivery-location-granted");
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
        localStorage.getItem("acquireauto-delivery-location-granted") === "true";
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

  const refresh = useCallback(async (staffRole = agent?.staffRole) => {
    const data =
      staffRole === "hub_staff"
        ? await deliveryApi.hubTasks()
        : await deliveryApi.tasks();
    setTasks(data.tasks || []);
    setScannedTaskId("");
  }, [agent?.staffRole]);

  const syncPendingEvents = useCallback(async () => {
    if (
      !agent ||
      !locationReady ||
      agent.staffRole === "hub_staff" ||
      !navigator.onLine ||
      syncingRef.current
    ) return;
    syncingRef.current = true;
    try {
      const queuedEvents = deliveryApi.getPendingEvents(agent.id);
      for (const queuedEvent of queuedEvents) {
        if (queuedEvent.taskType === "reverse") {
          await deliveryApi.addReverseEvent(queuedEvent.orderId, queuedEvent);
        } else {
          await deliveryApi.addEvent(queuedEvent.orderId, queuedEvent);
        }
        const remaining = deliveryApi
          .getPendingEvents(agent.id)
          .filter((item) => item.clientEventId !== queuedEvent.clientEventId);
        deliveryApi.savePendingEvents(agent.id, remaining);
        setPendingEvents(remaining);
      }
      if (queuedEvents.length) {
        await refresh();
        setNotice("Saved delivery scans synced successfully.");
        setError("");
      }
    } finally {
      syncingRef.current = false;
    }
  }, [agent, locationReady, refresh]);

  useEffect(() => {
    let active = true;
    deliveryApi
      .me()
      .then(({ agent: value }) => {
        if (!active) return;
        setAgent(value);
      })
      .catch((loadError) => {
        if (active && loadError.status !== 401) setError(loadError.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!agent || !locationReady) return undefined;
    let active = true;
    refresh(agent.staffRole).catch((loadError) => {
      if (active) setError(loadError.message);
    });
    return () => {
      active = false;
    };
  }, [agent, locationReady, refresh]);

  useEffect(() => {
    if (!locationReady) return undefined;
    function updateNetwork() {
      setNetworkOn(navigator.onLine);
      if (navigator.onLine) {
        syncPendingEvents().catch((syncError) => setError(syncError.message));
      }
    }
    updateNetwork();
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    return () => {
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, [syncPendingEvents, locationReady]);

  useEffect(() => {
    if (!agent || !locationReady) return;
    try {
      const queuedEvents = deliveryApi.getPendingEvents(agent.id);
      setPendingEvents(queuedEvents);
      if (queuedEvents.length && navigator.onLine) {
        syncPendingEvents().catch((syncError) => setError(syncError.message));
      }
    } catch (queueError) {
      setError(queueError.message);
    }
  }, [agent, locationReady, syncPendingEvents]);

  function queueOfflineEvent(task, event) {
    if (agent.staffRole === "hub_staff") {
      throw new Error("Connect to the internet before recording a hub scan.");
    }
    if (event.status === "Delivered") {
      throw new Error(
        "Connect to the internet to verify the customer OTP and confirm delivery.",
      );
    }
    const queuedEvents = deliveryApi.getPendingEvents(agent.id);
    const taskKey = `${task.orderId}:${task.sellerId}`;
    if (queuedEvents.some((item) => item.taskKey === taskKey)) {
      throw new Error(
        "This package already has a scan waiting to sync. Reconnect before recording another scan.",
      );
    }
    const nextEvents = [
      ...queuedEvents,
      {
        ...event,
        orderId: task.orderId,
        taskType: task.taskType || "order",
        taskKey,
        queuedAt: new Date().toISOString(),
      },
    ];
    deliveryApi.savePendingEvents(agent.id, nextEvents);
    setPendingEvents(nextEvents);
    setError("");
    setNotice(`${event.status} saved on this device. It will sync when online.`);
  }

  async function onSubmitEvent(task, body) {
    if (!locationReady) {
      throw new Error("Enable location access before recording a delivery update.");
    }
    const event = {
      ...body,
      clientEventId: deliveryApi.createEventId(),
    };
    if (!navigator.onLine) {
      queueOfflineEvent(task, event);
      return;
    }
    try {
      if (agent.staffRole === "hub_staff" && task.taskType === "reverse") {
        await deliveryApi.addHubReverseEvent(task.orderId, event);
      } else if (agent.staffRole === "hub_staff") {
        await deliveryApi.addHubEvent(task.orderId, event);
      } else if (task.taskType === "reverse") {
        await deliveryApi.addReverseEvent(task.orderId, event);
      } else {
        await deliveryApi.addEvent(task.orderId, event);
      }
    } catch (eventError) {
      if (eventError.status) throw eventError;
      queueOfflineEvent(task, event);
      return;
    }
    await refresh(agent.staffRole);
    setError("");
    setNotice(
      body.status === "Out for Delivery"
        ? task.taskType === "reverse"
          ? `Replacement ${task.orderCode} is out for delivery. Customer OTP is available in Returns.`
          : `Order ${task.orderCode} is out for delivery. Customer OTP is available in order details.`
        : `${task.taskType === "reverse" ? "Request" : "Order"} ${task.orderCode}: ${body.status} recorded.`,
    );
  }

  async function logout() {
    setError("");
    try {
      await deliveryApi.logout();
      setAgent(null);
      setTasks([]);
    } catch (logoutError) {
      setError(logoutError.message);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setError("");
    setPasswordNotice("");
    try {
      const { agent: updated } = await deliveryApi.changePassword({
        currentPassword,
        newPassword,
      });
      setAgent(updated);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordOpen(false);
      setPasswordNotice("Password updated successfully.");
    } catch (passwordError) {
      setError(passwordError.message);
    }
  }

  async function toggleAvailability() {
    setAvailabilityBusy(true);
    setError("");
    try {
      const { agent: updated } = await deliveryApi.setAvailability(
        !agent.isOnline,
      );
      setAgent(updated);
    } catch (availabilityError) {
      setError(availabilityError.message);
    } finally {
      setAvailabilityBusy(false);
    }
  }

  if (busy) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-neutral-500">
        Loading delivery workspace…
      </main>
    );
  }
  if (!agent)
    return (
      <SignIn
        onSuccess={(value) => {
          setAgent(value);
        }}
      />
    );
  if (!locationReady && !["Earnings", "Profile"].includes(activeSection)) {
    return (
      <LocationAccessGate
        checking={locationStatus === "initializing" || locationBusy}
        busy={locationBusy}
        error={locationError}
        onEnable={enableLocation}
        onViewEarnings={() => setActiveSection("Earnings")}
      />
    );
  }

  const activeTasks = tasks.filter(
    (task) => !TERMINAL.has(task.trackingStatus),
  );
  const displayedTasks =
    activeSection === "New orders"
      ? activeTasks.filter(
          (task) =>
            task.taskType === "pickup" ||
            task.trackingStatus === "Ready for Pickup",
        )
      : activeSection === "My deliveries"
        ? activeTasks.filter((task) => task.trackingStatus !== "Ready for Pickup")
        : activeTasks;
  const journeyTask =
    activeTasks.find(
      (task) => `${task.orderId}:${task.sellerId}` === scannedTaskId,
    ) || activeTasks[0] || tasks[0];
  const deliveredCount = tasks.filter(
    (task) => task.trackingStatus === "Delivered",
  ).length;
  const codToCollect = activeTasks
    .filter((task) => task.paymentMethod === "Cash on delivery")
    .reduce((total, task) => total + Number(task.codAmountDue || 0), 0);

  const selectSection = (section) => {
    setActiveSection(section);
    if (section === "Profile") setPasswordOpen(true);
  };

  return (
    <DeliveryShell
      agent={agent}
      activeSection={activeSection}
      onSelectSection={selectSection}
      onLogout={logout}
    >
      <main className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-100 text-orange-700">
                <Truck size={18} />
              </span>
              <div>
                <p className="text-[9px] font-extrabold tracking-widest text-slate-400">
                  ACQUIREAUTO
                </p>
                <h1 className="text-sm font-extrabold">Delivery workspace</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {agent.staffRole === "delivery_agent" && <button
                role="switch"
                aria-checked={Boolean(agent.isOnline)}
                disabled={availabilityBusy}
                onClick={toggleAvailability}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold disabled:opacity-50 ${
                  agent.isOnline
                    ? "border-emerald-200 bg-white text-slate-700"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    agent.isOnline ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
                {agent.isOnline ? "Online" : "Offline"}
              </button>}
              <span
                aria-live="polite"
                aria-label={networkOn ? "Network on" : "Network offline"}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1.5 text-[10px] font-semibold sm:px-3 ${
                  networkOn
                    ? "border-slate-200 bg-white text-slate-600"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
                title={networkOn ? "Network on" : "Network offline"}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    networkOn ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <span className="hidden sm:inline">
                  {networkOn ? "Network on" : "Offline"}
                </span>
              </span>
              {pendingEvents.length > 0 && (
                <button
                  onClick={() =>
                    syncPendingEvents().catch((syncError) =>
                      setError(syncError.message),
                    )
                  }
                  disabled={!networkOn}
                  aria-label="Sync saved scans"
                  className="inline-flex items-center gap-1 rounded-lg border border-orange-200 px-2.5 py-2 text-[10px] font-bold text-orange-700 disabled:opacity-50"
                >
                  <RefreshCw size={12} />
                  <span className="hidden sm:inline">Sync scans</span>
                </button>
              )}
              <span className="hidden text-xs font-semibold text-slate-500 md:block">
                {agent.name}
              </span>
              <button
                onClick={() => setPasswordOpen((open) => !open)}
                className="hidden rounded-lg border border-slate-200 p-2 text-slate-600 sm:inline-flex"
                aria-label="Change password"
              >
                <KeyRound size={15} />
              </button>
              <button
                onClick={() =>
                  refresh().catch((loadError) => setError(loadError.message))
                }
                className="hidden rounded-lg border border-slate-200 p-2 text-slate-600 sm:inline-flex"
                aria-label="Refresh tasks"
              >
                <RefreshCw size={15} />
              </button>
              <button
                onClick={logout}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-[10px] font-bold sm:px-3"
              >
                <LogOut size={13} /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden">
            {getDeliverySections(agent.staffRole).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => selectSection(key)}
                className={`shrink-0 rounded-md px-3 py-1.5 text-[10px] font-semibold ${
                  activeSection === key
                    ? "bg-orange-50 text-orange-700"
                    : "text-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6">
          <section className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold tracking-widest text-slate-400">
                {activeSection === "Dashboard" ? "TODAY’S ROUTE" : "YOUR WORKSPACE"}
              </p>
              <h2 className="mt-1 text-2xl font-extrabold">
                {activeSection === "Dashboard"
                  ? `Hello, ${agent.name.split(" ")[0]}`
                  : activeSection}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {activeSection === "Earnings"
                  ? "Payouts from customer-verified deliveries"
                  : `${activeTasks.length} active package${activeTasks.length === 1 ? "" : "s"} assigned to you`}
              </p>
            </div>
            {activeSection !== "Earnings" && (
              <button
                onClick={() => setScanOpen(true)}
                disabled={!activeTasks.length}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-orange-600 px-4 text-xs font-bold text-white disabled:opacity-50"
              >
                <Camera size={15} /> Scan package
              </button>
            )}
          </section>

          {error && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700"
            >
              <AlertCircle size={15} /> {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700"
            >
              <CheckCircle2 size={15} /> {notice}
            </p>
          )}
          {passwordNotice && (
            <p
              role="status"
              className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700"
            >
              {passwordNotice}
            </p>
          )}
          {passwordOpen && (
            <form
              onSubmit={changePassword}
              className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]"
            >
              <label className="text-xs font-bold">
                Current password
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="text-xs font-bold">
                New password (10+ characters)
                <input
                  required
                  type="password"
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </label>
              <button className="h-10 self-end rounded-lg bg-slate-900 px-4 text-xs font-bold text-white">
                Update password
              </button>
            </form>
          )}

          {activeSection === "Dashboard" && (
            <>
              <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {[
                  ["Out for delivery", activeTasks.filter((task) => task.trackingStatus === "Out for Delivery").length],
                  ["Delivered", deliveredCount],
                  [
                    "COD to collect",
                    new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: activeTasks.find((task) => task.currency)?.currency || "INR",
                      maximumFractionDigits: 0,
                    }).format(codToCollect),
                  ],
                  ["Scans waiting to sync", pendingEvents.length],
                ].map(([label, value]) => (
                  <article
                    key={label}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <p className="text-[10px] text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-extrabold">{value}</p>
                  </article>
                ))}
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold">Parcel journey</h3>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {journeyTask
                        ? `Order ${journeyTask.orderCode} · ${journeyTask.trackingStatus}`
                        : "Each scan moves the parcel to its next tracking milestone."}
                    </p>
                  </div>
                  {journeyTask && (
                    <span className="text-[10px] font-semibold text-orange-700">
                      AWB {journeyTask.tracking}
                    </span>
                  )}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5 md:grid-cols-10">
                  {JOURNEY_STAGES.map((stage, index) => {
                    const journeyStatus =
                      journeyTask?.trackingStatus === "Ready for Pickup"
                        ? "Packed"
                        : journeyTask?.trackingStatus;
                    const currentIndex = journeyTask
                      ? JOURNEY_STAGES.findIndex(
                          (item) => item.status === journeyStatus,
                        )
                      : -1;
                    const complete = index <= currentIndex;
                    return (
                      <div key={stage.status} className="relative min-w-0">
                        <span
                          className={`mb-2 block h-2.5 w-2.5 rounded-full ${
                            complete ? "bg-orange-600" : "bg-slate-200"
                          }`}
                        />
                        <p className="text-[9px] font-bold leading-3">
                          {stage.status}
                        </p>
                        <p className="mt-0.5 text-[8px] leading-3 text-slate-500">
                          {stage.source}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="grid gap-4 md:grid-cols-[1.1fr_.9fr]">
                <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                  <div>
                    <h3 className="text-sm font-extrabold">
                      {agent.staffRole === "hub_staff" ? "Pickup inbox and hub tasks" : "Scan and act"}
                    </h3>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {agent.staffRole === "hub_staff"
                        ? "New Packed seller orders appear here. Scan a package when it is collected."
                        : "Scan a parcel label to record its next verified status."}
                    </p>
                  </div>
                  {activeTasks.map((task) => {
                    const taskKey = `${task.orderId}:${task.sellerId}`;
                    return (
                      <TaskCard
                        key={taskKey}
                        task={task}
                        agent={agent}
                        scanned={scannedTaskId === taskKey}
                        pendingEvent={pendingEvents.find(
                          (item) => item.taskKey === taskKey,
                        )}
                        onSubmitEvent={onSubmitEvent}
                      />
                    );
                  })}
                  {!activeTasks.length && (
                    <div className="rounded-lg border border-dashed border-slate-300 p-7 text-center">
                      <PackageCheck
                        className="mx-auto text-slate-300"
                        size={28}
                      />
                      <p className="mt-2 text-sm font-bold">
                        No active packages assigned
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        New delivery tasks appear here after dispatch assigns them.
                      </p>
                    </div>
                  )}
                </section>

                <div className="space-y-4">
                  <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-extrabold">Who sees what</h3>
                    <div className="mt-3 divide-y divide-slate-100 text-[10px]">
                      {[
                        ["Seller dashboard", "Shipment status"],
                        ["Platform app", "Tracking milestones"],
                        ["Customer order tracking page", "Delivery updates"],
                      ].map(([audience, update]) => (
                        <div
                          key={audience}
                          className="flex items-center justify-between gap-2 py-2 first:pt-0"
                        >
                          <span>{audience}</span>
                          <span className="text-right font-semibold">
                            {journeyTask?.trackingStatus || update}
                            <span className="ml-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] text-emerald-700">
                              Live
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                    <h3 className="mt-4 border-t border-slate-100 pt-3 text-sm font-extrabold">
                      Scan log
                    </h3>
                    {journeyTask?.events?.length ? (
                      <ol className="mt-3 space-y-2 border-l-2 border-orange-200 pl-3">
                        {journeyTask.events
                          .slice()
                          .reverse()
                          .slice(0, 5)
                          .map((item, index) => (
                            <li
                              key={`${item.status}-${index}`}
                              className="text-[10px]"
                            >
                              <b>
                                {new Date(item.occurredAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}{" "}
                                {item.status}
                              </b>
                              <span className="block text-[9px] text-slate-500">
                                {item.source?.replaceAll("_", " ") || "System"}
                              </span>
                            </li>
                          ))}
                      </ol>
                    ) : (
                      <p className="mt-2 text-[10px] text-slate-500">
                        New scans will appear here.
                      </p>
                    )}
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-extrabold">
                      If something goes wrong
                    </h3>
                    <div className="mt-3 divide-y divide-slate-100 text-[10px]">
                      {[
                        [
                          "Customer unavailable",
                          "Choose a reason and record the attempt.",
                        ],
                        [
                          "Three failed attempts",
                          "Return-to-origin is enabled after the attempt limit.",
                        ],
                        [
                          "No network",
                          "A scan is saved on this device and syncs when online.",
                        ],
                        [
                          "COD order",
                          "Collect the exact amount and record cash or UPI.",
                        ],
                      ].map(([caseName, action]) => (
                        <div
                          key={caseName}
                          className="grid gap-1 py-2 sm:grid-cols-[.8fr_1.2fr]"
                        >
                          <b>{caseName}</b>
                          <span className="text-slate-600">{action}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}

          {activeSection === "Earnings" && (
            <EarningsPanel staffRole={agent.staffRole} />
          )}

          {activeSection !== "Dashboard" &&
            activeSection !== "Profile" &&
            activeSection !== "Earnings" && (
            <section className="space-y-3">
              {displayedTasks.map((task) => {
                const taskKey = `${task.orderId}:${task.sellerId}`;
                return (
                  <TaskCard
                    key={taskKey}
                    task={task}
                    agent={agent}
                    scanned={scannedTaskId === taskKey}
                    pendingEvent={pendingEvents.find(
                      (item) => item.taskKey === taskKey,
                    )}
                    onSubmitEvent={onSubmitEvent}
                  />
                );
              })}
              {!displayedTasks.length && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
                  No packages in this section right now.
                </div>
              )}
            </section>
          )}
        </div>
      </main>
      {scanOpen && (
        <ScanDialog
          tasks={activeTasks}
          onClose={() => setScanOpen(false)}
          onSelect={(task) => {
            setScannedTaskId(`${task.orderId}:${task.sellerId}`);
            setScanOpen(false);
          }}
        />
      )}
    </DeliveryShell>
  );
}
