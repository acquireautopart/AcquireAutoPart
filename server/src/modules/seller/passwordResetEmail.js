const { Resend } = require("resend");
const HttpError = require("../../utils/HttpError");

function getResendConfig(config = {}) {
  const resend = config.resend;
  if (!resend?.apiKey || !resend.from) {
    throw new HttpError(
      503,
      "Seller password reset email is not configured. Set RESEND_API_KEY and RESEND_FROM to a verified sender in server/.env, then restart the API.",
    );
  }
  return resend;
}

async function sendPasswordResetEmail({ config, email, resetUrl }) {
  const resendConfig = getResendConfig(config);
  const resend = new Resend(resendConfig.apiKey);
  const { error } = await resend.emails.send({
    from: resendConfig.from,
    to: [email],
    subject: "Reset your AcquireAuto seller password",
    text: `Use this link to reset your seller password. It expires in 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Use the link below to reset your AcquireAuto seller password. It expires in 30 minutes.</p><p><a href="${resetUrl}">Reset seller password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
  if (error) {
    if ([400, 403, 422].includes(error.statusCode)) {
      throw new HttpError(
        503,
        "Resend rejected this email. Verify a sending domain in Resend, use an address from that domain in RESEND_FROM, and confirm the recipient is allowed by your Resend account.",
      );
    }
    if (error.statusCode === 401) {
      throw new HttpError(
        503,
        "Resend rejected RESEND_API_KEY. Create a valid Resend API key, update server/.env, and restart the API.",
      );
    }
    if (error.statusCode === 429) {
      throw new HttpError(
        503,
        "Resend is rate-limiting email delivery. Please wait a few minutes and try again.",
      );
    }
    throw new Error(`Resend email delivery failed: ${error.message}`);
  }
}

module.exports = { getResendConfig, sendPasswordResetEmail };
