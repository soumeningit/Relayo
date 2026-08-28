import { Queue } from "bullmq";
import { getBullMQConnection } from "../redis/client.js";
import {
  QueueName,
  ConfigSyncJobData,
  AuditLogJobData,
  CleanupJobData,
} from "../types/index.js";

const queues = new Map<QueueName, Queue>();

function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue(name, {
        connection: getBullMQConnection() as never,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      }),
    );
  }
  return queues.get(name)!;
}

export async function enqueueConfigSync(
  data: ConfigSyncJobData,
): Promise<void> {
  const queue = getQueue(QueueName.CONFIG_SYNC);
  await queue.add("config-sync", data, { priority: 1 });
}

export async function enqueueAuditLog(data: AuditLogJobData): Promise<void> {
  const queue = getQueue(QueueName.AUDIT_LOG);
  await queue.add("audit-log", data, { removeOnComplete: true });
}

export async function enqueueCleanup(data: CleanupJobData): Promise<void> {
  const queue = getQueue(QueueName.CLEANUP);
  await queue.add("cleanup", data, { jobId: `cleanup-${Date.now()}` });
}

/** Registers the daily repeatable cleanup job (idempotent — same jobId) */
export async function scheduleCleanupDaily(olderThanDays = 30): Promise<void> {
  const queue = getQueue(QueueName.CLEANUP);
  await queue.add(
    "cleanup-daily",
    { olderThanDays },
    {
      jobId: "cleanup-daily",
      repeat: { pattern: "0 3 * * *" }, // 03:00 every day
    },
  );
}

export async function closeQueues(): Promise<void> {
  for (const queue of queues.values()) {
    await queue.close();
  }
  queues.clear();
}
