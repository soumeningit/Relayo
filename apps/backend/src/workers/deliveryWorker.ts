import { Worker, Job } from "bullmq";
import crypto from "crypto";
import { getBullMQConnection, getRedisClient } from "@repo/redis";
import { prisma } from "@repo/db";
import axios from "axios";
import { destinationSigningSecretKey } from "../utils/redis.util";
import { decrypt } from "../utils/crypto.util";

// --- CONFIGURATION (Move to env/config later) ---
const MAX_RETRIES_PER_JOB = 5;
const PAUSE_DESTINATION_AFTER = 10;
const BASE_DELAY_MS = 2000;
// ----------------------------------------

interface DeliveryJobData {
  eventId: string;
  destinationId: string;
}

async function openIncident(
  severity: "INFO" | "WARNING" | "CRITICAL",
  title: string,
  message: string,
) {
  await prisma.incident.create({ data: { severity, title, message } });
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export const deliveryWorker = new Worker<DeliveryJobData>(
  "relayo_deliveries",
  async (job: Job<DeliveryJobData>) => {
    const { eventId, destinationId } = job.data;

    const currentDelivery = await prisma.delivery.findFirst({
      where: {
        eventId: BigInt(eventId),
        destinationId: BigInt(destinationId),
        status: "PENDING",
      },
    });

    if (!currentDelivery) return;

    const [event, destination] = await Promise.all([
      prisma.event.findUnique({ where: { id: BigInt(eventId) } }),
      prisma.destination.findUnique({ where: { id: BigInt(destinationId) } }),
    ]);

    if (!event || !destination) throw new Error("Missing event or destination");

    if (destination.status === "PAUSED" || destination.status === "DISABLED") {
      await prisma.delivery.update({
        where: { id: currentDelivery.id },
        data: { status: "PAUSED" },
      });
      return;
    }

    // --- GET SECRET & SIGN ---
    const redisClient = getRedisClient();
    const cacheKey = destinationSigningSecretKey(destination.destinationId);
    let encryptedSecret = await redisClient.get(cacheKey);

    if (!encryptedSecret) {
      // SELF-WARM: the API process no longer primes this cache. Populate it
      // from the destination row we already fetched, then proceed.
      encryptedSecret = destination.encryptedSigningSecret;
      await redisClient.set(cacheKey, encryptedSecret, "EX", 86400);
    }

    // 1. Decrypt the secret (Assuming you have your decrypt util)
    const plaintextSecret = decrypt(encryptedSecret);

    // 2. Generate Timestamp
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // 3. Stringify payload (Prisma Json type returns a JS object)
    const payloadString = JSON.stringify(event.payload);

    // 4. Create the signed payload string
    const signedPayload = `${timestamp}.${payloadString}`;

    // 5. Generate HMAC-SHA256 Hash
    const signatureHash = crypto
      .createHmac("sha256", plaintextSecret)
      .update(signedPayload)
      .digest("hex");

    // 6. Format the header
    const signatureHeader = `t=${timestamp},v1=${signatureHash}`;

    const attemptNumber = currentDelivery.attempts + 1;
    const startedAt = Date.now();
    const host = hostOf(destination.url);

    // --- MAKE THE HTTP REQUEST ---
    try {
      const response = await axios.post(destination.url, event.payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Relayo-Signature": signatureHeader, // <-- INJECTED HERE
        },
        timeout: 10000,
        validateStatus: (status) => status < 500,
      });

      const latencyMs = Math.round(Date.now() - startedAt);

      // --- SUCCESS PATH ---
      await prisma.$transaction(async (tx) => {
        await tx.delivery.update({
          where: { id: currentDelivery.id },
          data: {
            status: "SUCCESS",
            attempts: attemptNumber,
            latencyMs,
            lastResponseStatusCode: response.status,
            lastErrorMessage: null,
            nextRetryAt: null,
            completedAt: new Date(),
          },
        });

        await tx.deliveryAttempt.create({
          data: {
            deliveryId: currentDelivery.id,
            attemptNumber,
            status: "SUCCESS",
            responseCode: response.status,
            latencyMs,
            errorMessage: null,
            attemptedAt: new Date(),
          },
        });

        await tx.destination.update({
          where: { id: destination.id },
          data: {
            consecutiveFailures: 0,
            lastSuccessAt: new Date(),
            breakerOpenedAt: null,
          },
        });

        // Auto-resolve incidents against this host once it recovers.
        await tx.incident.updateMany({
          where: {
            status: "OPEN",
            OR: [
              { title: { contains: host } },
              { message: { contains: host } },
            ],
          },
          data: { status: "RESOLVED", resolvedAt: new Date() },
        });
      });
    } catch (error: any) {
      const statusCode = error.response?.status || 0;
      // If Axios threw due to a 5xx error, but validateStatus caught it,
      // error.response might exist but status is 0. Ensure we handle 4xx/5xx properly.
      const finalStatusCode = error.response?.status || statusCode;
      const errorMessage =
        error.code === "ECONNABORTED" ? "Request timed out" : error.message;
      const latencyMs = Math.round(Date.now() - startedAt);
      const nextConsecutiveFailures = destination.consecutiveFailures + 1;
      const breakerJustOpened =
        nextConsecutiveFailures >= PAUSE_DESTINATION_AFTER &&
        destination.consecutiveFailures < PAUSE_DESTINATION_AFTER;

      // --- PER-JOB CIRCUIT BREAKER (terminate this delivery) ---
      if (attemptNumber >= MAX_RETRIES_PER_JOB) {
        await prisma.$transaction(async (tx) => {
          await tx.delivery.update({
            where: { id: currentDelivery.id },
            data: {
              status: "DEAD_LETTER",
              attempts: attemptNumber,
              latencyMs,
              lastResponseStatusCode: finalStatusCode,
              lastErrorMessage: errorMessage,
              completedAt: new Date(),
            },
          });

          await tx.deliveryAttempt.create({
            data: {
              deliveryId: currentDelivery.id,
              attemptNumber,
              status: "FAILED",
              responseCode: finalStatusCode || null,
              latencyMs,
              errorMessage,
              attemptedAt: new Date(),
            },
          });

          await tx.destination.update({
            where: { id: destination.id },
            data: {
              consecutiveFailures: nextConsecutiveFailures,
              lastFailureAt: new Date(),
              ...(breakerJustOpened
                ? {
                    status: "PAUSED",
                    breakerOpenedAt: new Date(),
                    pauseReason: `Automatically paused after ${PAUSE_DESTINATION_AFTER} consecutive failures.`,
                  }
                : {}),
            },
          });
        });

        if (breakerJustOpened) {
          await openIncident(
            "WARNING",
            `Circuit breaker opened — ${host}`,
            `Consecutive failures against ${host} passed ${PAUSE_DESTINATION_AFTER}, opening circuit breakers. Probing every ~60s.`,
          );
        }

        await openIncident(
          "WARNING",
          `Delivery dead-lettered — ${host}`,
          `A delivery to ${host} exhausted ${MAX_RETRIES_PER_JOB} attempts and moved to the dead-letter queue. Last error: ${errorMessage}`,
        );

        return;
      }

      // --- CALCULATE EXPONENTIAL BACKOFF ---
      const delayMs = BASE_DELAY_MS * Math.pow(2, attemptNumber);
      const nextRetryAt = new Date(Date.now() + delayMs);

      // --- UPDATE DATABASE (single transaction to avoid partial writes) ---
      await prisma.$transaction(async (tx) => {
        await tx.delivery.update({
          where: { id: currentDelivery.id },
          data: {
            attempts: attemptNumber,
            latencyMs,
            nextRetryAt,
            lastResponseStatusCode: finalStatusCode,
            lastErrorMessage: errorMessage,
          },
        });

        await tx.deliveryAttempt.create({
          data: {
            deliveryId: currentDelivery.id,
            attemptNumber,
            status: "FAILED",
            responseCode: finalStatusCode || null,
            latencyMs,
            errorMessage,
            attemptedAt: new Date(),
          },
        });

        await tx.destination.update({
          where: { id: destination.id },
          data: {
            consecutiveFailures: nextConsecutiveFailures,
            lastFailureAt: new Date(),
            ...(breakerJustOpened
              ? {
                  status: "PAUSED",
                  breakerOpenedAt: new Date(),
                  pauseReason: `Automatically paused after ${PAUSE_DESTINATION_AFTER} consecutive failures.`,
                }
              : {}),
          },
        });
      });

      if (breakerJustOpened) {
        await openIncident(
          "WARNING",
          `Circuit breaker opened — ${host}`,
          `Consecutive failures against ${host} passed ${PAUSE_DESTINATION_AFTER}, opening circuit breakers. Probing every ~60s.`,
        );
      }

      // --- RE-QUEUE IN BULLMQ ---
      await job.moveToDelayed(Date.now() + delayMs);

      throw new Error(
        `Delivery failed, scheduled for retry at ${nextRetryAt.toISOString()}`,
      );
    }
  },
  {
    connection: getBullMQConnection(),
    concurrency: Number(process.env.DELIVERY_WORKER_CONCURRENCY || 5),
  },
);

deliveryWorker.on("completed", (job) => {
  // Optional: console.log(`Job ${job.id} completed`);
});

deliveryWorker.on("failed", (job, err) => {
  if (
    !err.message.includes("scheduled for retry") &&
    !err.message.includes("missing from Redis cache")
  ) {
    // console.error(`Job ${job?.id} crashed unexpectedly:`, err.message);
  }
});