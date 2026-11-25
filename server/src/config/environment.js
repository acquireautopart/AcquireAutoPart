const DEFAULT_FRONTEND_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3005",
  "http://localhost:3003",
];

function loadEnvironment(env = process.env) {
  const mongoUri = env.MONGODB_URI?.trim();
  const jwtSecret = env.JWT_SECRET;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required. Add it to server/.env.");
  }

  if (!jwtSecret || Buffer.byteLength(jwtSecret) < 32) {
    throw new Error(
      "JWT_SECRET must contain at least 32 bytes. Add it to server/.env.",
    );
  }

  if (env.NODE_ENV === "production" && !env.FRONTEND_URL?.trim()) {
    throw new Error("FRONTEND_URL is required in production.");
  }

  const trustProxyHops = env.TRUST_PROXY_HOPS
    ? Number(env.TRUST_PROXY_HOPS)
    : 0;
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error("TRUST_PROXY_HOPS must be a non-negative integer.");
  }

  const frontendOrigins = (
    env.FRONTEND_URL || DEFAULT_FRONTEND_ORIGINS.join(",")
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const s3Credentials = Boolean(
    env.AWS_ACCESS_KEY_ID || env.AWS_SECRET_ACCESS_KEY,
  );
  if (s3Credentials && !(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY)) {
    throw new Error(
      "Set both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or use an instance role.",
    );
  }

  const cloudinary = {
    cloudName: env.CLOUDINARY_CLOUD_NAME?.trim() || "",
    apiKey: env.CLOUDINARY_API_KEY?.trim() || "",
    apiSecret: env.CLOUDINARY_API_SECRET?.trim() || "",
  };
  const cloudinaryConfigured = Object.values(cloudinary).filter(Boolean).length;
  if (cloudinaryConfigured && cloudinaryConfigured !== 3) {
    throw new Error(
      "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET together in server/.env.",
    );
  }

  const resendApiKey = env.RESEND_API_KEY?.trim() || "";
  const resendFrom = env.RESEND_FROM?.trim() || "";

  return {
    mongoUri,
    jwtSecret,
    port: Number(env.PORT) || 5000,
    trustProxyHops,
    frontendOrigins,
    isProduction: env.NODE_ENV === "production",
    staffApiKey: env.STAFF_API_KEY?.trim() || "",
    s3Bucket: env.KYC_S3_BUCKET?.trim() || "",
    awsRegion: env.AWS_REGION?.trim() || "us-east-1",
    cloudinary: cloudinaryConfigured === 3 ? cloudinary : null,
    resend: resendApiKey && resendFrom
      ? {
          apiKey: resendApiKey,
          from: resendFrom,
        }
      : null,
  };
}

module.exports = { loadEnvironment };
