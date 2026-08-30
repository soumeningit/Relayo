import { prisma } from "@repo/db";
import bcrypt from "bcrypt";
import { createToken, generateJwtToken } from "../utils/helper";
import { decrypt } from "../utils/crypto.util";
import { verifyMfaOtp } from "../utils/otp.util";
import { AppError } from "../errors/AppError";

export interface AdminIdentity {
  id: number;
  userId: string;
  email: string;
  name: string;
}

export async function loginAdmin(
  email: string,
  password: string,
): Promise<{ success: boolean; message: string; mfaRequired: boolean }> {
  const admin = await prisma.user.findFirst({
    where: { email, role: "SUPER_ADMIN" },
  });

  if (!admin) {
    throw new AppError(
      "Admin not found",
      401,
      "ADMIN_NOT_FOUND",
    );
  }

  const isMatch = await bcrypt.compare(password, admin.password as string);

  if (!isMatch) {
    throw new AppError("Invalid password", 401, "INVALID_PASSWORD");
  }

  return {
    success: true,
    message: "Requires authenticator code",
    mfaRequired: true,
  };
}

export async function verifyMfaToken(
  email: string,
  otp: string,
): Promise<{
  success: boolean;
  message: string;
  accessToken: string;
  user: AdminIdentity;
}> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("User does not exist", 401, "USER_NOT_FOUND");
  }

  if (user.role !== "SUPER_ADMIN") {
    throw new AppError(
      "Access denied. Super admin privileges required.",
      403,
      "SUPER_ADMIN_REQUIRED",
    );
  }

  if (!user.mfaEnabled) {
    throw new AppError("MFA is not enabled for this user", 400, "MFA_DISABLED");
  }

  const mfaDetails = await prisma.userMfa.findUnique({
    where: { userId: user.id },
  });

  if (!mfaDetails) {
    throw new AppError("MFA details not found for user", 400, "MFA_NOT_FOUND");
  }

  const mfaSecret = decrypt(mfaDetails.secret as string);

  const { valid, timeStep } = await verifyMfaOtp(
    otp,
    mfaSecret,
    mfaDetails.lastMfaTimeStep ? Number(mfaDetails.lastMfaTimeStep) : null,
  );

  if (!valid) throw new AppError("Invalid OTP", 401, "INVALID_OTP");

  await prisma.userMfa.update({
    where: { userId: user.id },
    data: { lastMfaTimeStep: timeStep },
  });

  const accessToken = await generateSession(
    Number(user.id),
    user.userId,
    user.email,
  );

  if (!accessToken) {
    throw new AppError("Failed to generate access token", 500, "TOKEN_FAILED");
  }

  return {
    success: true,
    message: "MFA verification successful",
    accessToken,
    user: {
      id: Number(user.id),
      userId: user.userId,
      email: user.email,
      name: user.name,
    },
  };
}

async function generateSession(id: number, userId: string, email: string) {
  const sessionToken = createToken();

  await prisma.session.create({
    data: {
      userId: id,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  const payload = {
    id: userId,
    email: email,
  };

  const accessToken = generateJwtToken(payload, "1h");

  if (!accessToken) {
    throw new Error("Failed to generate access token");
  }

  return accessToken;
}