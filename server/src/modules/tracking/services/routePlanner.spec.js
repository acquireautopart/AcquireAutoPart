const { planFromData, shortestPath, buildAdjacency } = require("./routePlanner");

/* Fixtures mirror scripts/seed-tracking.cjs without touching MongoDB. */
const HUBS = [
  {
    _id: "pkp",
    code: "DEL-PKP",
    name: "Delhi Pickup Hub",
    city: "Delhi",
    district: "New Delhi",
    state: "Delhi",
    hubType: "PICKUP",
  },
  {
    _id: "sc",
    code: "DEL-SC",
    name: "Delhi Sort Center",
    city: "Delhi",
    district: "New Delhi",
    state: "Delhi",
    hubType: "SORT_CENTER",
  },
  {
    _id: "mh",
    code: "LKO-MH",
    name: "Lucknow Mother Hub",
    city: "Lucknow",
    district: "Lucknow",
    state: "Uttar Pradesh",
    hubType: "MOTHER_HUB",
  },
  {
    _id: "gkp",
    code: "GKP-HUB",
    name: "Gorakhpur Hub",
    city: "Gorakhpur",
    district: "Gorakhpur",
    state: "Uttar Pradesh",
    hubType: "SORT_CENTER",
  },
  {
    _id: "dh",
    code: "SLP-DH",
    name: "Salempur Delivery Hub",
    city: "Salempur",
    district: "Deoria",
    state: "Uttar Pradesh",
    hubType: "DELIVERY_HUB",
    servedPincodes: ["274701"],
  },
];

const LEGS = [
  { fromHub: "pkp", toHub: "sc", mode: "TRUCK", avgHours: 3 },
  { fromHub: "sc", toHub: "mh", mode: "TRUCK", avgHours: 9 },
  { fromHub: "mh", toHub: "gkp", mode: "TRUCK", avgHours: 9 },
  { fromHub: "gkp", toHub: "dh", mode: "TRUCK", avgHours: 5 },
];

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("routePlanner.planFromData", () => {
  it("walks the seeded network from the pickup hub to the delivery hub", () => {
    const steps = planFromData({
      hubs: HUBS,
      legs: LEGS,
      originHubId: "pkp",
      deliveryHubId: "dh",
      now: NOW,
    });

    expect(steps.map((step) => step.hub.code)).toEqual([
      "DEL-PKP",
      "DEL-SC",
      "LKO-MH",
      "GKP-HUB",
      "SLP-DH",
    ]);
    expect(steps.map((step) => step.cumulativeHours)).toEqual([0, 3, 12, 21, 26]);
    expect(steps.map((step) => step.expectedArrival.toISOString())).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T03:00:00.000Z",
      "2026-01-01T12:00:00.000Z",
      "2026-01-01T21:00:00.000Z",
      "2026-01-02T02:00:00.000Z",
    ]);
  });

  it("returns the cheapest path when two routes compete", () => {
    const steps = planFromData({
      hubs: HUBS,
      legs: [
        { fromHub: "pkp", toHub: "sc", avgHours: 10 },
        { fromHub: "sc", toHub: "dh", avgHours: 1 },
        { fromHub: "pkp", toHub: "mh", avgHours: 1 },
        { fromHub: "mh", toHub: "dh", avgHours: 1 },
      ],
      originHubId: "pkp",
      deliveryHubId: "dh",
      now: NOW,
    });

    expect(steps.map((step) => step.hub.code)).toEqual([
      "DEL-PKP",
      "LKO-MH",
      "SLP-DH",
    ]);
    expect(steps[steps.length - 1].cumulativeHours).toBe(2);
  });

  it("returns null when the delivery hub cannot be reached", () => {
    expect(
      planFromData({
        hubs: HUBS,
        legs: LEGS,
        originHubId: "dh",
        deliveryHubId: "pkp",
        now: NOW,
      }),
    ).toBeNull();
  });

  it("throws a clear error when a leg points at a missing hub", () => {
    expect(() =>
      planFromData({
        hubs: HUBS,
        legs: [{ fromHub: "pkp", toHub: "ghost", avgHours: 4 }],
        originHubId: "pkp",
        deliveryHubId: "ghost",
        now: NOW,
      }),
    ).toThrow(/ghost/);
  });
});

describe("routePlanner.shortestPath", () => {
  it("returns a single hub when origin and destination match", () => {
    const result = shortestPath(buildAdjacency(LEGS), "pkp", "pkp");
    expect(result.path).toEqual(["pkp"]);
    expect(result.hours.get("pkp")).toBe(0);
  });

  it("returns null when the destination has no incoming leg", () => {
    expect(shortestPath(buildAdjacency(LEGS), "dh", "pkp")).toBeNull();
  });

  it("accepts ObjectId-like values", () => {
    const objectIdLike = { toString: () => "pkp" };
    const result = shortestPath(buildAdjacency(LEGS), objectIdLike, "sc");
    expect(result.path).toEqual(["pkp", "sc"]);
    expect(result.hours.get("sc")).toBe(3);
  });
});

describe("routePlanner.buildAdjacency", () => {
  it("skips legs without both hubs or with an unusable duration", () => {
    const adjacency = buildAdjacency([
      { fromHub: null, toHub: "sc", avgHours: 4 },
      { fromHub: "pkp", toHub: null, avgHours: 4 },
      { fromHub: "pkp", toHub: "sc", avgHours: "not-a-number" },
      { fromHub: "pkp", toHub: "sc", avgHours: -1 },
    ]);

    expect(adjacency.size).toBe(0);
  });
});
