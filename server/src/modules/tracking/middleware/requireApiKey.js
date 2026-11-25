const crypto = require("crypto");
const HttpError = require("../../../utils/HttpError");

/** Constant-time comparison so the key cannot be guessed one byte at a time. */
function matches(provided, expected) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * Guards the staff-only tracking endpoints (parcel scans and the last-mile
 * delivery actions). The key is read from `STAFF_API_KEY` and must be sent by
 * the client in the `x-api-key` header.
 */
function requireApiKey(req, _res, next) {
  const expected = req.app.locals.staffApiKey;
  if (!expected) {
    return next(
      new HttpError(
        503,
        "Staff API access is not configured. Set STAFF_API_KEY in server/.env.",
      ),
    );
  }
  const provided = req.get("x-api-key");
  if (!provided || !matches(provided, expected)) {
    return next(new HttpError(401, "A valid x-api-key header is required."));
  }
  return next();
}

module.exports = requireApiKey;
