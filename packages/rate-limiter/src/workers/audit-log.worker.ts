// packages/rate-limiter/src/workers/audit-log.worker.ts
import { Worker, Job } from "bullmq";
import { getBullMQConnection } from "../redis/client.js";
import { QueueName, AuditLogJobData } from "../types/index.js";
import { prisma } from "@repo/db";

const BATCH_SIZE = 100;
const BATCH_TIMEOUT = 5000;
let batch: AuditLogJobData[] = [];
let timeout: ReturnType<typeof setTimeout> | null = null;

function toRow(entry: AuditLogJobData) {
  return {
    identifier: entry.identifier,
    // "default" is a synthetic config id — never insert it or the FK breaks
    identifierType: entry.identifierType as any,
    route: entry.route,
    method: entry.method,
    allowed: entry.allowed,
    limitCount: entry.limitCount,
    remaining: entry.remaining,
    configId:
      entry.configId && entry.configId !== "default" ? entry.configId : null,
    ip: entry.ip,
    userAgent: entry.userAgent,
    timestamp: new Date(entry.timestamp),
    metadata: entry.metadata
      ? JSON.parse(JSON.stringify(entry.metadata))
      : null,
  };
}

async function processBatch(): Promise<void> {
  if (timeout) {
    clearTimeout(timeout);
    timeout = null;
  }

  if (batch.length === 0) return;

  const currentBatch = [...batch];
  batch = [];

  try {
    await prisma.auditLog.createMany({
      data: currentBatch.map(toRow),
    });
  } catch (error) {
    // Never lose audit data on a transient DB failure — push entries back
    // through the queue (BullMQ retries/backoff apply). Jobs that triggered
    // this batch are already acked; re-enqueue keeps delivery at-least-once.
    console.error(
      "[rate-limiter] audit batch write failed, re-enqueueing:",
      error,
    );
    await Promise.allSettled(currentBatch.map((entry) => enqueue(entry)));
  }
}

function enqueue(entry: AuditLogJobData): Promise<void> {
  // Lazy import avoids a circular dependency with queues/index.ts
  return import("../queues/index.js").then(({ enqueueAuditLog }) =>
    enqueueAuditLog(entry),
  );
}

function createWorker(): Worker<AuditLogJobData> {
  return new Worker<AuditLogJobData>(
    QueueName.AUDIT_LOG,
    async (job: Job<AuditLogJobData>) => {
      batch.push(job.data);

      if (batch.length >= BATCH_SIZE) {
        await processBatch();
      } else if (!timeout) {
        timeout = setTimeout(() => {
          void processBatch().catch((err) =>
            console.error("[rate-limiter] audit flush failed:", err),
          );
        }, BATCH_TIMEOUT);
      }
    },
    {
      connection: getBullMQConnection() as any,
      concurrency: 10,
    },
  );
}

export const auditLogWorker = {
  create: createWorker,
  flush: processBatch,
};
