const rateLimit = require("express-rate-limit");

function createLimiter(limit, message) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message },
  });
}

module.exports = {
  forgotPasswordRateLimiter: createLimiter(
    5,
    "Too many password reset requests. Please try again in 15 minutes.",
  ),
  resetPasswordRateLimiter: createLimiter(
    10,
    "Too many password reset attempts. Please try again in 15 minutes.",
  ),
};
