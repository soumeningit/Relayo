// packages/rate-limiter/src/workers/index.ts
import { Worker } from "bullmq";
import { configSyncWorker } from "./config-sync.worker.js";
import { auditLogWorker } from "./audit-log.worker.js";
import { cleanupWorker } from "./cleanup.worker.js";
import { scheduleCleanupDaily } from "../queues/index.js";

const workers: Worker[] = [];

export function startWorkers(): void {
  workers.push(configSyncWorker.create());
  workers.push(auditLogWorker.create());
  workers.push(cleanupWorker.create());

  // Idempotent repeatable daily cleanup (03:00)
  scheduleCleanupDaily().catch(console.error);

  console.log("[rate-limiter] Workers started");
}

export async function stopWorkers(): Promise<void> {
  await auditLogWorker.flush();
  for (const worker of workers) {
    await worker.close();
  }
  workers.length = 0;
  console.log("[rate-limiter] Workers stopped");
}
