// packages/rate-limiter/src/workers/cleanup.worker.ts
import { Worker } from "bullmq";
import { getBullMQConnection } from "../redis/client.js";
import { QueueName, CleanupJobData } from "../types/index.js";
import { prisma } from "@repo/db";

const RETENTION_DEFAULT_DAYS = 30;

function createWorker(): Worker<CleanupJobData> {
  return new Worker<CleanupJobData>(
    QueueName.CLEANUP,
    async (job) => {
      const days = job.data.olderThanDays ?? RETENTION_DEFAULT_DAYS;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const result = await prisma.auditLog.deleteMany({
        where: { timestamp: { lt: cutoff } },
      });

      if (result.count > 0) {
        console.log(
          `[rate-limiter] cleanup: removed ${result.count} audit logs older than ${days}d`,
        );
      }
    },
    {
      connection: getBullMQConnection() as any,
      concurrency: 1,
    },
  );
}

export const cleanupWorker = { create: createWorker };
