import { prisma } from "@repo/db";
import { deliveryQueue } from "../queues/deliveryQueue";
import {
  buildPagination,
  parsePaginationQuery,
  type PaginationMeta,
} from "../utils/pagination";

interface Event {
  organizationId: string;
  eventType: string;
  payload: Record<string, any>;
  destinationId?: string;
}

export async function acceptEvent(event: Event) {
  const result = await prisma.$transaction(async (tx) => {
    const newEvent = await tx.event.create({
      data: {
        organizationId: BigInt(event.organizationId),
        eventId: crypto.randomUUID(),
        eventType: event.eventType,
        payload: event.payload,
      },
    });

    let targetsToProcess = [];

    if (event.destinationId) {
      const singleDest = await tx.destination.findFirst({
        where: {
          organizationId: BigInt(event.organizationId),
          destinationId: event.destinationId,
          status: "ACTIVE",
        },
      });

      if (!singleDest) {
        throw new Error("Specific destination not found or not active.");
      }

      targetsToProcess = [singleDest]; // Array of 1
    } else {
      targetsToProcess = await tx.destination.findMany({
        where: {
          organizationId: BigInt(event.organizationId),
          status: "ACTIVE",
        },
      });
    }

    if (targetsToProcess.length === 0) {
      return { event: newEvent, destinations: [] };
    }

    await tx.delivery.createMany({
      data: targetsToProcess.map((dest) => ({
        organizationId: BigInt(event.organizationId),
        eventId: newEvent.id,
        destinationId: dest.id,
        status: "PENDING",
        nextRetryAt: new Date(),
      })),
    });

    return { event: newEvent, destinations: targetsToProcess };
  });

  // push jobs to the delivery queue for each destination (fire-and-forget —
  // the delivery worker self-warms the signing-secret cache on a miss)
  if (result.destinations.length > 0) {
    for (const dest of result.destinations) {
      deliveryQueue
        .add("send_webhook", {
          eventId: result.event.id.toString(),
          destinationId: dest.id.toString(),
        })
        .catch((err: unknown) => {
          console.error(
            "enqueue failed:",
            err instanceof Error ? err.message : String(err),
          );
        });
    }
  }

  return {
    eventId: result.event.eventId,
    queued_for_delivery: result.destinations.length,
  };
}

export async function getEvents(
  organizationId: string,
  options: { page?: number; pageSize?: number; search?: string } = {},
) {
  const organization = await prisma.organization.findUnique({
    where: {
      organizationId: organizationId,
    },
  });

  if (!organization) {
    throw new Error("Organization not found.");
  }

  const { page, pageSize, skip, take } = parsePaginationQuery(options);

  const whereClause: any = {
    organizationId: organization.id,
  };

  if (options.search) {
    const q = options.search.trim();
    whereClause.OR = [
      { eventType: { contains: q, mode: "insensitive" } },
      { eventId: { contains: q, mode: "insensitive" } },
    ];
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take,
      select: {
        eventId: true,
        eventType: true,
        createdAt: true,
        // Count related deliveries efficiently in the DB
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    }),
    prisma.event.count({ where: whereClause }),
  ]);

  const pagination: PaginationMeta = buildPagination(page, pageSize, total);

  // Map to the exact shape the frontend expects
  const items = events.map((event) => ({
    id: event.eventId, // Frontend uses 'id' for keys and links
    eventType: event.eventType,
    idempotencyKey: event.eventId, // Using UUID as idempotency key
    createdAt: event.createdAt.toISOString(),
    deliveryCount: event._count.deliveries, // Pre-calculated count!
  }));

  return { items, pagination };
}

// Helper to map DB enums to UI strings
function mapDeliveryStatus(dbStatus: string) {
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

export async function getEventDetails(organizationId: string, eventId: string) {
  const organization = await prisma.organization.findUnique({
    where: {
      organizationId: organizationId,
    },
  });

  if (!organization) {
    throw new Error("Organization not found.");
  }

  // Use findFirst to safely enforce organizationId security
  const event = await prisma.event.findFirst({
    where: {
      eventId: eventId,
      organizationId: organization.id,
    },
    include: {
      deliveries: {
        include: {
          destination: {
            select: {
              url: true,
              destinationName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!event) return null;

  return {
    id: event.eventId,
    eventType: event.eventType,
    idempotencyKey: event.eventId,
    createdAt: event.createdAt.toISOString(),
    payload: event.payload, // Prisma Json type returns a plain JS object
    deliveries: event.deliveries.map((d) => ({
      id: d.id.toString(),
      destinationUrl: d.destination.url,
      status: mapDeliveryStatus(d.status),
      attemptCount: d.attempts,
      maxAttempts: 5, // Matches worker config
      lastError: d.lastErrorMessage,
      updatedAt: d.updatedAt.toISOString(),
    })),
  };
}
