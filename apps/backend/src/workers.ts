// apps/backend/src/workers.ts
// Dedicated process for background workers (rate-limiter + delivery).
// Run with: pnpm --filter backend dev:all  (or dev:workers)
import "dotenv/config";
import { prisma } from "@repo/db";
import {
  connectRedis,
  disconnectRedis,
  closeQueues,
} from "@repo/rate-limiter";
import {
  startWorkers,
  stopWorkers,
} from "@repo/rate-limiter/workers";
import "./workers/deliveryWorker";

async function start() {
  await connectRedis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
  });

  startWorkers();
}

async function shutdown() {
  try {
    await stopWorkers();
    await closeQueues();
    await disconnectRedis();
    await prisma.$disconnect();
  } catch (error) {
    console.error("[workers] error during shutdown:", error);
  } finally {
    process.exit(0);
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start().catch((err) => {
  console.error("Failed to start workers:", err);
  process.exit(1);
});
