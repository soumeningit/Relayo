import { MfaStatus, prisma } from "@repo/db";
import { createAPIKeyId, generateApiKey, hashApiKey } from "../utils/helper";
import { decrypt, encrypt } from "../utils/crypto.util";
import {
  generateMfaSecret,
  generateMfaUri,
  verifyMfaOtp,
} from "../utils/otp.util";
import { AppError } from "../errors/AppError";
import QRCode from "qrcode";

interface CreateApiKeyInput {
  name: string;
  scopes?: string[];
  expiresAt?: Date;
}

async function resolveOrg(
  identifier: string,
): Promise<{ id: bigint; organizationId: string }> {
  const org = await prisma.organization.findFirst({
    where: { OR: [{ slug: identifier }, { organizationId: identifier }] },
    select: { id: true, organizationId: true },
  });
  if (!org) throw new Error("Organization not found");
  return org;
}

async function resolveOrgAndUser(organizationId: bigint, userPublicId: string) {
  const [organization, creator] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.user.findUnique({ where: { userId: userPublicId } }),
  ]);

  return { organization, creator };
}

function requireMfa(user: { mfaEnabled: boolean }) {
  if (!user.mfaEnabled) {
    throw new AppError(
      "MFA is required to perform this action",
      403,
      "MFA_REQUIRED",
    );
  }
}

async function listApiKeys(identifier: string) {
  const org = await resolveOrg(identifier);

  const keys = await prisma.apiKey.findMany({
    where: { organizationId: org.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      apiKeyId: true,
      name: true,
      prefix: true,
      scopes: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });

  return keys.map((k) => ({
    id: k.apiKeyId,
    name: k.name,
    prefix: k.prefix,
    scopes: k.scopes,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
    expiresAt: k.expiresAt,
  }));
}

async function createApiKey(
  identifier: string,
  creatorPublicId: string,
  input: CreateApiKeyInput,
) {
  const org = await resolveOrg(identifier);
  const { creator } = await resolveOrgAndUser(org.id, creatorPublicId);
  if (!creator) throw new Error("User not found");

  requireMfa(creator);

  const { apiKey, prefix } = generateApiKey();
  const keyHash = hashApiKey(apiKey);

  const keyId = createAPIKeyId(org.organizationId.slice(0, 8));

  const createdKey = await prisma.apiKey.create({
    data: {
      organizationId: org.id,
      createdBy: creator.id,
      apiKeyId: keyId,
      name: input.name,
      prefix,
      keyHash,
      scopes: input.scopes ?? [],
      expiresAt: input.expiresAt ?? null,
    },
  });

  if (!createdKey) {
    throw new Error("Failed to create API key");
  }

  return { apiKey, id: createdKey.apiKeyId, prefix: createdKey.prefix };
}

async function rotateApiKey(
  identifier: string,
  keyId: string,
  userId: string,
  otp: string,
) {
  const org = await resolveOrg(identifier);
  const creator = await prisma.user.findUnique({
    where: { userId: userId },
  });
  if (!creator) throw new Error("User not found");
  requireMfa(creator);

  const key = await prisma.apiKey.findFirst({
    where: {
      apiKeyId: keyId,
      organizationId: org.id,
      revokedAt: null,
    },
  });

  if (!key) throw new Error("API key not found");

  const mfaDetails = await prisma.userMfa.findUnique({
    where: { userId: creator.id },
  });

  if (!mfaDetails) throw new Error("MFA details not found");

  const mfaSecret = decrypt(mfaDetails.secret as string);

  const { valid, timeStep } = await verifyMfaOtp(
    otp,
    mfaSecret,
    mfaDetails.lastMfaTimeStep ? Number(mfaDetails.lastMfaTimeStep) : null,
  );
  if (!valid) throw new Error("Invalid OTP");

  const { apiKey, prefix } = generateApiKey();
  const keyHash = hashApiKey(apiKey);

  await prisma.$transaction([
    prisma.userMfa.update({
      where: { userId: creator.id },
      data: { lastMfaTimeStep: timeStep },
    }),
    prisma.apiKey.update({
      where: { id: key.id },
      data: { prefix, keyHash, lastUsedAt: null, revokedAt: null },
    }),
  ]);

  return { apiKey, prefix };
}

async function revokeApiKey(
  identifier: string,
  keyId: string,
  userId: string,
  otp: string,
) {
  await resolveOrg(identifier);

  const creator = await prisma.user.findUnique({
    where: { userId: userId },
  });

  if (!creator) throw new Error("User not found");

  requireMfa(creator);

  const key = await prisma.apiKey.findFirst({
    where: {
      apiKeyId: keyId,
      revokedAt: null,
    },
  });

  if (!key) throw new Error("API key not found");

  const mfaDetails = await prisma.userMfa.findUnique({
    where: { userId: creator.id },
  });

  if (!mfaDetails) throw new Error("MFA details not found");

  const mfaSecret = decrypt(mfaDetails.secret as string);

  const { valid, timeStep } = await verifyMfaOtp(
    otp,
    mfaSecret,
    mfaDetails.lastMfaTimeStep ? Number(mfaDetails.lastMfaTimeStep) : null,
  );

  if (!valid) throw new Error("Invalid OTP");

  await prisma.$transaction([
    prisma.userMfa.update({
      where: { userId: creator.id },
      data: { lastMfaTimeStep: timeStep },
    }),
    prisma.apiKey.update({
      where: { id: key.id },
      data: { revokedAt: new Date() },
    }),
  ]);
}

async function enableMfaForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const existing = await prisma.userMfa.findUnique({
    where: { userId: user.id },
  });

  let mfaSecret: string;

  if (existing && existing.status === MfaStatus.ENABLED) {
    throw new AppError(
      "MFA is already enabled for this user",
      400,
      "MFA_ALREADY_ENABLED",
    );
  }

  if (existing && existing.status === MfaStatus.PENDING) {
    mfaSecret = decrypt(existing.secret as string);
  } else {
    mfaSecret = generateMfaSecret();
    const mfaDetails = await prisma.userMfa.create({
      data: {
        userId: user.id,
        secret: encrypt(mfaSecret),
        status: MfaStatus.PENDING,
      },
    });

    if (!mfaDetails) {
      throw new Error("Failed to create MFA details");
    }
  }

  const otpauthUri = generateMfaUri(user.email, mfaSecret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

  if (!qrCodeDataUrl) {
    throw new Error("Failed to generate QR code");
  }

  return {
    success: true,
    message: "MFA setup initiated",
    qrCode: qrCodeDataUrl,
  };
}

async function completeMfaSetup(userId: string, otp: string) {
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
  });

  if (!user) {
    throw new Error("User does not exist");
  }

  const mfaDetails = await prisma.userMfa.findUnique({
    where: { userId: user.id },
  });

  if (!mfaDetails) {
    throw new Error("MFA details not found for user");
  }

  const mfaSecret = decrypt(mfaDetails.secret as string);

  const { valid, timeStep } = await verifyMfaOtp(otp, mfaSecret);
  if (!valid) throw new Error("Invalid OTP");

  const updatedMfaDetails = await prisma.userMfa.update({
    where: { userId: user.id },
    data: {
      status: MfaStatus.ENABLED,
      lastMfaTimeStep: timeStep,
      updatedAt: new Date(),
    },
  });

  if (!updatedMfaDetails) {
    throw new Error("Failed to update MFA details");
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { mfaEnabled: true },
  });

  if (!updatedUser) {
    throw new Error("Failed to update user MFA status");
  }

  return {
    success: true,
    message: "MFA setup completed successfully",
  };
}

export {
  listApiKeys,
  createApiKey,
  rotateApiKey,
  revokeApiKey,
  enableMfaForUser,
  completeMfaSetup,
};
