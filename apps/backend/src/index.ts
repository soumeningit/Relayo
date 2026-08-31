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
import docsRoute from "./routes/docs";
import contactRoute from "./routes/contact";
import demoRoute from "./routes/demo";
import webhookRoute from "./routes/webhook";
import adminAuthRoute from "./routes/adminAuth";
import adminRoute from "./routes/admin";

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
const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== "false";

const DEFAULT_CORS_ORIGINS = ["http://localhost:5173", "http://localhost:5174"];
const configuredOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins =
  configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_CORS_ORIGINS;

// Background workers boot control:
//   1/true  → boot the delivery worker in-process
//   0/false → never boot it
//   unset   → boot in production, skip in dev (dev uses `pnpm dev:all`)
const RUN_WORKERS = process.env.RUN_WORKERS;
function shouldBootWorkers(): boolean {
  if (RUN_WORKERS !== undefined && RUN_WORKERS !== "") {
    return RUN_WORKERS === "1" || RUN_WORKERS.toLowerCase() === "true";
  }
  return IS_PROD;
}

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
app.use("/api/v1/docs", docsRoute);
app.use("/api/v1/contact", contactRoute);
app.use("/api/v1/demo", demoRoute);
app.use("/api/v1/admin/auth", adminAuthRoute);
app.use("/api/v1/admin", adminRoute);

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
//   production → retry a few times, then run in degraded mode (rate limiting
//                off) rather than crash-looping. Valkey on Render needs a
//                moment to warm up after the service starts.
//   otherwise  → warn and run without rate limiting (fail-open middleware)
let deliveryWorker: { close: () => Promise<void> } | null = null;

async function start() {
  const MAX_REDIS_RETRIES = 3;
  const REDIS_RETRY_DELAY_MS = 3000;
  let redisConnected = false;

  for (let attempt = 1; attempt <= MAX_REDIS_RETRIES; attempt++) {
    try {
      await connectRedis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD || undefined,
      });
      redisConnected = true;
      break;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[startup] Redis attempt ${attempt}/${MAX_REDIS_RETRIES} failed: ${message}`,
      );
      if (attempt < MAX_REDIS_RETRIES) {
        await new Promise((r) => setTimeout(r, REDIS_RETRY_DELAY_MS));
      }
    }
  }

  if (redisConnected && RATE_LIMIT_ENABLED) {
    app.set("rateLimiterActive", true);
    console.log("[startup] Redis connected — rate limiting active");
  } else if (redisConnected) {
    app.set("rateLimiterActive", false);
    console.log(
      "[startup] RATE_LIMIT_ENABLED=false — request throttling is OFF",
    );
  } else {
    app.set("rateLimiterActive", false);
    console.warn(
      "[startup] Redis unavailable after retries — running WITHOUT rate limiting (degraded mode)",
    );
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  if (shouldBootWorkers()) {
    const { deliveryWorker: worker } = await import("./workers/deliveryWorker");
    deliveryWorker = worker;
    console.log("[startup] Delivery worker active (in-process)");
  } else {
    console.log(
      `[startup] Delivery worker NOT booting (RUN_WORKERS=${RUN_WORKERS || "unset"}, NODE_ENV=${process.env.NODE_ENV || "unset"})`,
    );
  }
}

// Graceful shutdown
async function shutdown() {
  try {
    await deliveryWorker?.close();
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
