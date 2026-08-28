import { Queue } from "bullmq";
import { getBullMQConnection } from "@repo/redis";

export const deliveryQueue = new Queue("relayo_deliveries", {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    // We don't rely on BullMQ's native retry, we handle it in the DB.
    // But we set a high limit just in case of weird edge cases.
    attempts: 50,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});
