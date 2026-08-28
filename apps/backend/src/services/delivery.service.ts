import { prisma } from "@repo/db";
import { getRedisClient } from "@repo/redis";
import { deliveryQueue } from "../queues/deliveryQueue";
import { destinationSigningSecretKey } from "../utils/redis.util";
import { AppError } from "../errors/AppError";
import {
  buildPagination,
  parsePaginationQuery,
  type PaginationMeta,
} from "../utils/pagination";

function mapFrontendStatusToDb(status: string): string | undefined {
  switch (status) {
    case "delivered":
      return "SUCCESS";
    case "dead_letter":
      return "FAILED";
    case "paused":
      return "PAUSED";
    case "pending":
    case "failed": // "Retrying" in the UI is still PENDING in the DB
      return "PENDING";
    default:
      return undefined; // "All statuses"
  }
}

function mapDbStatusToFrontend(dbStatus: string): string {
  switch (dbStatus) {
    case "SUCCESS":
      return "delivered";
    case "FAILED":
      return "dead_letter";
    case "PAUSED":
      return "paused";
    default:
      return "pending";
  }
}

export async function listDeliveries(
  organizationId: string,
  filters: {
    status?: string;
    destinationId?: string;
  } = {},
  options: { page?: number; pageSize?: number } = {},
) {
  const organization = await prisma.organization.findUnique({
    where: { organizationId: organizationId },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  const { page, pageSize, skip, take } = parsePaginationQuery(options);

  const whereClause: any = {
    organizationId: organization.id,
  };

  // Apply Status Filter
  if (filters.status) {
    const dbStatus = mapFrontendStatusToDb(filters.status);
    if (dbStatus) {
      whereClause.status = dbStatus;
    }
  }

  // Apply Destination Filter
  // Assuming the frontend passes the public UUID string (destinationId column)
  if (filters.destinationId) {
    const destination = await prisma.destination.findFirst({
      where: {
        destinationId: filters.destinationId,
        organizationId: organization.id,
      },
      select: {
        id: true,
      },
    });

    if (!destination) {
      return {
        items: [],
        pagination: buildPagination(page, pageSize, 0),
      };
    }

    whereClause.destinationId = destination.id;
  }

  const [deliveries, total] = await Promise.all([
    prisma.delivery.findMany({
      where: whereClause,
      include: {
        event: {
          select: {
            eventType: true,
          },
        },
        destination: {
          select: {
            url: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc", // Show newest activity first
      },
      skip,
      take,
    }),
    prisma.delivery.count({ where: whereClause }),
  ]);

  const pagination: PaginationMeta = buildPagination(page, pageSize, total);

  return { items: deliveries.map(mapDeliveryRow), pagination };
}

function mapDeliveryRow(d: {
  id: bigint;
  eventId: bigint;
  destinationId: bigint;
  status: string;
  attempts: number;
  nextRetryAt: Date | null;
  lastResponseStatusCode: number | null;
  lastErrorMessage: string | null;
  updatedAt: Date;
  event: { eventType: string };
  destination: { url: string };
}) {
  return {
    id: d.id.toString(),
    eventId: d.eventId.toString(),
    destinationId: d.destinationId.toString(),
    status: mapDbStatusToFrontend(d.status),
    attemptCount: d.attempts,
    maxAttempts: 5, // Matches your worker config
    nextRetryAt: d.nextRetryAt ? d.nextRetryAt.toISOString() : null,
    lastResponseCode: d.lastResponseStatusCode,
    lastError: d.lastErrorMessage,
    updatedAt: d.updatedAt.toISOString(),

    // Joined data
    eventType: d.event.eventType,
    destinationUrl: d.destination.url,
    attempts: [],
  };
}

export async function replayDelivery(
  organizationId: string,
  deliveryId: string,
) {
  const organization = await prisma.organization.findUnique({
    where: { organizationId: organizationId },
  });

  if (!organization) {
    throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");
  }

  const delivery = await prisma.delivery.findFirst({
    where: {
      id: BigInt(deliveryId),
      organizationId: organization.id,
    },
    include: {
      event: {
        select: { eventType: true },
      },
      destination: {
        select: { url: true },
      },
    },
  });

  if (!delivery) {
    throw new AppError("Delivery not found", 404, "DELIVERY_NOT_FOUND");
  }

  if (delivery.status !== "FAILED") {
    throw new AppError(
      "Only dead-lettered deliveries can be replayed",
      400,
      "DELIVERY_NOT_REPLAYABLE",
    );
  }

  const now = new Date();

  const updated = await prisma.delivery.update({
    where: { id: delivery.id },
    data: {
      status: "PENDING",
      attempts: 0,
      nextRetryAt: now,
      updatedAt: now,
      lastErrorMessage: null,
      lastResponseStatusCode: null,
    },
    include: {
      event: { select: { eventType: true } },
      destination: { select: { url: true } },
    },
  });

  // Ensure the signing secret is warm in Redis before the worker picks the job up
  const cacheKey = destinationSigningSecretKey(delivery.destination.destinationId);
  const cache = await getRedisClient().get(cacheKey);
  if (!cache) {
    const destination = await prisma.destination.findUnique({
      where: { id: delivery.destinationId },
      select: { encryptedSigningSecret: true },
    });
    if (destination?.encryptedSigningSecret) {
      await getRedisClient().set(
        cacheKey,
        destination.encryptedSigningSecret,
        "EX",
        86400,
      );
    }
  }

  await deliveryQueue.add("send_webhook", {
    eventId: delivery.eventId.toString(),
    destinationId: delivery.destinationId.toString(),
  });

  return mapDeliveryRow(updated);
}
