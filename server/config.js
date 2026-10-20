require("dotenv").config();

const isProd = process.env.NODE_ENV === "production";

function required(name, devFallback) {
  const value = process.env[name] || devFallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (isProd && value === devFallback && devFallback) {
    throw new Error(`${name} must be set to a real value in production`);
  }
  return value;
}

const config = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cricscore",
  jwtSecret: required("JWT_SECRET", isProd ? null : "dev-only-secret-change-me"),
  jwtExpiry: process.env.JWT_EXPIRY || "7d",
  corsOrigins: (
    process.env.CORS_ORIGINS ||
    "http://localhost:5173,http://localhost:3000,http://localhost:5000"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

module.exports = config;
