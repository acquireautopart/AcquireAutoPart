const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const DeliveryAgent = require("./models/DeliveryAgent");
const Order = require("../customer/models/Order");
const ReturnRequest = require("../customer/models/ReturnRequest");
const Product = require("../seller/models/Product");
const HttpError = require("../../utils/HttpError");
const { decryptValue, encryptValue } = require("../../utils/encryption");
const verificationStorage = require("../seller/verificationStorage");
const { getCountry, getIdentityDocumentTypes } = require("../market/countries");
const sellerService = require("../seller/service");

const EVENT_NEXT = {
  "Ready for Pickup": ["Picked Up"],
  "Picked Up": ["Arrived at Origin Hub"],
  "Arrived at Origin Hub": ["In Transit"],
  "In Transit": ["Arrived at Facility", "Reached Destination Hub"],
  "Arrived at Facility": ["Left Facility"],
  "Left Facility": ["Arrived at Facility", "Reached Destination Hub"],
  "Reached Destination Hub": ["Out for Delivery"],
  "Out for Delivery": ["Delivery Attempted", "Delivered"],
  "Delivery Attempted": ["Out for Delivery", "RTO Initiated"],
  "RTO Initiated": ["RTO In Transit"],
  "RTO In Transit": ["RTO Delivered"],
};
const HUB_EVENT_STATUSES = new Set([
  "Arrived at Origin Hub",
  "In Transit",
  "Arrived at Facility",
  "Left Facility",
  "Reached Destination Hub",
]);
const HUB_TASK_STATUSES = [
  "Picked Up",
  "Arrived at Origin Hub",
  "In Transit",
  "Arrived at Facility",
  "Left Facility",
  "Reached Destination Hub",
];
const ATTEMPT_REASONS = [
  "Customer unavailable",
  "Address issue",
  "Customer refused",
  "Phone unreachable",
];
const MAX_DELIVERY_ATTEMPTS = 3;
const MAX_OTP_FAILURES = 5;

function canTransition(current, next) {
  return Boolean(EVENT_NEXT[current]?.includes(next));
}

function isValidClientEventId(value) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
}

function findRecordedEvent(events, clientEventId, status) {
  const recordedEvent = events?.find(
    (event) => event.clientEventId === clientEventId,
  );
  if (recordedEvent && recordedEvent.status !== status) {
    throw new HttpError(409, "This scan event ID was already used.");
  }
  return recordedEvent || null;
}

function publicAgent(agent) {
  return {
    id: agent._id?.toString?.() || agent.id,
    name: agent.name,
    email: agent.email,
    phone: agent.phone,
    role: agent.role === "hub_staff" ? "Hub staff" : "Delivery agent",
    staffRole: agent.role || "delivery_agent",
    district: agent.district || "",
    state: agent.state || "",
    isOnline: Boolean(agent.isOnline),
  };
}

function isValidPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 10 &&
    password.length <= 128
  );
}

function getApplicationInput(body = {}) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const password = String(body.password || "");
  const address = String(body.address || "").trim();
  const country = getCountry(body.country);
  const state = String(body.state || "").trim();
  const district = String(body.district || "").trim();
  const postalCode = String(body.postalCode || "").trim();
  const documentType = String(body.documentType || "").trim();
  const documentNumber = String(body.documentNumber || "").trim();

  if (!name || name.length < 2 || name.length > 100) {
    throw new HttpError(400, "Enter your full name.");
  }
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    throw new HttpError(400, "Enter a valid email address.");
  }
  if (!/^[+\d][\d\s().-]{6,23}$/.test(phone)) {
    throw new HttpError(400, "Enter a valid phone number with country code.");
  }
  if (!isValidPassword(password)) {
    throw new HttpError(400, "Passwords must be 10–128 characters long.");
  }
  if (address.length < 8 || address.length > 500) {
    throw new HttpError(400, "Enter your complete address.");
  }
  if (!country) {
    throw new HttpError(400, "Choose a valid country.");
  }
  if (!state || state.length > 120 || !district || district.length > 120) {
    throw new HttpError(400, "Choose your state and district or city.");
  }
  if (postalCode.length < 2 || postalCode.length > 24) {
    throw new HttpError(400, "Enter a valid postal or PIN code.");
  }
  if (!getIdentityDocumentTypes(country.code).includes(documentType)) {
    throw new HttpError(400, "Choose a valid identity document type.");
  }
  if (documentNumber.length < 3 || documentNumber.length > 120) {
    throw new HttpError(400, "Enter a valid identity document number.");
  }

  return {
    name,
    email,
    phone,
    password,
    address,
    country: country.code,
    state,
    district,
    postalCode,
    documentType,
    documentNumber,
  };
}

async function createApplication(body = {}, jwtSecret) {
  const input = getApplicationInput(body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const applicationToken = crypto.randomBytes(32).toString("hex");
  try {
    const agent = await DeliveryAgent.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      isActive: false,
      applicationStatus: "Incomplete",
      address: input.address,
      country: input.country,
      state: input.state,
      district: input.district,
      postalCode: input.postalCode,
      identityDocumentType: input.documentType,
      identityDocumentNumberEncrypted: encryptValue(
        input.documentNumber,
        jwtSecret,
      ),
      applicationTokenHash: crypto
        .createHash("sha256")
        .update(applicationToken)
        .digest("hex"),
      applicationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return { id: agent._id.toString(), applicationToken };
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(
        409,
        "A delivery application with this email already exists.",
      );
    }
    throw error;
  }
}

async function createHubStaff(body = {}) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const password = String(body.password || "");
  const district = String(body.district || "").trim();
  if (name.length < 2 || name.length > 100) {
    throw new HttpError(400, "Enter the hub staff member's full name.");
  }
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    throw new HttpError(400, "Enter a valid email address.");
  }
  if (!/^[+\d][\d\s().-]{6,23}$/.test(phone)) {
    throw new HttpError(400, "Enter a valid phone number with country code.");
  }
  if (!isValidPassword(password)) {
    throw new HttpError(400, "Passwords must be 10–128 characters long.");
  }
  if (district.length > 120) {
    throw new HttpError(400, "Hub location must be 120 characters or fewer.");
  }
  try {
    const agent = await DeliveryAgent.create({
      name,
      email,
      phone,
      passwordHash: await bcrypt.hash(password, 12),
      role: "hub_staff",
      isActive: true,
      applicationStatus: "Approved",
      district,
    });
    return { ...publicAgent(agent), isActive: agent.isActive };
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(409, "A delivery account with this email already exists.");
    }
    throw error;
  }
}

async function uploadApplicationFile(applicationToken, kind, file) {
  if (!["photo", "document"].includes(kind)) {
    throw new HttpError(400, "Choose a valid application file type.");
  }
  const token = String(applicationToken || "");
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    throw new HttpError(401, "This application upload link is invalid or expired.");
  }
  const agent = await DeliveryAgent.findOne({
    applicationTokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    applicationTokenExpiresAt: { $gt: new Date() },
    applicationStatus: "Incomplete",
  }).select("+applicationTokenHash +applicationTokenExpiresAt +profilePhotoKey +identityDocumentKey");
  if (!agent) {
    throw new HttpError(401, "This application upload link is invalid or expired.");
  }
  verificationStorage.validateDocument(file);
  if (kind === "photo" && !["image/jpeg", "image/png", "image/webp"].includes(file.contentType)) {
    throw new HttpError(400, "Upload your photo as a JPEG, PNG, or WebP image.");
  }
  const key = await verificationStorage.storeDocument(
    agent._id,
    file,
    "delivery-applications",
  );
  const keyField = kind === "photo" ? "profilePhotoKey" : "identityDocumentKey";
  const previousKey = agent[keyField];
  agent[keyField] = key;
  if (agent.profilePhotoKey && agent.identityDocumentKey) {
    agent.applicationStatus = "Pending";
    agent.applicationSubmittedAt = new Date();
    agent.applicationTokenHash = "";
    agent.applicationTokenExpiresAt = null;
  }
  await agent.save();
  if (previousKey) await verificationStorage.deleteDocument(previousKey);
  return {
    applicationStatus: agent.applicationStatus,
    uploaded: kind,
  };
}

async function login({ email, password, role = "delivery_agent" } = {}) {
  if (!["delivery_agent", "hub_staff"].includes(role)) {
    return null;
  }
  const agent = await DeliveryAgent.findOne({
    email: String(email || "")
      .trim()
      .toLowerCase(),
    isActive: true,
    role,
  }).select("+passwordHash");
  if (
    !agent ||
    !(await bcrypt.compare(String(password || ""), agent.passwordHash))
  ) {
    return null;
  }
  return {
    ...publicAgent(agent),
    authVersion: agent.authVersion || 0,
  };
}

async function changePassword(agentId, { currentPassword, newPassword } = {}) {
  if (!isValidPassword(newPassword)) {
    throw new HttpError(400, "New passwords must be 10–128 characters long.");
  }
  const agent = await DeliveryAgent.findById(agentId).select("+passwordHash");
  if (!agent) throw new HttpError(404, "Delivery agent not found.");
  if (
    !(await bcrypt.compare(String(currentPassword || ""), agent.passwordHash))
  ) {
    throw new HttpError(400, "The current password is incorrect.");
  }
  if (await bcrypt.compare(newPassword, agent.passwordHash)) {
    throw new HttpError(400, "Choose a new password you have not used before.");
  }
  agent.passwordHash = await bcrypt.hash(newPassword, 12);
  agent.authVersion += 1;
  await agent.save();
  return { ...publicAgent(agent), authVersion: agent.authVersion };
}

async function listAgents(filters = {}) {
  const query = {};
  for (const field of ["country", "state", "district"]) {
    if (filters[field]) query[field] = String(filters[field]).trim();
  }
  if (["Incomplete", "Pending", "Interview", "Approved", "Rejected"].includes(filters.status)) {
    query.applicationStatus = filters.status;
  }
  const agents = await DeliveryAgent.find(query)
    .select(
      "name email phone role isActive isOnline applicationStatus address country state district postalCode applicationSubmittedAt interviewAt interviewNote reviewNote createdAt",
    )
    .sort({ name: 1 })
    .lean();
  return {
    agents: agents.map((agent) => ({
      ...publicAgent(agent),
      isActive: Boolean(agent.isActive),
      applicationStatus:
        agent.applicationStatus || (agent.isActive ? "Approved" : "Pending"),
      address: agent.address || "",
      country: agent.country || "",
      state: agent.state || "",
      district: agent.district || "",
      postalCode: agent.postalCode || "",
      applicationSubmittedAt: agent.applicationSubmittedAt || null,
      interviewAt: agent.interviewAt || null,
      interviewNote: agent.interviewNote || "",
      reviewNote: agent.reviewNote || "",
      createdAt: agent.createdAt,
    })),
  };
}

async function getAgentApplicationReview(id, jwtSecret) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, "Delivery application not found.");
  }
  const agent = await DeliveryAgent.findById(id).select(
    "+profilePhotoKey +identityDocumentKey +identityDocumentNumberEncrypted",
  );
  if (!agent) throw new HttpError(404, "Delivery application not found.");
  const [photoUrl, documentUrl] = await Promise.all([
    agent.profilePhotoKey
      ? verificationStorage.createReviewUrl(agent.profilePhotoKey)
      : Promise.resolve(""),
    agent.identityDocumentKey
      ? verificationStorage.createReviewUrl(agent.identityDocumentKey)
      : Promise.resolve(""),
  ]);
  return {
    id: agent._id.toString(),
    name: agent.name,
    email: agent.email,
    phone: agent.phone,
    address: agent.address,
    country: agent.country,
    state: agent.state,
    district: agent.district,
    postalCode: agent.postalCode,
    documentType: agent.identityDocumentType,
    documentNumber: decryptValue(
      agent.identityDocumentNumberEncrypted,
      jwtSecret,
    ),
    photoUrl,
    documentUrl,
    applicationStatus: agent.applicationStatus,
    applicationSubmittedAt: agent.applicationSubmittedAt,
    interviewAt: agent.interviewAt,
    interviewNote: agent.interviewNote,
    reviewNote: agent.reviewNote,
  };
}

async function reviewAgentApplication(id, body = {}, adminEmail = "") {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, "Delivery application not found.");
  }
  const statuses = ["Pending", "Interview", "Approved", "Rejected"];
  if (!statuses.includes(body.status)) {
    throw new HttpError(400, "Choose a valid delivery application status.");
  }
  let interviewAt = null;
  if (body.interviewAt) {
    interviewAt = new Date(body.interviewAt);
    if (Number.isNaN(interviewAt.getTime())) {
      throw new HttpError(400, "Choose a valid interview date and time.");
    }
  }
  if (body.status === "Interview" && !interviewAt) {
    throw new HttpError(400, "Schedule an interview before marking it scheduled.");
  }

  const agent = await DeliveryAgent.findById(id).select(
    "+profilePhotoKey +identityDocumentKey",
  );
  if (!agent) throw new HttpError(404, "Delivery application not found.");
  if (
    body.status === "Interview" &&
    (!agent.applicationSubmittedAt ||
      !agent.profilePhotoKey ||
      !agent.identityDocumentKey)
  ) {
    throw new HttpError(409, "The applicant must submit a photo and identity document before an interview.");
  }
  if (
    body.status === "Approved" &&
    (!agent.applicationSubmittedAt ||
      !agent.profilePhotoKey ||
      !agent.identityDocumentKey)
  ) {
    throw new HttpError(409, "The applicant must submit a photo and identity document first.");
  }
  if (
    body.status === "Approved" &&
    (agent.applicationStatus !== "Interview" || !agent.interviewAt)
  ) {
    throw new HttpError(409, "Schedule and complete an interview before approving the application.");
  }
  if (
    body.status === "Approved" &&
    new Date(agent.interviewAt).getTime() > Date.now()
  ) {
    throw new HttpError(409, "The scheduled interview must take place before approval.");
  }
  if (agent.applicationStatus !== body.status) agent.authVersion += 1;
  agent.applicationStatus = body.status;
  agent.interviewAt = interviewAt;
  agent.interviewNote = String(body.interviewNote || "").trim().slice(0, 500);
  agent.reviewNote = String(body.reviewNote || "").trim().slice(0, 500);
  agent.reviewedAt = new Date();
  agent.reviewedBy = String(adminEmail || "").trim().slice(0, 254);
  agent.isActive = body.status === "Approved";
  if (!agent.isActive) agent.isOnline = false;
  await agent.save();
  return {
    ...publicAgent(agent),
    isActive: agent.isActive,
    applicationStatus: agent.applicationStatus,
    interviewAt: agent.interviewAt,
  };
}

async function setAgentActive(id, isActive) {
  if (!mongoose.isValidObjectId(id) || typeof isActive !== "boolean") {
    throw new HttpError(400, "Choose a valid delivery account status.");
  }
  const agent = await DeliveryAgent.findById(id);
  if (!agent) throw new HttpError(404, "Delivery agent not found.");
  if (isActive && agent.applicationStatus !== "Approved") {
    throw new HttpError(409, "Approve the delivery application before activating the account.");
  }
  if (agent.isActive !== isActive) {
    agent.isActive = isActive;
    if (!isActive) {
      agent.authVersion += 1;
      agent.isOnline = false;
    }
    await agent.save();
  }
  return { ...publicAgent(agent), isActive: agent.isActive };
}

async function setAgentOnline(agentId, isOnline) {
  if (typeof isOnline !== "boolean") {
    throw new HttpError(400, "Choose a valid availability status.");
  }
  const agent = await DeliveryAgent.findById(agentId);
  if (!agent || !agent.isActive) {
    throw new HttpError(404, "An active delivery account was not found.");
  }
  agent.isOnline = isOnline;
  await agent.save();
  return publicAgent(agent);
}

function safeTrackingUrl(value) {
  const trackingUrl = String(value || "")
    .trim()
    .slice(0, 500);
  if (!trackingUrl) return "";
  let parsed;
  try {
    parsed = new URL(trackingUrl);
  } catch {
    throw new HttpError(400, "Enter a valid tracking URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new HttpError(400, "Tracking URLs must use HTTP or HTTPS.");
  }
  return trackingUrl;
}

function getSellerState(order, sellerId) {
  return order.sellerFulfillments.find(
    (state) =>
      (state.seller?._id?.toString?.() || state.seller?.toString()) ===
      sellerId.toString(),
  );
}

function objectIdString(value) {
  return value?._id?.toString?.() || value?.toString?.() || "";
}

function serializeShipment(order, sellerState, { includeAgent = false } = {}) {
  const customer = order.customer || {};
  const task = {
    orderId: order._id.toString(),
    orderCode: order.code,
    sellerId: objectIdString(sellerState.seller),
    sellerName: sellerState.seller?.storeName || "",
    fulfillment: sellerState.status,
    trackingStatus: sellerState.trackingStatus || "Order Confirmed",
    carrier: sellerState.carrier || "",
    tracking: sellerState.tracking || "",
    trackingUrl: sellerState.trackingUrl || "",
    scanToken: sellerState.scanToken || "",
    customer: {
      name: order.address?.name || customer.name || "Customer",
      phone: order.address?.phone || "",
      email: customer.email || "",
    },
    address: {
      line: order.address?.line || "",
      city: order.address?.city || "",
      region: order.address?.region || "",
      postalCode: order.address?.postalCode || "",
      country: order.address?.country || "",
    },
    paymentMethod: order.payment?.method || "",
    currency: order.currency || "USD",
    codCollectedAmount: Number(sellerState.codCollectedAmount) || 0,
    deliveryAttempts: Number(sellerState.deliveryAttempts) || 0,
    events: (sellerState.events || []).map((event) => ({
      status: event.status,
      source: event.source,
      occurredAt: event.occurredAt,
      note: event.note || "",
      attemptReason: event.attemptReason || "",
      location:
        event.location?.latitude == null || event.location?.longitude == null
          ? null
          : {
              latitude: event.location.latitude,
              longitude: event.location.longitude,
              label: event.location.label || "",
            },
    })),
  };
  if (includeAgent) {
    task.assignedAgent = sellerState.assignedDeliveryAgent
      ? {
          id:
            sellerState.assignedDeliveryAgent._id?.toString?.() ||
            sellerState.assignedDeliveryAgent.toString(),
          name: sellerState.assignedDeliveryAgent.name || "",
          email: sellerState.assignedDeliveryAgent.email || "",
        }
      : null;
  }
  return task;
}

function serializeReverseTask(entry) {
  const order = entry.order || {};
  const customer = entry.customer || {};
  return {
    taskType: "reverse",
    orderId: entry._id.toString(),
    orderCode: entry.orderRef,
    sellerId: objectIdString(entry.seller),
    sellerName: entry.seller?.storeName || "",
    fulfillment: entry.type,
    returnType: entry.type,
    trackingStatus: entry.trackingStatus,
    carrier: "AcquireAuto reverse logistics",
    tracking: entry.code,
    scanToken: entry.scanToken || "",
    customer: {
      name: order.address?.name || customer.name || "Customer",
      phone: order.address?.phone || "",
      email: customer.email || "",
    },
    address: {
      line: order.address?.line || "",
      city: order.address?.city || "",
      region: order.address?.region || "",
      postalCode: order.address?.postalCode || "",
      country: order.address?.country || "",
    },
    paymentMethod: "Return / replacement",
    currency: order.currency || "USD",
    codAmountDue: 0,
    deliveryAttempts: 0,
    events: (entry.trackingEvents || []).map((event) => ({
      status: event.status,
      source: event.source,
      clientEventId: event.clientEventId || "",
      occurredAt: event.occurredAt,
      note: event.note || "",
      location:
        event.location?.latitude == null || event.location?.longitude == null
          ? null
          : {
              latitude: event.location.latitude,
              longitude: event.location.longitude,
              label: event.location.label || "",
            },
    })),
  };
}

async function listDispatchShipments() {
  const orders = await Order.find({
    sellerFulfillments: {
      $elemMatch: {
        status: { $in: ["Packed", "Shipped"] },
      },
    },
  })
    .sort({ placedAt: -1 })
    .limit(300)
    .populate("customer", "name email")
    .populate("sellerFulfillments.seller", "storeName")
    .populate("sellerFulfillments.assignedDeliveryAgent", "name email")
    .lean();
  const shipments = [];
  for (const order of orders) {
    for (const state of order.sellerFulfillments || []) {
      if (!["Packed", "Shipped"].includes(state.status)) continue;
      shipments.push({
        ...serializeShipment(order, state, { includeAgent: true }),
        placedAt: order.placedAt,
        canAssign: state.status === "Shipped",
        codAmountDue:
          order.payment?.method === "Cash on delivery"
            ? await expectedCodAmount(order, state)
            : 0,
      });
    }
  }
  return { shipments };
}

async function assignShipment(orderId, body = {}) {
  const { sellerId, agentId } = body;
  if (
    !mongoose.isValidObjectId(orderId) ||
    !mongoose.isValidObjectId(sellerId) ||
    !mongoose.isValidObjectId(agentId)
  ) {
    throw new HttpError(
      400,
      "Choose a valid order, seller, and delivery agent.",
    );
  }
  const agent = await DeliveryAgent.findOne({
    _id: agentId,
    isActive: true,
    role: "delivery_agent",
  }).lean();
  if (!agent)
    throw new HttpError(404, "An active delivery agent was not found.");
  const order = await Order.findById(orderId).populate(
    "customer",
    "name email",
  );
  if (!order) throw new HttpError(404, "Order not found.");
  if (order.status === "Cancelled") {
    throw new HttpError(
      409,
      "Cancelled orders cannot be assigned for delivery.",
    );
  }
  const sellerState = getSellerState(order, sellerId);
  if (!sellerState || sellerState.status !== "Shipped") {
    throw new HttpError(409, "Only shipped seller packages can be assigned.");
  }
  if (
    ["Delivered", "RTO Delivered", "Cancelled"].includes(
      sellerState.trackingStatus,
    )
  ) {
    throw new HttpError(409, "This package has already been completed.");
  }
  const tracking = String(body.tracking || "")
    .trim()
    .slice(0, 100);
  const carrier = String(body.carrier || "")
    .trim()
    .slice(0, 80);
  if (!tracking)
    throw new HttpError(400, "Enter the courier AWB or tracking number.");
  const trackingUrl = safeTrackingUrl(body.trackingUrl);
  sellerState.assignedDeliveryAgent = agent._id;
  sellerState.carrier = carrier;
  sellerState.tracking = tracking;
  sellerState.trackingUrl = trackingUrl;
  if (!sellerState.scanToken) {
    sellerState.scanToken = crypto.randomBytes(32).toString("hex");
  }
  if (
    !sellerState.trackingStatus ||
    ["Order Confirmed", "Packed", "Shipped"].includes(
      sellerState.trackingStatus,
    )
  ) {
    sellerState.trackingStatus = "Ready for Pickup";
    if (!sellerState.events) sellerState.events = [];
    sellerState.events.push({
      status: "Ready for Pickup",
      source: "admin",
      occurredAt: new Date(),
    });
  }
  await order.save();
  return serializeShipment(order, sellerState);
}

async function listTasks(agentId) {
  const orders = await Order.find({
    "sellerFulfillments.assignedDeliveryAgent": agentId,
  })
    .sort({ placedAt: -1 })
    .limit(200)
    .populate("customer", "name email")
    .lean();
  const tasks = [];
  for (const order of orders) {
    for (const state of order.sellerFulfillments || []) {
      if (state.assignedDeliveryAgent?.toString() !== agentId.toString())
        continue;
      if (
        ["Delivered", "RTO Delivered", "Cancelled"].includes(
          state.trackingStatus,
        )
      ) {
        const completedRecently =
          state.trackingStatus === "Delivered" &&
          state.updatedAt &&
          new Date(state.updatedAt).getTime() >=
            Date.now() - 24 * 60 * 60 * 1000;
        if (!completedRecently) continue;
      }
      tasks.push({
        ...serializeShipment(order, state),
        placedAt: order.placedAt,
        codAmountDue:
          order.payment?.method === "Cash on delivery"
            ? await expectedCodAmount(order, state)
            : 0,
      });
    }
  }
  const reverseTasks = await ReturnRequest.find({
    trackingStatus: {
      $in: ["Ready for Pickup", "Reached Destination Hub", "Out for Delivery"],
    },
    $or: [
      { assignedDeliveryAgent: agentId },
      { trackingStatus: "Ready for Pickup", assignedDeliveryAgent: null },
    ],
  })
    .sort({ requestedAt: -1 })
    .limit(200)
    .populate("customer", "name email")
    .populate("order", "address payment currency")
    .populate("seller", "storeName")
    .lean();
  tasks.push(
    ...reverseTasks.map((entry) => ({
      ...serializeReverseTask(entry),
      placedAt: entry.requestedAt,
    })),
  );
  return { tasks };
}

async function listHubTasks() {
  const orders = await Order.find({
    sellerFulfillments: {
      $elemMatch: {
        status: "Shipped",
        trackingStatus: { $in: HUB_TASK_STATUSES },
      },
    },
  })
    .sort({ placedAt: -1 })
    .limit(300)
    .populate("customer", "name email")
    .populate("sellerFulfillments.seller", "storeName")
    .lean();
  const tasks = [];
  for (const order of orders) {
    for (const state of order.sellerFulfillments || []) {
      if (
        state.status !== "Shipped" ||
        !HUB_TASK_STATUSES.includes(state.trackingStatus)
      ) {
        continue;
      }
      tasks.push({
        ...serializeShipment(order, state),
        placedAt: order.placedAt,
      });
    }
  }
  const reverseTasks = await ReturnRequest.find({
    trackingStatus: {
      $in: ["Picked Up", "Arrived at Facility", "Left Facility"],
    },
  })
    .sort({ requestedAt: -1 })
    .limit(300)
    .populate("customer", "name email")
    .populate("order", "address payment currency")
    .populate("seller", "storeName")
    .lean();
  tasks.push(
    ...reverseTasks.map((entry) => ({
      ...serializeReverseTask(entry),
      placedAt: entry.requestedAt,
    })),
  );
  return { tasks };
}

function compareOtp(supplied, encrypted) {
  const expected = decryptValue(encrypted);
  const left = Buffer.from(String(supplied || ""));
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function validateLocation(location) {
  if (location == null) return null;
  const { latitude, longitude } = location;
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new HttpError(400, "The delivery location is invalid.");
  }
  return {
    latitude,
    longitude,
    label: String(location.label || "").trim().slice(0, 120),
  };
}

function allocateCodAmount(total, amounts, sellerId) {
  const eligible = amounts.filter((entry) => entry.netAmount > 0);
  const index = eligible.findIndex((entry) => entry.sellerId === sellerId);
  const netTotal = eligible.reduce((sum, entry) => sum + entry.netAmount, 0);
  if (index < 0 || !netTotal) return null;
  const totalCents = Math.round(Number(total) * 100);
  if (!Number.isFinite(totalCents) || totalCents < 0) return null;
  if (index === eligible.length - 1) {
    const alreadyAllocated = eligible
      .slice(0, index)
      .reduce(
        (sum, entry) =>
          sum + Math.round((totalCents * entry.netAmount) / netTotal),
        0,
      );
    return (totalCents - alreadyAllocated) / 100;
  }
  return Math.round((totalCents * eligible[index].netAmount) / netTotal) / 100;
}

async function expectedCodAmount(order, sellerState) {
  const productIds = order.items
    .map((item) => item.productId)
    .filter((id) => mongoose.isValidObjectId(id));
  const products = await Product.find({ _id: { $in: productIds } })
    .select("_id seller")
    .lean();
  const sellerForProduct = new Map(
    products.map((product) => [
      product._id.toString(),
      product.seller.toString(),
    ]),
  );
  const sellers = new Map();
  for (const item of order.items) {
    const sellerId = sellerForProduct.get(item.productId);
    if (!sellerId) continue;
    sellers.set(
      sellerId,
      (sellers.get(sellerId) || 0) + Number(item.price) * Number(item.quantity),
    );
  }
  const currentSellerId = objectIdString(sellerState.seller);
  const amounts = (order.sellerFulfillments || [])
    .map((state) => {
      const sellerId = objectIdString(state.seller);
      const subtotal = sellers.get(sellerId) || 0;
      const sellerDiscount =
        order.appliedDiscount?.seller?.toString() === sellerId
          ? Number(order.appliedDiscount.amount) || 0
          : 0;
      const netAmount =
        Number(state.commissionableAmount) > 0
          ? Number(state.commissionableAmount)
          : Math.max(0, subtotal - sellerDiscount);
      return { sellerId, netAmount };
    })
    .filter((entry) => entry.netAmount > 0);
  const amount = allocateCodAmount(
    order.totals.total,
    amounts,
    currentSellerId,
  );
  if (amount === null) {
    throw new HttpError(
      409,
      "The COD allocation for this package is unavailable.",
    );
  }
  return amount;
}

async function addTaskEvent(
  agentId,
  orderId,
  body = {},
  actorRole = "delivery_agent",
) {
  if (!["delivery_agent", "hub_staff"].includes(actorRole)) {
    throw new HttpError(403, "This account cannot record shipment scans.");
  }
  if (!mongoose.isValidObjectId(orderId))
    throw new HttpError(400, "Choose a valid package.");
  const scanToken = String(body.scanToken || "").trim();
  if (!/^[a-f\d]{64}$/i.test(scanToken)) {
    throw new HttpError(
      400,
      "Scan the package barcode before recording an update.",
    );
  }
  let order = await Order.findOne({
    _id: orderId,
    sellerFulfillments: {
      $elemMatch: {
        scanToken,
        ...(actorRole === "delivery_agent"
          ? { assignedDeliveryAgent: agentId }
          : {}),
      },
    },
  })
    .select("+sellerFulfillments.deliveryOtpEncrypted")
    .populate("customer", "name email");
  if (!order)
    throw new HttpError(404, "This package is not assigned to your account.");
  let sellerState = order.sellerFulfillments.find(
    (state) =>
      state.scanToken === scanToken &&
      (actorRole === "hub_staff" ||
        state.assignedDeliveryAgent?.toString() === agentId.toString()),
  );
  const eventStatus = String(body.status || "");
  if (
    actorRole === "hub_staff"
      ? !HUB_EVENT_STATUSES.has(eventStatus)
      : HUB_EVENT_STATUSES.has(eventStatus)
  ) {
    throw new HttpError(
      403,
      actorRole === "hub_staff"
        ? "Hub staff can only record facility arrival and departure scans."
        : "Only hub staff can record facility arrival and departure scans.",
    );
  }
  const clientEventId = String(body.clientEventId || "").trim();
  if (clientEventId && !isValidClientEventId(clientEventId)) {
    throw new HttpError(400, "The scan event ID is invalid.");
  }
  if (clientEventId) {
    const recordedEvent = findRecordedEvent(
      sellerState.events,
      clientEventId,
      eventStatus,
    );
    if (recordedEvent) {
      return {
        ...serializeShipment(order, sellerState),
        deliveryOtpIssued: false,
        duplicate: true,
      };
    }
  }
  if (!canTransition(sellerState.trackingStatus, eventStatus)) {
    throw new HttpError(
      409,
      "This package cannot move to that tracking status yet.",
    );
  }
  const attemptReason = String(body.attemptReason || "");
  if (eventStatus === "Delivery Attempted") {
    if (!ATTEMPT_REASONS.includes(attemptReason)) {
      throw new HttpError(
        400,
        "Choose a valid reason for the delivery attempt.",
      );
    }
    if ((sellerState.deliveryAttempts || 0) >= MAX_DELIVERY_ATTEMPTS) {
      throw new HttpError(409, "The delivery attempt limit has been reached.");
    }
  }
  if (
    eventStatus === "RTO Initiated" &&
    (sellerState.deliveryAttempts || 0) < MAX_DELIVERY_ATTEMPTS
  ) {
    throw new HttpError(
      409,
      "RTO can be started after three failed delivery attempts.",
    );
  }
  let codCollectedAmount = null;
  let codCollectionMethod = "";
  if (eventStatus === "Delivered") {
    if (
      !sellerState.deliveryOtpEncrypted ||
      !sellerState.deliveryOtpExpiresAt ||
      sellerState.deliveryOtpExpiresAt < new Date() ||
      sellerState.deliveryOtpUsedAt
    ) {
      throw new HttpError(
        409,
        "The delivery OTP is missing, expired, or already used.",
      );
    }
    if ((sellerState.deliveryOtpFailures || 0) >= MAX_OTP_FAILURES) {
      throw new HttpError(
        429,
        "Too many incorrect OTP attempts. Contact delivery support.",
      );
    }
    if (!compareOtp(body.otp, sellerState.deliveryOtpEncrypted)) {
      sellerState.deliveryOtpFailures =
        (sellerState.deliveryOtpFailures || 0) + 1;
      await order.save();
      throw new HttpError(400, "The delivery OTP is incorrect.");
    }
    if (order.payment?.method === "Cash on delivery") {
      const expected = await expectedCodAmount(order, sellerState);
      codCollectedAmount = Number(body.codCollectedAmount);
      codCollectionMethod = String(body.codCollectionMethod || "");
      if (
        !Number.isFinite(codCollectedAmount) ||
        Math.round(codCollectedAmount * 100) !== Math.round(expected * 100)
      ) {
        throw new HttpError(
          400,
          `Collect the exact COD amount of ${expected.toFixed(2)} ${order.currency || "USD"}.`,
        );
      }
      if (!["Cash", "UPI"].includes(codCollectionMethod)) {
        throw new HttpError(
          400,
          "Choose Cash or UPI as the COD collection method.",
        );
      }
    } else if (body.codCollectedAmount !== undefined) {
      throw new HttpError(
        400,
        "COD collection is only available for cash-on-delivery orders.",
      );
    }
  }
  const location = validateLocation(body.location);
  if (!location) {
    throw new HttpError(
      400,
      "Enable location access to record every shipment update.",
    );
  }
  const now = new Date();
  let deliveryOtp = "";
  if (eventStatus === "Delivered") {
    await sellerService.updateOrder(
      sellerState.seller,
      order._id,
      "Delivered",
      undefined,
      "delivery_agent",
      undefined,
      undefined,
      body.location,
    );
    const refreshed = await Order.findById(order._id)
      .select("+sellerFulfillments.deliveryOtpEncrypted")
      .populate("customer", "name email");
    if (!refreshed) throw new HttpError(404, "Order not found.");
    order = refreshed;
    sellerState = getSellerState(refreshed, sellerState.seller);
    sellerState.deliveryOtpUsedAt = now;
  } else if (eventStatus === "Out for Delivery") {
    deliveryOtp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    sellerState.deliveryOtpEncrypted = encryptValue(deliveryOtp);
    sellerState.deliveryOtpExpiresAt = new Date(
      now.getTime() + 8 * 60 * 60 * 1000,
    );
    sellerState.deliveryOtpUsedAt = null;
    sellerState.deliveryOtpFailures = 0;
  } else if (eventStatus === "Delivery Attempted") {
    sellerState.deliveryAttempts = (sellerState.deliveryAttempts || 0) + 1;
  }
  sellerState.trackingStatus = eventStatus;
  if (codCollectedAmount !== null) {
    sellerState.codCollectedAmount = codCollectedAmount;
    sellerState.codCollectedAt = now;
    sellerState.codCollectionMethod = codCollectionMethod;
  }
  if (!sellerState.events) sellerState.events = [];
  sellerState.events.push({
    status: eventStatus,
    source: actorRole,
    clientEventId,
    occurredAt: now,
    note: String(body.note || "")
      .trim()
      .slice(0, 300),
    attemptReason: eventStatus === "Delivery Attempted" ? attemptReason : "",
    location: location || undefined,
  });
  await order.save();
  return {
    ...serializeShipment(order, sellerState),
    deliveryOtpIssued: Boolean(deliveryOtp),
  };
}

async function addHubTaskEvent(agentId, orderId, body = {}) {
  return addTaskEvent(agentId, orderId, body, "hub_staff");
}

function reverseNextStatuses(entry) {
  const { trackingStatus, type } = entry;
  if (trackingStatus === "Ready for Pickup") return ["Picked Up"];
  if (trackingStatus === "Picked Up") return ["Arrived at Facility"];
  if (trackingStatus === "Arrived at Facility") return ["Left Facility"];
  if (trackingStatus === "Left Facility") {
    return type === "Return"
      ? ["Arrived at Facility", "At Seller"]
      : ["Arrived at Facility", "Reached Destination Hub"];
  }
  if (trackingStatus === "Reached Destination Hub") return ["Out for Delivery"];
  if (trackingStatus === "Out for Delivery") return ["Delivered"];
  return [];
}

async function addReverseTaskEvent(agentId, requestId, body = {}, actorRole = "delivery_agent") {
  if (!mongoose.isValidObjectId(requestId)) {
    throw new HttpError(400, "Choose a valid return or replacement request.");
  }
  const scanToken = String(body.scanToken || "").trim();
  if (!/^[a-f\d]{64}$/i.test(scanToken)) {
    throw new HttpError(400, "Scan the package barcode before recording an update.");
  }
  const request = await ReturnRequest.findOne({
    _id: requestId,
    scanToken,
  })
    .select("+deliveryOtpEncrypted")
    .populate("customer", "name email")
    .populate("order", "address payment currency")
    .populate("seller", "storeName");
  if (!request) {
    throw new HttpError(404, "This return or replacement label was not found.");
  }
  const eventStatus = String(body.status || "");
  const hubEvent = [
    "Arrived at Facility",
    "Left Facility",
    "Reached Destination Hub",
    "At Seller",
  ].includes(eventStatus);
  if (
    actorRole === "hub_staff"
      ? !hubEvent
      : actorRole !== "delivery_agent" || hubEvent
  ) {
    throw new HttpError(403, "This account cannot record that reverse-logistics scan.");
  }
  const clientEventId = String(body.clientEventId || "").trim();
  if (clientEventId && !isValidClientEventId(clientEventId)) {
    throw new HttpError(400, "The scan event ID is invalid.");
  }
  if (clientEventId) {
    const previous = request.trackingEvents.find(
      (event) => event.clientEventId === clientEventId,
    );
    if (previous) {
      if (previous.status !== eventStatus) {
        throw new HttpError(409, "This scan event ID was already used.");
      }
      return serializeReverseTask(request);
    }
  }
  if (!reverseNextStatuses(request).includes(eventStatus)) {
    throw new HttpError(409, "This return or replacement cannot move to that status yet.");
  }
  if (request.type === "Return" && ["Out for Delivery", "Delivered"].includes(eventStatus)) {
    throw new HttpError(409, "A return shipment must be received by the seller, not delivered to the customer.");
  }
  if (request.type === "Replacement" && eventStatus === "At Seller") {
    throw new HttpError(409, "A replacement shipment cannot be received by the seller.");
  }
  if (actorRole === "delivery_agent") {
    const assignedId = objectIdString(request.assignedDeliveryAgent);
    if (assignedId && assignedId !== agentId.toString()) {
      throw new HttpError(409, "This reverse shipment is assigned to another delivery partner.");
    }
    if (eventStatus !== "Picked Up" && !assignedId) {
      throw new HttpError(409, "Pick up and claim this reverse shipment before advancing it.");
    }
    if (!assignedId) request.assignedDeliveryAgent = agentId;
  }

  const location = validateLocation(body.location);
  if (!location) {
    throw new HttpError(
      400,
      "Enable location access to record every shipment update.",
    );
  }
  const now = new Date();
  if (eventStatus === "Out for Delivery") {
    const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    request.deliveryOtpEncrypted = encryptValue(otp);
    request.deliveryOtpExpiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    request.deliveryOtpUsedAt = null;
    request.deliveryOtpFailures = 0;
  }
  if (eventStatus === "Delivered") {
    if (
      !request.deliveryOtpEncrypted ||
      !request.deliveryOtpExpiresAt ||
      request.deliveryOtpExpiresAt < now ||
      request.deliveryOtpUsedAt
    ) {
      throw new HttpError(409, "The replacement delivery OTP is missing, expired, or already used.");
    }
    if ((request.deliveryOtpFailures || 0) >= MAX_OTP_FAILURES) {
      throw new HttpError(429, "Too many incorrect OTP attempts. Contact delivery support.");
    }
    if (!compareOtp(body.otp, request.deliveryOtpEncrypted)) {
      request.deliveryOtpFailures = (request.deliveryOtpFailures || 0) + 1;
      await request.save();
      throw new HttpError(400, "The replacement delivery OTP is incorrect.");
    }
    request.deliveryOtpUsedAt = now;
    request.status = "Completed";
  } else if (eventStatus === "At Seller") {
    request.status = "In transit";
  }

  request.trackingStatus = eventStatus;
  request.trackingEvents.push({
    status: eventStatus,
    source: actorRole,
    clientEventId,
    occurredAt: now,
    note: String(body.note || "").trim().slice(0, 300),
    location: location || undefined,
  });
  await request.save();
  return {
    ...serializeReverseTask(request),
    deliveryOtpIssued: eventStatus === "Out for Delivery",
  };
}

async function addHubReverseTaskEvent(agentId, requestId, body = {}) {
  return addReverseTaskEvent(agentId, requestId, body, "hub_staff");
}

module.exports = {
  EVENT_NEXT,
  HUB_EVENT_STATUSES,
  canTransition,
  isValidClientEventId,
  findRecordedEvent,
  ATTEMPT_REASONS,
  MAX_DELIVERY_ATTEMPTS,
  MAX_OTP_FAILURES,
  allocateCodAmount,
  publicAgent,
  isValidPassword,
  login,
  changePassword,
  getApplicationInput,
  createApplication,
  createHubStaff,
  uploadApplicationFile,
  listAgents,
  getAgentApplicationReview,
  reviewAgentApplication,
  setAgentActive,
  setAgentOnline,
  listDispatchShipments,
  assignShipment,
  listTasks,
  listHubTasks,
  addTaskEvent,
  addHubTaskEvent,
  reverseNextStatuses,
  addReverseTaskEvent,
  addHubReverseTaskEvent,
  expectedCodAmount,
};
