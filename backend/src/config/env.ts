import "dotenv/config";

const port = Number(process.env.PORT || 3003);

if (!Number.isFinite(port)) {
  throw new Error("PORT must be a valid number");
}

export const env = {
  port,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "moviebox-local-development-secret",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:8081",
};
