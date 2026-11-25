const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Hub = require("../tracking/models/Hub");
const DeliveryAgent = require("./models/DeliveryAgent");
const HttpError = require("../../utils/HttpError");
const { getCountry } = require("../market/countries");
const { HUB_TYPE } = require("../tracking/constants");
const verificationStorage = require("../seller/verificationStorage");
const { decryptValue } = require("../../utils/encryption");

function isValidPassword(password) {
  return typeof password === "string" && password.length >= 10 && password.length <= 128;
}

function normalizePickupPincodes(value) {
  const pincodes = (Array.isArray(value) ? value : String(value || "").split(/[,|\n\r]+/))
    .map((entry) => String(entry || "").trim().toUpperCase())
    .filter(Boolean);
  const unique = [...new Set(pincodes)];
  if (!unique.length || unique.length > 100 || unique.some((pincode) => pincode.length > 24)) {
    throw new HttpError(400, "Add between 1 and 100 valid pickup postal codes.");
  }
  return unique;
}

function getHubApplicationInput(body = {}) {
  const code = String(body.code || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  const city = String(body.city || "").trim();
  const district = String(body.district || "").trim();
  const state = String(body.state || "").trim();
  const country = getCountry(body.country);
  const address = String(body.address || "").trim();
  const postalCode = String(body.postalCode || "").trim().toUpperCase();
  const inChargeName = String(body.inChargeName || "").trim();
  const inChargeEmail = String(body.inChargeEmail || "").trim().toLowerCase();
  const inChargePhone = String(body.inChargePhone || "").trim();
  const password = String(body.password || "");
  const pickupPincodes = normalizePickupPincodes(body.pickupPincodes);

  if (!/^[A-Z0-9][A-Z0-9-]{1,23}$/.test(code)) {
    throw new HttpError(400, "Enter a hub code using 2–24 letters, numbers, or hyphens.");
  }
  if (name.length < 2 || name.length > 120 || city.length < 2 || city.length > 80) {
    throw new HttpError(400, "Enter a valid hub name and city.");
  }
  if (!district || district.length > 80 || !state || state.length > 80 || !country) {
    throw new HttpError(400, "Choose a country, state, and district for this hub.");
  }
  if (address.length < 8 || address.length > 500) {
    throw new HttpError(400, "Enter the complete hub address.");
  }
  if (postalCode.length < 2 || postalCode.length > 24) {
    throw new HttpError(400, "Enter a valid hub postal code.");
  }
  if (inChargeName.length < 2 || inChargeName.length > 100) {
    throw new HttpError(400, "Enter the hub in-charge's full name.");
  }
  if (!/^\S+@\S+\.\S+$/.test(inChargeEmail) || inChargeEmail.length > 254) {
    throw new HttpError(400, "Enter a valid in-charge email address.");
  }
  if (!/^[+\d][\d\s().-]{6,23}$/.test(inChargePhone)) {
    throw new HttpError(400, "Enter a valid in-charge phone number.");
  }
  if (!isValidPassword(password)) {
    throw new HttpError(400, "Passwords must be 10–128 characters long.");
  }

  return {
    code,
    name,
    city,
    district,
    state,
    country: country.code,
    address,
    postalCode,
    pickupPincodes,
    inChargeName,
    inChargeEmail,
    inChargePhone,
    password,
  };
}

function serializeHub(hub, { includeContacts = true } = {}) {
  const result = {
    id: hub._id.toString(),
    code: hub.code,
    name: hub.name,
    city: hub.city,
    district: hub.district || "",
    state: hub.state,
    country: hub.country || "",
    address: hub.address || "",
    postalCode: hub.postalCode || "",
    pickupPincodes: hub.pickupPincodes || [],
    servedPincodes: hub.servedPincodes || [],
    hubType: hub.hubType,
    applicationStatus: hub.applicationStatus || "Approved",
    isActive: hub.isActive !== false,
    createdAt: hub.createdAt || null,
    updatedAt: hub.updatedAt || null,
  };
  if (includeContacts) {
    result.inCharge = {
      name: hub.inChargeName || "",
      email: hub.inChargeEmail || "",
      phone: hub.inChargePhone || "",
    };
  }
  return result;
}

async function createHubApplication(body = {}) {
  const input = getHubApplicationInput(body);
  let hub;
  try {
    hub = await Hub.create({
      code: input.code,
      name: input.name,
      city: input.city,
      district: input.district,
      state: input.state,
      country: input.country,
      address: input.address,
      postalCode: input.postalCode,
      pickupPincodes: input.pickupPincodes,
      inChargeName: input.inChargeName,
      inChargeEmail: input.inChargeEmail,
      inChargePhone: input.inChargePhone,
      hubType: HUB_TYPE.PICKUP,
      applicationStatus: "Pending",
      isActive: false,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(409, "That hub code is already registered.");
    }
    throw error;
  }

  try {
    await DeliveryAgent.create({
      name: input.inChargeName,
      email: input.inChargeEmail,
      phone: input.inChargePhone,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: "hub_staff",
      hub: hub._id,
      isActive: false,
      applicationStatus: "Pending",
      address: input.address,
      country: input.country,
      state: input.state,
      district: input.district,
      postalCode: input.postalCode,
    });
  } catch (error) {
    await Hub.deleteOne({ _id: hub._id });
    if (error.code === 11000) {
      throw new HttpError(409, "An account with this in-charge email already exists.");
    }
    throw error;
  }

  return {
    hub: serializeHub(hub),
    message: "Hub registration submitted. Sign-in will be available after admin approval.",
  };
}

async function listHubs({ country, status } = {}) {
  const filter = {};
  if (country) filter.country = country;
  if (["Pending", "Approved", "Rejected"].includes(status)) {
    filter.applicationStatus = status;
  }
  const hubs = await Hub.find(filter).sort({ city: 1, name: 1 }).lean();
  return hubs.map((hub) => serializeHub(hub));
}

async function getHubDetails(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, "Hub not found.");
  }
  const hub = await Hub.findById(id).lean();
  if (!hub) throw new HttpError(404, "Hub not found.");

  const agents = await DeliveryAgent.find({ hub: hub._id, role: "hub_staff" })
    .select(
      [
        "name",
        "email",
        "phone",
        "role",
        "isActive",
        "isOnline",
        "applicationStatus",
        "address",
        "country",
        "state",
        "district",
        "postalCode",
        "identityDocumentType",
        "applicationSubmittedAt",
        "interviewAt",
        "interviewNote",
        "reviewedAt",
        "reviewedBy",
        "reviewNote",
        "createdAt",
        "updatedAt",
        "+profilePhotoKey",
        "+identityDocumentKey",
        "+identityDocumentNumberEncrypted",
      ].join(" "),
    )
    .lean();

  const staff = await Promise.all(
    agents.map(async (agent) => {
      const [photoUrl, documentUrl] = await Promise.all([
        agent.profilePhotoKey
          ? verificationStorage.createReviewUrl(agent.profilePhotoKey)
          : "",
        agent.identityDocumentKey
          ? verificationStorage.createReviewUrl(agent.identityDocumentKey)
          : "",
      ]);
      return {
        id: agent._id.toString(),
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        role: agent.role,
        isActive: Boolean(agent.isActive),
        isOnline: Boolean(agent.isOnline),
        applicationStatus: agent.applicationStatus || "",
        address: agent.address || "",
        country: agent.country || "",
        state: agent.state || "",
        district: agent.district || "",
        postalCode: agent.postalCode || "",
        documentType: agent.identityDocumentType || "",
        documentNumber: decryptValue(agent.identityDocumentNumberEncrypted),
        applicationSubmittedAt: agent.applicationSubmittedAt || null,
        interviewAt: agent.interviewAt || null,
        interviewNote: agent.interviewNote || "",
        reviewedAt: agent.reviewedAt || null,
        reviewedBy: agent.reviewedBy || "",
        reviewNote: agent.reviewNote || "",
        photoUrl,
        documentUrl,
        createdAt: agent.createdAt || null,
        updatedAt: agent.updatedAt || null,
      };
    }),
  );
  return { hub: serializeHub(hub), staff };
}

async function listSellerHubs(country) {
  const hubs = await Hub.find({
    country,
    applicationStatus: "Approved",
    isActive: true,
  })
    .sort({ city: 1, name: 1 })
    .lean();
  return { hubs: hubs.map((hub) => serializeHub(hub)) };
}

async function findPickupHub(country, postalCode) {
  const normalizedPostalCode = String(postalCode || "").trim().toUpperCase();
  if (!normalizedPostalCode) {
    throw new HttpError(409, "Add your store pickup postal code before packing orders.");
  }
  const hub = await Hub.findOne({
    country,
    applicationStatus: "Approved",
    isActive: true,
    hubType: HUB_TYPE.PICKUP,
    pickupPincodes: normalizedPostalCode,
  })
    .sort({ code: 1 })
    .lean();
  if (!hub) {
    throw new HttpError(
      409,
      `No approved pickup hub serves postal code ${normalizedPostalCode}. Contact admin to add hub coverage.`,
    );
  }
  return hub;
}

async function reviewHubApplication(id, status) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, "Hub application not found.");
  }
  if (!["Approved", "Rejected"].includes(status)) {
    throw new HttpError(400, "Choose Approved or Rejected.");
  }
  const hub = await Hub.findOne({ _id: id, applicationStatus: "Pending" });
  if (!hub) throw new HttpError(404, "Pending hub application not found.");
  const agent = await DeliveryAgent.findOne({ hub: hub._id, role: "hub_staff" });
  if (!agent) throw new HttpError(409, "The hub in-charge account is missing.");

  const approved = status === "Approved";
  agent.isActive = approved;
  agent.applicationStatus = status;
  agent.authVersion = (agent.authVersion || 0) + 1;
  await agent.save();
  hub.applicationStatus = status;
  hub.isActive = approved;
  await hub.save();
  return serializeHub(hub);
}

module.exports = {
  getHubApplicationInput,
  createHubApplication,
  listHubs,
  getHubDetails,
  listSellerHubs,
  findPickupHub,
  reviewHubApplication,
  serializeHub,
};
