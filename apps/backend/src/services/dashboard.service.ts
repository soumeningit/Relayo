import { prisma } from "@repo/db";

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

async function resolveOrg(identifier: string) {
  const org = await prisma.organization.findFirst({
    where: { OR: [{ slug: identifier }, { organizationId: identifier }] },
    select: { id: true },
  });
  if (!org) throw new Error("Organization not found");
  return org;
}

export async function getDashboardOverview(identifier: string) {
  const org = await resolveOrg(identifier);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    eventsLast24h,
    successfulDeliveries,
    failedDeliveries,
    pendingRetries,
    destinations,
    recentDeliveries,
  ] = await Promise.all([
    prisma.event.count({
      where: {
        organizationId: org.id,
        createdAt: { gte: twentyFourHoursAgo },
      },
    }),

    prisma.delivery.count({
      where: { organizationId: org.id, status: "SUCCESS" },
    }),

    prisma.delivery.count({
      where: { organizationId: org.id, status: "FAILED" },
    }),

    prisma.delivery.count({
      where: { organizationId: org.id, status: "PENDING" },
    }),

    prisma.destination.findMany({
      where: { organizationId: org.id },
      select: {
        destinationId: true,
        destinationName: true,
        url: true,
        status: true,
        consecutiveFailures: true,
        createdAt: true,
        lastSuccessAt: true,
        lastFailureAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    prisma.delivery.findMany({
      where: { organizationId: org.id },
      include: {
        event: { select: { eventType: true } },
        destination: { select: { url: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);

  const totalTerminal = successfulDeliveries + failedDeliveries;
  const successRatePct =
    totalTerminal > 0
      ? Math.round((successfulDeliveries / totalTerminal) * 100)
      : 100;

  const stats = {
    eventsLast24h,
    successRatePct,
    pendingRetries,
    deadLettered: failedDeliveries,
  };

  const mappedDestinations = destinations.map((d) => ({
    id: d.destinationId,
    name: d.destinationName,
    url: d.url,
    status: d.status.toLowerCase() as "active" | "paused",
    consecutiveFailures: d.consecutiveFailures,
    createdAt: d.createdAt.toISOString(),
    lastSuccessAt: d.lastSuccessAt?.toISOString() ?? null,
    lastFailureAt: d.lastFailureAt?.toISOString() ?? null,
  }));

  const mappedRecent = recentDeliveries.map((d) => ({
    id: d.id.toString(),
    eventId: d.eventId.toString(),
    destinationId: d.destinationId.toString(),
    status: mapDbStatusToFrontend(d.status),
    attemptCount: d.attempts,
    maxAttempts: 5,
    nextRetryAt: d.nextRetryAt ? d.nextRetryAt.toISOString() : null,
    lastResponseCode: d.lastResponseStatusCode,
    lastError: d.lastErrorMessage,
    updatedAt: d.updatedAt.toISOString(),
    attempts: [],
    eventType: d.event.eventType,
    destinationUrl: d.destination.url,
  }));

  return {
    stats,
    destinations: mappedDestinations,
    recent: mappedRecent,
  };
}