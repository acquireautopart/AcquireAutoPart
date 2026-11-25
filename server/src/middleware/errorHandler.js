const HttpError = require("../utils/HttpError");

function errorHandler(error, _req, res, _next) {
  if (error.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ success: false, message: "Request body must contain valid JSON." });
  }
  if (error.type === "entity.too.large") {
    return res
      .status(413)
      .json({ success: false, message: "Request body is too large." });
  }

  if (
    error.message === "This origin is not allowed to access the customer API."
  ) {
    return res.status(403).json({ success: false, message: error.message });
  }

  if (error instanceof HttpError) {
    return res
      .status(error.statusCode)
      .json({ success: false, message: error.message });
  }

  /* Mongoose schema validation — surface the first field error. */
  if (error.name === "ValidationError" && error.errors) {
    const first = Object.values(error.errors)[0];
    return res.status(400).json({
      success: false,
      message: first?.message || "Some of the details are not valid.",
    });
  }

  /* Unique index violation (for example a card that already exists). */
  if (error.code === 11000) {
    if (error.keyPattern?.sku || error.keyValue?.sku) {
      return res.status(409).json({
        success: false,
        message:
          "That SKU is already used by one of your products. Enter a unique SKU.",
      });
    }
    return res.status(409).json({
      success: false,
      message: "That record already exists in your account.",
    });
  }

  /* Malformed identifier in the URL. */
  if (error.name === "CastError") {
    return res
      .status(400)
      .json({ success: false, message: "That identifier is not valid." });
  }

  console.error("Customer API error:", error);
  return res
    .status(500)
    .json({ success: false, message: "An unexpected server error occurred." });
}

module.exports = errorHandler;
