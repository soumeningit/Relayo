import { prisma } from "@repo/db";
import {
  generateDestinationId,
  generateDestinationSigningSecret,
} from "../utils/helper";
import { encrypt } from "../utils/crypto.util";
import { AppError } from "../errors/AppError";

const FREE_PLAN_DESTINATION_LIMIT = 2;

async function resolveOrg(identifier: string) {
  const org = await prisma.organization.findFirst({
    where: { OR: [{ slug: identifier }, { organizationId: identifier }] },
    select: { id: true, PaymentType: true },
  });
  if (!org) throw new Error("Organization not found");
  return org;
}

function toPublicDestination(row: {
  destinationId: string;
  destinationName: string;
  url: string;
  status: string;
  consecutiveFailures: number;
  createdAt: Date;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
}) {
  return {
    id: row.destinationId,
    name: row.destinationName,
    url: row.url,
    status: row.status.toLowerCase() as "active" | "paused",
    consecutiveFailures: row.consecutiveFailures,
    createdAt: row.createdAt.toISOString(),
    lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
    lastFailureAt: row.lastFailureAt?.toISOString() ?? null,
  };
}

export async function createDestination(
  identifier: string,
  creatorPublicId: string,
  input: { name: string; url: string },
) {
  const org = await resolveOrg(identifier);

  const creator = await prisma.user.findUnique({
    where: { userId: creatorPublicId },
  });
  if (!creator) throw new Error("User not found");

  const destinationId = generateDestinationId();
  const signingSecret = generateDestinationSigningSecret();
  const encryptedSigningSecret = encrypt(signingSecret);

  if (org.PaymentType === "FREE") {
    const destinationCount = await prisma.destination.count({
      where: { organizationId: org.id },
    });
    if (destinationCount >= FREE_PLAN_DESTINATION_LIMIT) {
      throw new AppError(
        `Free plan allows up to ${FREE_PLAN_DESTINATION_LIMIT} destinations. Pay once for a 30-day period to add more.`,
        402,
        "PLAN_DESTINATION_LIMIT",
      );
    }
  }

  const destination = await prisma.destination.create({
    data: {
      destinationId,
      destinationName: input.name,
      url: input.url,
      encryptedSigningSecret,
      organizationId: org.id,
      createdBy: creator.id,
    },
  });

  return {
    destination: {
      id: destination.destinationId,
      name: destination.destinationName,
      url: destination.url,
      status: "active" as const,
      consecutiveFailures: 0,
      createdAt: destination.createdAt.toISOString(),
      lastSuccessAt: null,
      lastFailureAt: null,
    },
    signingSecret,
  };
}

export async function listDestinations(identifier: string) {
  const org = await resolveOrg(identifier);

  const rows = await prisma.destination.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
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
  });

  return rows.map(toPublicDestination);
}

export async function getDestination(
  identifier: string,
  destinationId: string,
) {
  const org = await resolveOrg(identifier);

  const row = await prisma.destination.findFirst({
    where: { destinationId, organizationId: org.id },
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
  });

  if (!row) throw new Error("Destination not found");
  return toPublicDestination(row);
}

export async function pauseDestination(
  identifier: string,
  destinationId: string,
) {
  const org = await resolveOrg(identifier);

  const row = await prisma.destination.findFirst({
    where: { destinationId, organizationId: org.id },
    select: { id: true, status: true },
  });
  if (!row) throw new Error("Destination not found");
  if (row.status === "PAUSED") throw new Error("Destination is already paused");

  const updated = await prisma.destination.update({
    where: { id: row.id },
    data: { status: "PAUSED", pauseReason: "Manual pause" },
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
  });

  return toPublicDestination(updated);
}

export async function resumeDestination(
  identifier: string,
  destinationId: string,
) {
  const org = await resolveOrg(identifier);

  const row = await prisma.destination.findFirst({
    where: { destinationId, organizationId: org.id },
    select: { id: true, status: true },
  });
  if (!row) throw new Error("Destination not found");
  if (row.status === "ACTIVE") throw new Error("Destination is already active");

  const updated = await prisma.destination.update({
    where: { id: row.id },
    data: { status: "ACTIVE", pauseReason: null, consecutiveFailures: 0 },
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
  });

  return toPublicDestination(updated);
}

export async function rotateDestinationSecret(
  identifier: string,
  destinationId: string,
) {
  const org = await resolveOrg(identifier);

  const row = await prisma.destination.findFirst({
    where: { destinationId, organizationId: org.id },
    select: { id: true },
  });
  if (!row) throw new Error("Destination not found");

  const newSecret = generateDestinationSigningSecret();
  const encryptedSecret = encrypt(newSecret);

  await prisma.destination.update({
    where: { id: row.id },
    data: { encryptedSigningSecret: encryptedSecret },
  });

  return { destinationId, secret: newSecret };
}

export async function deleteDestination(
  identifier: string,
  destinationId: string,
) {
  const org = await resolveOrg(identifier);

  const row = await prisma.destination.findFirst({
    where: { destinationId, organizationId: org.id },
    select: { id: true },
  });
  if (!row) throw new Error("Destination not found");

  await prisma.destination.delete({ where: { id: row.id } });
}

export async function getDestinationDetails(
  identifier: string,
  destinationId: string,
) {
  const org = await resolveOrg(identifier);

  const destination = await prisma.destination.findFirst({
    where: {
      destinationId,
      organizationId: org.id,
    },
    select: {
      destinationId: true,
      destinationName: true,
      url: true,
      status: true,
      consecutiveFailures: true,
      createdAt: true,
      lastSuccessAt: true,
      lastFailureAt: true,
      deliveries: {
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          attempts: true,
          lastResponseStatusCode: true,
          lastErrorMessage: true,
          updatedAt: true,
          event: {
            select: {
              eventId: true,
              eventType: true,
            },
          },
        },
      },
    },
  });

  if (!destination) throw new Error("Destination not found");

  return {
    ...toPublicDestination(destination),
    deliveries: destination.deliveries.map((delivery) => ({
      id: delivery.id.toString(),
      status: delivery.status,
      attempts: delivery.attempts,
      lastResponseStatusCode: delivery.lastResponseStatusCode,
      lastErrorMessage: delivery.lastErrorMessage,
      updatedAt: delivery.updatedAt.toISOString(),
      event: delivery.event,
    })),
  };
}
