const crypto = require("crypto");

/*
 * Authenticated symmetric encryption for the few profile fields that must
 * never sit in the database in plain text (for example KYC document numbers).
 * AES-256-GCM keeps the value confidential and tamper evident.
 */

let cachedKey = null;
let cachedSecret = "";

function getKey(secret) {
  const source = secret || process.env.JWT_SECRET || "";
  if (!source) {
    throw new Error("A secret is required to protect profile data.");
  }
  if (cachedKey && cachedSecret === source) {
    return cachedKey;
  }
  cachedKey = crypto.createHash("sha256").update(source).digest();
  cachedSecret = source;
  return cachedKey;
}

function encryptValue(value, secret) {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  const key = getKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

function decryptValue(payload, secret) {
  if (!payload) {
    return "";
  }
  const parts = String(payload).split(".");
  if (parts.length !== 3) {
    return "";
  }
  try {
    const key = getKey(secret);
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(parts[0], "base64"),
    );
    decipher.setAuthTag(Buffer.from(parts[1], "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(parts[2], "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "";
  }
}

/* Non-reversible hash, used to block duplicate cards without keeping the PAN. */
function fingerprintValue(value, secret) {
  if (!value) {
    return "";
  }
  return crypto
    .createHmac("sha256", getKey(secret))
    .update(String(value))
    .digest("hex");
}

module.exports = { encryptValue, decryptValue, fingerprintValue };
