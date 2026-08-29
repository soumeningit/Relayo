import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoute from "./routes/auth";
import inviteRoute from "./routes/invite";
import profileRoute from "./routes/profile";
import orgRoute from "./routes/org";
import apiKeyRoute from "./routes/apiKey";
import destinationRoute from "./routes/destination";
import eventRoute from "./routes/event";
import eventsRoute from "./routes/events";
import deliveryRoute from "./routes/delivery";
import dashboardRoute from "./routes/dashboard";
import demoRoute from "./routes/demo";
import webhookRoute from "./routes/webhook";

import { errorHandler } from "./middlewares/errorHandler";
import {
  connectRedis,
  disconnectRedis,
  closeQueues,
  extractIdentity,
  rateLimit,
} from "@repo/rate-limiter";

const app = express();

const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === "production";
// Set RATE_LIMIT_ENABLED=false to run the API WITHOUT any rate limiting
// (useful for measuring the unthrottled baseline before applying limits).
const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== "false";

const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];

// Webhooks need the raw request body for HMAC verification, so they are
// mounted BEFORE the global express.json() parser.
app.use("/webhooks", webhookRoute);

app.use(express.json());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Rate limiter - add BEFORE routes
app.use(extractIdentity);
app.use(
  rateLimit({
    auditDenied: true,
    skip: (req) =>
      req.method === "OPTIONS" ||
      req.path === "/health" ||
      req.path === "/" ||
      req.path.startsWith("/webhooks"),
  }),
);

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/invite", inviteRoute);
app.use("/api/v1/profile", profileRoute);
app.use("/api/v1/org/:identifier/keys", apiKeyRoute);
app.use("/api/v1/org/:identifier/destinations", destinationRoute);
app.use("/api/v1/org", orgRoute);
app.use("/api/v1/event", eventRoute);
app.use("/api/v1/events", eventsRoute);
app.use("/api/v1/delivery", deliveryRoute);
app.use("/api/v1/dashboard", dashboardRoute);
app.use("/api/v1/demo", demoRoute);

app.get("/", (_req, res) => {
  res.send("Hello, World!");
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    message: "Server is running smoothly.",
    rateLimiter: app.get("rateLimiterActive") ? "active" : "degraded",
  });
});

// Error handler must come AFTER all routes
app.use(errorHandler);

// Rate limiter state: flipped to true once Redis is confirmed reachable.
// The middleware fails open while this is false (degraded mode).
app.set("rateLimiterActive", false);

// Startup with Redis (smart mode):
//   production → fail fast, exit if Redis is unreachable
//   otherwise  → warn and run without rate limiting (fail-open middleware)
async function start() {
  try {
    await connectRedis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD || undefined,
    });
    if (RATE_LIMIT_ENABLED) {
      app.set("rateLimiterActive", true);
      console.log("[startup] Redis connected — rate limiting active");
    } else {
      app.set("rateLimiterActive", false);
      console.log(
        "[startup] RATE_LIMIT_ENABLED=false — request throttling is OFF",
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (IS_PROD) {
      console.error(
        `[startup] FATAL: Redis unavailable in production (${message}). Exiting.`,
      );
      process.exit(1);
    }
    console.warn(
      `[startup] WARNING: Redis unavailable (${message}) — starting WITHOUT rate limiting. It will resume automatically once Redis is reachable.`,
    );
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Graceful shutdown
async function shutdown() {
  try {
    await closeQueues();
    await disconnectRedis();
  } catch (error) {
    console.error("[shutdown] error while closing connections:", error);
  } finally {
    process.exit(0);
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
