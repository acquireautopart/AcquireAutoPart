"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import AdminPageLayout from "@/features/admin/shared/components/AdminPageLayout";
import {
  Button,
  Empty,
  PageHeading,
  Panel,
  PanelTitle,
  Status,
} from "@/features/admin/shared/components/ui";
import { adminApi } from "@/features/admin/lib/adminApi";

async function loadLocations(country, state) {
  const query = new URLSearchParams({ country });
  if (state) query.set("state", state);
  const response = await fetch(`/api/locations?${query}`, { cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(data?.locations)) {
    throw new Error(data?.message || "Could not load this location list.");
  }
  return data.locations;
}

function toLocalDateTimeInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function ShipmentLabel({ shipment, onClose }) {
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(shipment.scanToken, { margin: 1, width: 220 })
      .then((value) => {
        if (active) setQr(value);
      })
      .catch((qrError) => {
        if (active) setError(qrError.message || "Could not create the package QR label.");
      });
    return () => {
      active = false;
    };
  }, [shipment.scanToken]);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4">
      <section className="w-full max-w-sm rounded-2xl bg-white p-5 text-neutral-900 shadow-xl">
        <div id="delivery-label" className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            AcquireAuto · Delivery
          </p>
          <h2 className="mt-2 text-xl font-black">Order {shipment.orderCode}</h2>
          <p className="mt-1 text-sm">
            {shipment.carrier} · AWB {shipment.tracking}
          </p>
          {qr ? (
            <img
              src={qr}
              alt={`Package QR for ${shipment.orderCode}`}
              className="mx-auto mt-4 h-56 w-56"
            />
          ) : error ? (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {error}
            </p>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">Creating package QR…</p>
          )}
          <p className="mt-2 text-xs text-neutral-500">
            Scan this code to update shipment tracking.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2 print:hidden">
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" disabled={!qr} onClick={() => window.print()}>
            Print label
          </Button>
        </div>
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #delivery-label,
            #delivery-label * {
              visibility: visible !important;
            }
            #delivery-label {
              position: fixed;
              inset: 20mm 0 auto;
              margin: auto;
              width: 80mm;
              color: #111 !important;
            }
          }
        `}</style>
      </section>
    </div>
  );
}

function HubDetailsDialog({ details, loading, error, onClose }) {
  if (!loading && !error && !details) return null;
  const hub = details?.hub;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/60 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="hub-details-title"
        className="my-8 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 text-neutral-900 shadow-xl dark:bg-neutral-900 dark:text-white"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-neutral-400">
              CONFIDENTIAL HUB RECORD
            </p>
            <h2 id="hub-details-title" className="mt-1 text-lg font-extrabold">
              {hub?.name || "Hub details"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-bold text-neutral-500"
          >
            Close
          </button>
        </div>
        {loading ? (
          <p role="status" className="mt-5 text-sm text-neutral-500">
            Loading hub details…
          </p>
        ) : error ? (
          <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : hub ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
              <h3 className="text-sm font-bold">Hub and contact</h3>
              <dl className="mt-3 grid gap-2 text-xs">
                {[
                  ["Hub code", hub.code],
                  ["Name", hub.name],
                  ["Type", hub.hubType],
                  ["Address", hub.address],
                  ["City", hub.city],
                  ["District", hub.district],
                  ["State", hub.state],
                  ["Country", hub.country],
                  ["Hub postal code", hub.postalCode],
                  ["Pickup PIN codes", (hub.pickupPincodes || []).join(", ")],
                  ["Delivery PIN codes", (hub.servedPincodes || []).join(", ")],
                  ["In-charge", hub.inCharge?.name],
                  ["Phone", hub.inCharge?.phone],
                  ["Email", hub.inCharge?.email],
                  ["Application status", hub.applicationStatus],
                  ["Active", hub.isActive ? "Yes" : "No"],
                  ["Created", hub.createdAt ? new Date(hub.createdAt).toLocaleString() : ""],
                  ["Updated", hub.updatedAt ? new Date(hub.updatedAt).toLocaleString() : ""],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[7rem_1fr] gap-2">
                    <dt className="font-semibold text-neutral-500">{label}</dt>
                    <dd className="break-words">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
              <h3 className="text-sm font-bold">Hub staff and documents</h3>
              <div className="mt-3 space-y-4">
                {(details.staff || []).map((staff) => (
                  <article key={staff.id} className="rounded-lg bg-neutral-50 p-3 text-xs dark:bg-neutral-800">
                    <p className="font-bold">{staff.name}</p>
                    <p className="mt-1 break-words">{staff.email || "No email"} · {staff.phone || "No phone"}</p>
                    <p className="mt-1 text-neutral-500">
                      {[staff.address, staff.district, staff.state, staff.postalCode, staff.country]
                        .filter(Boolean)
                        .join(", ") || "No staff address recorded"}
                    </p>
                    <p className="mt-1 text-neutral-500">
                      {staff.applicationStatus || "—"} · {staff.isActive ? "Active" : "Inactive"} · {staff.isOnline ? "Online" : "Offline"}
                    </p>
                    <p className="mt-1 text-neutral-500">
                      Applied: {staff.applicationSubmittedAt ? new Date(staff.applicationSubmittedAt).toLocaleString() : "—"} · Reviewed: {staff.reviewedAt ? new Date(staff.reviewedAt).toLocaleString() : "—"}
                    </p>
                    <p className="mt-1 text-neutral-500">
                      Interview: {staff.interviewAt ? new Date(staff.interviewAt).toLocaleString() : "—"}
                      {staff.interviewNote ? ` · ${staff.interviewNote}` : ""}
                    </p>
                    {staff.reviewedBy && (
                      <p className="mt-1 text-neutral-500">Reviewed by: {staff.reviewedBy}</p>
                    )}
                    {staff.reviewNote && (
                      <p className="mt-1 text-neutral-500">Review note: {staff.reviewNote}</p>
                    )}
                    <p className="mt-1">
                      {staff.documentType || "No identity document on file"}
                      {staff.documentNumber ? ` · ${staff.documentNumber}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 font-bold text-orange-700">
                      {staff.photoUrl && (
                        <a href={staff.photoUrl} target="_blank" rel="noreferrer">
                          Open staff photo
                        </a>
                      )}
                      {staff.documentUrl && (
                        <a href={staff.documentUrl} target="_blank" rel="noreferrer">
                          Open identity document
                        </a>
                      )}
                    </div>
                  </article>
                ))}
                {!details.staff?.length && (
                  <p className="text-xs text-neutral-500">No staff accounts are linked to this hub.</p>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default function DeliveryPage() {
  const [agents, setAgents] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [locationFilters, setLocationFilters] = useState({
    country: "",
    state: "",
    district: "",
    status: "",
  });
  const [draftFilters, setDraftFilters] = useState(locationFilters);
  const [review, setReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    status: "Pending",
    interviewAt: "",
    interviewNote: "",
    reviewNote: "",
  });
  const [assignments, setAssignments] = useState({});
  const [hubStaffForm, setHubStaffForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    hubId: "",
  });
  const [label, setLabel] = useState(null);
  const [hubDetails, setHubDetails] = useState(null);
  const [hubDetailsLoading, setHubDetailsLoading] = useState(false);
  const [hubDetailsError, setHubDetailsError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [agentData, shipmentData, hubData] = await Promise.all([
      adminApi.deliveryAgents(locationFilters),
      adminApi.deliveryShipments(),
      adminApi.deliveryHubs(),
    ]);
    setAgents(agentData.agents || []);
    setShipments(shipmentData.shipments || []);
    setHubs(hubData.hubs || []);
  }, [locationFilters]);

  useEffect(() => {
    refresh().catch((loadError) => setError(loadError.message));
  }, [refresh]);

  useEffect(() => {
    let active = true;
    adminApi
      .deliveryCountries()
      .then((result) => active && setCountries(result))
      .catch((loadError) => active && setError(loadError.message));
    return () => {
      active = false;
    };
  }, []);

  const selectedCountry = countries.find((country) => country.code === draftFilters.country);

  useEffect(() => {
    if (!selectedCountry) {
      setStates([]);
      return undefined;
    }
    let active = true;
    loadLocations(selectedCountry.name)
      .then((result) => active && setStates(result))
      .catch((loadError) => active && setError(loadError.message));
    return () => {
      active = false;
    };
  }, [selectedCountry]);

  useEffect(() => {
    if (!selectedCountry || !draftFilters.state || !states.includes(draftFilters.state)) {
      setDistricts([]);
      return undefined;
    }
    let active = true;
    const timer = setTimeout(() => {
      loadLocations(selectedCountry.name, draftFilters.state)
        .then((result) => active && setDistricts(result))
        .catch((loadError) => active && setError(loadError.message));
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [draftFilters.state, selectedCountry, states]);

  async function openReview(agent) {
    setError("");
    setReview(null);
    setBusy(true);
    try {
      const { application } = await adminApi.deliveryAgentApplication(agent.id);
      setReview(application);
      setReviewForm({
        status: application.applicationStatus || "Pending",
        interviewAt: application.interviewAt ? toLocalDateTimeInput(application.interviewAt) : "",
        interviewNote: application.interviewNote || "",
        reviewNote: application.reviewNote || "",
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveReview(status) {
    if (!review) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const interviewAt = reviewForm.interviewAt ? new Date(reviewForm.interviewAt) : null;
      if (status === "Interview" && (!interviewAt || Number.isNaN(interviewAt.getTime()))) {
        throw new Error("Choose a valid interview date and time.");
      }
      await adminApi.reviewDeliveryAgent(review.id, {
        ...reviewForm,
        status,
        interviewAt: interviewAt?.toISOString() || "",
      });
      setNotice(`Application marked ${status.toLowerCase()}.`);
      await openReview({ id: review.id });
      await refresh();
    } catch (reviewError) {
      setError(reviewError.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleAgent(agent) {
    setError("");
    setNotice("");
    try {
      await adminApi.updateDeliveryAgent(agent.id, !agent.isActive);
      setNotice(`Delivery account ${agent.isActive ? "deactivated" : "activated"}.`);
      await refresh();
    } catch (updateError) {
      setError(updateError.message);
    }
  }

  async function createHubStaff(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { agent } = await adminApi.createHubStaff(hubStaffForm);
      setHubStaffForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        hubId: "",
      });
      setNotice(`Hub staff account created for ${agent.email}.`);
      await refresh();
    } catch (createError) {
      setError(createError.message);
    } finally {
      setBusy(false);
    }
  }

  async function reviewHub(hub, status) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await adminApi.reviewHubApplication(hub.id, status);
      setNotice(`${hub.name} marked ${status.toLowerCase()}.`);
      await refresh();
    } catch (reviewError) {
      setError(reviewError.message);
    } finally {
      setBusy(false);
    }
  }

  async function showHubDetails(hub) {
    setHubDetails(null);
    setHubDetailsError("");
    setHubDetailsLoading(true);
    try {
      const data = await adminApi.deliveryHubDetails(hub.id);
      setHubDetails(data);
    } catch (detailsError) {
      setHubDetailsError(detailsError.message);
    } finally {
      setHubDetailsLoading(false);
    }
  }

  function closeHubDetails() {
    setHubDetails(null);
    setHubDetailsError("");
    setHubDetailsLoading(false);
  }

  async function assignShipment(shipment) {
    const key = `${shipment.orderId}:${shipment.sellerId}`;
    const formValue = assignments[key] || {};
    setError("");
    setNotice("");
    try {
      await adminApi.assignDeliveryShipment(shipment.orderId, {
        sellerId: shipment.sellerId,
        agentId: formValue.agentId || shipment.assignedAgent?.id || "",
        carrier: formValue.carrier ?? shipment.carrier,
        tracking: formValue.tracking ?? shipment.tracking,
        trackingUrl: formValue.trackingUrl ?? shipment.trackingUrl,
      });
      setNotice(`Order ${shipment.orderCode} assigned to delivery staff.`);
      await refresh();
    } catch (assignError) {
      setError(assignError.message);
    }
  }

  function setAssignment(shipment, field, value) {
    const key = `${shipment.orderId}:${shipment.sellerId}`;
    setAssignments((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value },
    }));
  }

  return (
    <AdminPageLayout activeSection="Delivery operations">
      <PageHeading
        title="Delivery operations"
        sub="Review delivery applications, schedule interviews, approve partners, and assign shipments"
      />
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      <Panel className="p-5">
        <PanelTitle title="Create hub staff account" eyebrow="HUB ACCESS" />
        <form
          onSubmit={createHubStaff}
          className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
        >
          {[
            ["name", "Full name", "text"],
            ["email", "Email", "email"],
            ["phone", "Phone", "tel"],
            ["password", "Temporary password (10+ characters)", "password"],
          ].map(([field, label, type]) => (
            <label key={field} className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              {label}
              <input
                type={type}
                required={field !== "district"}
                minLength={field === "password" ? 10 : undefined}
                maxLength={field === "password" ? 128 : undefined}
                value={hubStaffForm[field]}
                onChange={(event) =>
                  setHubStaffForm((current) => ({
                    ...current,
                    [field]: event.target.value,
                  }))
                }
                className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
          ))}
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            Assigned hub
            <select
              required
              value={hubStaffForm.hubId}
              onChange={(event) =>
                setHubStaffForm((current) => ({ ...current, hubId: event.target.value }))
              }
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">Select an approved hub</option>
              {hubs
                .filter((hub) => hub.applicationStatus === "Approved" && hub.isActive)
                .map((hub) => (
                  <option key={hub.id} value={hub.id}>
                    {hub.name} · {hub.code}
                  </option>
                ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button
              variant="primary"
              disabled={busy || !hubs.some((hub) => hub.applicationStatus === "Approved" && hub.isActive)}
            >
              Create hub login
            </Button>
          </div>
        </form>
      </Panel>

      <Panel className="p-5">
        <PanelTitle title="Hub applications and directory" eyebrow={`${hubs.length} HUBS`} />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {hubs.map((hub) => (
            <article key={hub.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold">{hub.name} · {hub.code}</h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    {[hub.address, hub.city, hub.district, hub.state, hub.country, hub.postalCode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Pickup postal codes: {hub.pickupPincodes.join(", ")}
                  </p>
                </div>
                <Status value={hub.applicationStatus} />
              </div>
              <p className="mt-3 text-xs">
                In-charge: <b>{hub.inCharge.name || "Not listed"}</b>
              </p>
              <p className="mt-1 break-words text-xs text-neutral-600 dark:text-neutral-300">
                Phone: {hub.inCharge.phone || "Not listed"} · Email: {hub.inCharge.email || "Not listed"}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-orange-700">
                {hub.inCharge.phone && <a href={`tel:${hub.inCharge.phone}`}>Call</a>}
                {hub.inCharge.phone && (
                  <a
                    href={`https://wa.me/${hub.inCharge.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                )}
                {hub.inCharge.email && <a href={`mailto:${hub.inCharge.email}`}>Email</a>}
                <button type="button" onClick={() => showHubDetails(hub)}>
                  View full details
                </button>
              </div>
              {hub.applicationStatus === "Pending" && (
                <div className="mt-3 flex gap-2">
                  <Button variant="primary" disabled={busy} onClick={() => reviewHub(hub, "Approved")}>
                    Approve hub
                  </Button>
                  <Button disabled={busy} onClick={() => reviewHub(hub, "Rejected")}>
                    Reject
                  </Button>
                </div>
              )}
            </article>
          ))}
          {!hubs.length && <Empty text="No hub applications or registered hubs yet." />}
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelTitle
          title="Delivery applications and partners"
          eyebrow={`${agents.length} RESULTS`}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            Country
            <select
              value={draftFilters.country}
              onChange={(event) =>
                setDraftFilters({
                  country: event.target.value,
                  state: "",
                  district: "",
                  status: draftFilters.status,
                })
              }
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">All countries</option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            State / region
            <input
              list="delivery-states"
              value={draftFilters.state}
              disabled={!selectedCountry}
              onChange={(event) => {
                setDraftFilters((current) => ({
                  ...current,
                  state: event.target.value,
                  district: "",
                }));
              }}
              placeholder="All states or type a state"
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900"
            />
            <datalist id="delivery-states">
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </datalist>
          </label>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            District / city
            <input
              list="delivery-districts"
              value={draftFilters.district}
              disabled={!draftFilters.state}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  district: event.target.value,
                }))
              }
              placeholder="All districts or type a district"
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900"
            />
            <datalist id="delivery-districts">
              {districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </datalist>
          </label>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            Application status
            <select
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">All statuses</option>
              {["Incomplete", "Pending", "Interview", "Approved", "Rejected"].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2 xl:col-span-4">
            <Button variant="primary" onClick={() => setLocationFilters(draftFilters)}>
              Apply filters
            </Button>
            <Button
              onClick={() => {
                const cleared = { country: "", state: "", district: "", status: "" };
                setDraftFilters(cleared);
                setLocationFilters(cleared);
              }}
            >
              Clear filters
            </Button>
          </div>
        </div>
        <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
          {agents.map((agent) => (
            <div key={agent.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <b className="block text-sm">{agent.name}</b>
                <span className="text-xs text-neutral-500">
                  {agent.email} · {agent.phone}
                </span>
                <span className="mt-1 block text-xs text-neutral-500">
                  {[
                    countries.find((country) => country.code === agent.country)?.name ||
                      agent.country,
                    agent.state,
                    agent.district,
                    agent.postalCode,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Location not provided"}
                </span>
                <span className="mt-1 block text-xs font-semibold text-orange-700">
                  {agent.staffRole === "hub_staff" ? "Hub staff" : "Delivery boy"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Status value={agent.applicationStatus} />
                {agent.staffRole !== "hub_staff" && (
                  <Button onClick={() => openReview(agent)} disabled={busy}>
                    Review application
                  </Button>
                )}
                {agent.applicationStatus === "Approved" && (
                  <>
                    <Status value={agent.isActive ? "Active" : "Suspended"} />
                    <Button onClick={() => toggleAgent(agent)}>
                      {agent.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {!agents.length && <Empty text="No delivery applications match these filters." />}
        </div>
      </Panel>

      {review && (
        <Panel className="p-5">
          <PanelTitle title={`Review ${review.name}`} eyebrow="APPLICATION REVIEW" />
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div className="space-y-2 text-sm">
              <p>
                <b>Email:</b> {review.email}
              </p>
              <p>
                <b>Phone:</b> {review.phone}
              </p>
              <p>
                <b>Address:</b> {review.address}
              </p>
              <p>
                <b>Location:</b>{" "}
                {[review.country, review.state, review.district, review.postalCode]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p>
                <b>Document:</b> {review.documentType} — {review.documentNumber}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {review.photoUrl && (
                  <a
                    href={review.photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-orange-700 underline"
                  >
                    View profile photo
                  </a>
                )}
                {review.documentUrl && (
                  <a
                    href={review.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-orange-700 underline"
                  >
                    View identity document
                  </a>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold">
                Interview date and time
                <input
                  type="datetime-local"
                  value={reviewForm.interviewAt}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      interviewAt: event.target.value,
                    }))
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </label>
              <label className="text-xs font-semibold">
                Interview note
                <input
                  maxLength={500}
                  value={reviewForm.interviewNote}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      interviewNote: event.target.value,
                    }))
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </label>
              <label className="text-xs font-semibold sm:col-span-2">
                Review note
                <textarea
                  rows={2}
                  maxLength={500}
                  value={reviewForm.reviewNote}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      reviewNote: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </label>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button
                  onClick={() => saveReview("Interview")}
                  disabled={busy || !reviewForm.interviewAt}
                >
                  Schedule interview
                </Button>
                <Button variant="primary" onClick={() => saveReview("Approved")} disabled={busy}>
                  Approve and activate
                </Button>
                <Button onClick={() => saveReview("Rejected")} disabled={busy}>
                  Reject application
                </Button>
                <Button onClick={() => setReview(null)}>Close</Button>
              </div>
            </div>
          </div>
        </Panel>
      )}

      <Panel className="overflow-x-auto p-5">
        <PanelTitle title="Shipped packages" eyebrow={`${shipments.length} PACKAGES`} />
        <table className="mt-4 w-full min-w-[1050px] text-left text-xs">
          <thead className="text-[9px] font-extrabold uppercase text-neutral-400">
            <tr>
              {[
                "Order / package",
                "Recipient",
                "Tracking stage",
                "Courier / AWB",
                "Assign staff",
                "Action",
              ].map((item) => (
                <th key={item} className="px-2 py-3">
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shipments.map((shipment) => {
              const key = `${shipment.orderId}:${shipment.sellerId}`;
              const value = assignments[key] || {};
              return (
                <tr
                  key={key}
                  className="border-t border-neutral-100 align-top dark:border-neutral-800"
                >
                  <td className="px-2 py-3">
                    <b>#{shipment.orderCode}</b>
                    <small className="mt-1 block text-neutral-500">
                      {shipment.sellerName || "Seller package"}
                    </small>
                  </td>
                  <td className="px-2 py-3">
                    <b className="block">{shipment.customer.name}</b>
                    <span>
                      {shipment.address.city} {shipment.address.postalCode}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <Status value={shipment.trackingStatus} />
                    <small className="mt-1 block text-neutral-500">{shipment.fulfillment}</small>
                  </td>
                  <td className="space-y-2 px-2 py-3">
                    <input
                      aria-label={`Courier for ${shipment.orderCode}`}
                      placeholder="Courier"
                      value={value.carrier ?? shipment.carrier}
                      onChange={(event) => setAssignment(shipment, "carrier", event.target.value)}
                      className="h-8 w-40 rounded border border-neutral-200 px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <input
                      aria-label={`AWB for ${shipment.orderCode}`}
                      placeholder="AWB / tracking number"
                      value={value.tracking ?? shipment.tracking}
                      onChange={(event) => setAssignment(shipment, "tracking", event.target.value)}
                      className="h-8 w-40 rounded border border-neutral-200 px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <input
                      aria-label={`Tracking URL for ${shipment.orderCode}`}
                      placeholder="Tracking URL (optional)"
                      value={value.trackingUrl ?? shipment.trackingUrl}
                      onChange={(event) =>
                        setAssignment(shipment, "trackingUrl", event.target.value)
                      }
                      className="h-8 w-40 rounded border border-neutral-200 px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <select
                      aria-label={`Delivery agent for ${shipment.orderCode}`}
                      value={value.agentId || shipment.assignedAgent?.id || ""}
                      onChange={(event) => setAssignment(shipment, "agentId", event.target.value)}
                      className="h-9 w-44 rounded border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      <option value="">Select active agent</option>
                      {agents
                        .filter(
                          (agent) =>
                            agent.isActive &&
                            agent.staffRole === "delivery_agent",
                        )
                        .map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name}
                          </option>
                        ))}
                    </select>
                    {shipment.assignedAgent && (
                      <small className="mt-1 block text-neutral-500">
                        Assigned: {shipment.assignedAgent.name}
                      </small>
                    )}
                  </td>
                  <td className="space-y-2 px-2 py-3">
                    <Button
                      variant="primary"
                      disabled={
                        !shipment.canAssign ||
                        !(value.agentId || shipment.assignedAgent?.id) ||
                        !(value.tracking ?? shipment.tracking)
                      }
                      onClick={() => assignShipment(shipment)}
                    >
                      {shipment.assignedAgent ? "Update assignment" : "Assign"}
                    </Button>
                    {shipment.scanToken && (
                      <Button onClick={() => setLabel(shipment)}>Print QR label</Button>
                    )}
                    {!shipment.canAssign && (
                      <small className="block text-neutral-500">
                        Seller must mark it shipped first.
                      </small>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!shipments.length && (
          <Empty text="No packed or shipped packages are waiting for delivery assignment." />
        )}
      </Panel>
      {label && <ShipmentLabel shipment={label} onClose={() => setLabel(null)} />}
      <HubDetailsDialog
        details={hubDetails}
        loading={hubDetailsLoading}
        error={hubDetailsError}
        onClose={closeHubDetails}
      />
    </AdminPageLayout>
  );
}
