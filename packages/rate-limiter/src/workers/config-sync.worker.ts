// packages/rate-limiter/src/workers/config-sync.worker.ts
import { Worker, Job } from "bullmq";
import { getBullMQConnection } from "../redis/client.js";
import { QueueName, ConfigSyncJobData } from "../types/index.js";
import { ConfigCacheService } from "../services/config-cache.service.js";
import { prisma } from "@repo/db";

const configCache = new ConfigCacheService();

function createWorker(): Worker<ConfigSyncJobData> {
  return new Worker<ConfigSyncJobData>(
    QueueName.CONFIG_SYNC,
    async (job: Job<ConfigSyncJobData>) => {
      switch (job.data.action) {
        case "sync_all":
          await configCache.getAll();
          break;
        case "sync_one":
          if (job.data.configId) {
            await configCache.invalidate(job.data.configId);
            await prisma.rateLimitConfig.findUnique({
              where: { id: job.data.configId },
            });
          }
          break;
        case "invalidate":
          await configCache.invalidate(job.data.configId);
          break;
      }
    },
    {
      connection: getBullMQConnection() as any,
      concurrency: 1,
    },
  );
}

export const configSyncWorker = { create: createWorker };
