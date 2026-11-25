const { mock, test } = require("node:test");
const assert = require("node:assert/strict");
const deliveryService = require("../src/modules/delivery/service");
const DeliveryAgent = require("../src/modules/delivery/models/DeliveryAgent");
const { requireStaffRole } = require("../src/modules/delivery/auth/requireDeliveryAgent");

test("delivery tracking follows the parcel's forward-only scan sequence", () => {
  const stages = [
    "Ready for Pickup",
    "Picked Up",
    "Arrived at Origin Hub",
    "In Transit",
    "Reached Destination Hub",
    "Out for Delivery",
    "Delivered",
  ];

  for (let index = 0; index < stages.length - 1; index += 1) {
    assert.equal(
      deliveryService.canTransition(stages[index], stages[index + 1]),
      true,
    );
  }
  assert.equal(deliveryService.canTransition("Packed", "Picked Up"), true);
  assert.equal(
    deliveryService.canTransition("Ready for Pickup", "Delivered"),
    false,
  );
  assert.equal(
    deliveryService.canTransition("Delivered", "Out for Delivery"),
    false,
  );
  assert.equal(
    deliveryService.canTransition("Delivery Attempted", "RTO Initiated"),
    true,
  );
  assert.equal(deliveryService.canTransition("Left Facility", "Arrived at Facility"), true);
  assert.equal(deliveryService.canTransition("Left Facility", "Reached Destination Hub"), true);
});

test("hub staff and delivery agents have distinct permissions", () => {
  assert.deepEqual(DeliveryAgent.schema.path("role").enumValues, [
    "delivery_agent",
    "hub_staff",
  ]);
  let statusCode;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };
  requireStaffRole("hub_staff")(
    { deliveryAgent: { role: "delivery_agent" } },
    response,
    () => assert.fail("A delivery agent must not enter the hub workflow."),
  );
  assert.equal(statusCode, 403);
});

test("reverse shipments expose the correct next step for returns and replacements", () => {
  assert.deepEqual(
    deliveryService.reverseNextStatuses({
      trackingStatus: "Ready for Pickup",
      type: "Return",
    }),
    ["Picked Up"],
  );
  assert.deepEqual(
    deliveryService.reverseNextStatuses({
      trackingStatus: "Left Facility",
      type: "Return",
    }),
    ["Arrived at Facility", "At Seller"],
  );
  assert.deepEqual(
    deliveryService.reverseNextStatuses({
      trackingStatus: "Left Facility",
      type: "Replacement",
    }),
    ["Arrived at Facility", "Reached Destination Hub"],
  );
});

test("delivery accounts require valid initial credentials and cap failed attempts", () => {
  assert.equal(deliveryService.isValidPassword("long-enough-password"), true);
  assert.equal(deliveryService.isValidPassword("short"), false);
  assert.equal(deliveryService.isValidPassword("x".repeat(129)), false);
  assert.equal(deliveryService.MAX_DELIVERY_ATTEMPTS, 3);
  assert.equal(deliveryService.MAX_OTP_FAILURES, 5);
  assert.deepEqual(deliveryService.ATTEMPT_REASONS, [
    "Customer unavailable",
    "Address issue",
    "Customer refused",
    "Phone unreachable",
  ]);
});

test("offline scan IDs are UUIDs and retries cannot change the recorded status", () => {
  const clientEventId = "d9428888-122b-4f91-b09c-3a0d4b8a5737";
  assert.equal(deliveryService.isValidClientEventId(clientEventId), true);
  assert.equal(deliveryService.isValidClientEventId("not-a-uuid"), false);
  assert.equal(
    deliveryService.findRecordedEvent(
      [{ clientEventId, status: "Picked Up" }],
      clientEventId,
      "Picked Up",
    ).status,
    "Picked Up",
  );
  assert.throws(
    () =>
      deliveryService.findRecordedEvent(
        [{ clientEventId, status: "Picked Up" }],
        clientEventId,
        "Delivered",
      ),
    { statusCode: 409 },
  );
});

test("delivery agent profiles include their persisted availability", () => {
  assert.equal(
    deliveryService.publicAgent({
      _id: { toString: () => "agent-id" },
      name: "Rohan",
      email: "rohan@example.com",
      phone: "9876543210",
      isOnline: true,
    }).isOnline,
    true,
  );
});

test("delivery applications validate location, country-specific ID and contact details", () => {
  const application = deliveryService.getApplicationInput({
    name: "  Rohan Kumar ",
    email: " ROHAN@example.com ",
    phone: "+91 9876543210",
    password: "a-secure-password",
    address: "12 Main Road, Sector 5",
    country: "in",
    state: "Delhi",
    district: "New Delhi",
    postalCode: "110001",
    documentType: "Aadhaar card",
    documentNumber: "1234-5678-9012",
  });

  assert.equal(application.name, "Rohan Kumar");
  assert.equal(application.email, "rohan@example.com");
  assert.equal(application.country, "IN");
  assert.equal(application.documentType, "Aadhaar card");
  assert.throws(
    () =>
      deliveryService.getApplicationInput({
        name: "Rohan Kumar",
        email: "rohan@example.com",
        phone: "9876543210",
        password: "a-secure-password",
        address: "12 Main Road, Sector 5",
        country: "IN",
        state: "Delhi",
        district: "New Delhi",
        postalCode: "110001",
        documentType: "US passport",
        documentNumber: "document-number",
      }),
    { statusCode: 400 },
  );
  assert.throws(
    () =>
      deliveryService.getApplicationInput({
        name: "Rohan Kumar",
        email: "rohan@example.com",
        phone: "9876543210",
        password: "a-secure-password",
        address: "12 Main Road, Sector 5",
        country: "IN",
        district: "New Delhi",
        postalCode: "110001",
        documentType: "Aadhaar card",
        documentNumber: "1234-5678-9012",
      }),
    { statusCode: 400 },
  );
});

test("delivery applications stay inactive until administrator approval", () => {
  assert.equal(DeliveryAgent.schema.path("applicationStatus").options.index, true);
  assert.deepEqual(
    DeliveryAgent.schema.path("applicationStatus").enumValues,
    ["Incomplete", "Pending", "Interview", "Approved", "Rejected"],
  );
  assert.equal(DeliveryAgent.schema.path("profilePhotoKey").options.select, false);
  assert.equal(DeliveryAgent.schema.path("identityDocumentKey").options.select, false);
  assert.equal(
    DeliveryAgent.schema.path("identityDocumentNumberEncrypted").options.select,
    false,
  );
});

test("delivery applications cannot be approved before an interview", async () => {
  const agent = {
    _id: "507f1f77bcf86cd799439011",
    name: "Rohan Kumar",
    email: "rohan@example.com",
    phone: "+91 9876543210",
    applicationStatus: "Pending",
    applicationSubmittedAt: new Date(),
    profilePhotoKey: "photo-key",
    identityDocumentKey: "document-key",
    isActive: false,
    isOnline: false,
    authVersion: 0,
    save: async () => {},
  };
  mock.method(DeliveryAgent, "findById", () => ({
    select: async () => agent,
  }));

  try {
    await assert.rejects(
      deliveryService.reviewAgentApplication(
        agent._id,
        { status: "Approved" },
        "admin@example.com",
      ),
      { statusCode: 409, message: /interview/i },
    );

    agent.applicationStatus = "Interview";
    agent.interviewAt = new Date(Date.now() + 60_000);
    await assert.rejects(
      deliveryService.reviewAgentApplication(
        agent._id,
        { status: "Approved", interviewAt: agent.interviewAt.toISOString() },
        "admin@example.com",
      ),
      { statusCode: 409, message: /must take place/i },
    );

    agent.interviewAt = new Date(Date.now() - 60_000);
    const approved = await deliveryService.reviewAgentApplication(
      agent._id,
      { status: "Approved", interviewAt: agent.interviewAt.toISOString() },
      "admin@example.com",
    );
    assert.equal(approved.applicationStatus, "Approved");
    assert.equal(approved.isActive, true);
  } finally {
    mock.restoreAll();
  }
});

test("COD amounts allocate every cent across seller packages without over-collecting", () => {
  const packages = [
    { sellerId: "seller-a", netAmount: 1 },
    { sellerId: "seller-b", netAmount: 1 },
  ];

  const first = deliveryService.allocateCodAmount(3.03, packages, "seller-a");
  const second = deliveryService.allocateCodAmount(3.03, packages, "seller-b");

  assert.equal(Math.round((first + second) * 100) / 100, 3.03);
  assert.equal(
    deliveryService.allocateCodAmount(3.03, packages, "missing"),
    null,
  );
});
