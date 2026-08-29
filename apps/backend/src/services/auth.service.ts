import { MfaStatus, Prisma, prisma, Status } from "@repo/db";
import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcrypt";
import QRCode from "qrcode";
import { decrypt, encrypt } from "../utils/crypto.util";
import {
  generateMfaSecret,
  generateMfaUri,
  verifyMfaOtp,
} from "../utils/otp.util";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../services/email.service";
import {
  createToken,
  createUserId,
  generateJwtToken,
  verifyJwtToken,
} from "../utils/helper";
import { AppError } from "../errors/AppError";

interface CreateUserReequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  mfaEnabled?: boolean;
  registrationToken?: string;
}

interface ResetRequest {
  token: string;
  password: string;
  mfaOtp?: string;
}

async function createUser(request: CreateUserReequest) {
  if (request.password.trim() !== request.confirmPassword.trim()) {
    throw new Error("Passwords do not match");
  }

  const hashedPassword = await bcrypt.hash(request.password, 10);

  // Invite onboarding: the invitee's account was pre-created (unverified and
  // without a password) when the invitation was accepted. The registration
  // token identifies that account, so the regular "user already exists"
  // guards must not apply here.
  if (request.registrationToken) {
    const token = await prisma.token.findUnique({
      where: { token: request.registrationToken },
    });

    if (!token) {
      throw new Error("Invalid registration token");
    }

    if (token.expiresAt < new Date()) {
      throw new Error("Registration token has expired");
    }

    const verificationRequired =
      token?.userEmail &&
      token.userEmail.toLowerCase() !== request.email.trim().toLowerCase();

    const conditions: Prisma.UserWhereInput[] = [];

    if (token?.userEmail) {
      conditions.push({ email: token.userEmail });
    }

    if (token?.userId) {
      conditions.push({ userId: token.userId });
    }

    if (conditions.length === 0) {
      throw new Error("Either userEmail or userId is required");
    }

    if (!verificationRequired) {
      await prisma.$transaction(async (tx) => {
        const result = await tx.user.updateMany({
          where: {
            OR: conditions,
          },
          data: {
            name: request.name,
            password: hashedPassword,
            isEmailVerified: true,
            status: Status.ACTIVE,
          },
        });

        if (result.count === 0) {
          throw new Error("User not found");
        }

        await tx.token.delete({
          where: {
            token: request.registrationToken,
          },
        });
      });

      return {
        success: true,
        message: "Account created successfully. You can sign in.",
      };
    }

    // The invitee signed up with a different email than the invite. Complete
    // the account but keep it PENDING and require email verification.
    const response = await prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: {
          OR: conditions,
        },
        data: {
          name: request.name,
          password: hashedPassword,
          isEmailVerified: false,
          status: Status.PENDING,
        },
      });
      return result;
    });
    if (response.count === 0) {
      throw new Error("User not found");
    }

    await prisma.token.delete({
      where: {
        token: request.registrationToken,
      },
    });

    const payload = {
      id: token.userId as string,
      email: request.email,
    };

    try {
      const verificationResult = await handleSendVerificationEmail(
        request.email,
        request.name,
        payload,
        true,
      );
      return verificationResult;
    } catch (error: AppError | any) {
      throw new AppError(
        "Failed to send verification email",
        500,
        error.verificationLink,
      );
    }
  }

  const user = await prisma.user.findUnique({
    where: {
      email: request.email,
    },
  });

  if (user && !user.isEmailVerified) {
    throw new Error("Verification pending");
  }

  if (user) {
    throw new Error("User already exists");
  }

  const userId = createUserId();

  const newUser = await prisma.user.create({
    data: {
      name: request.name,
      email: request.email,
      password: hashedPassword,
      userId: userId,
      status: Status.PENDING,
      isEmailVerified: false,
      mfaEnabled: request.mfaEnabled || false,
      profile: {
        create: {
          bio: "",
          avatarUrl: "",
        },
      },
    },
    include: {
      profile: true,
    },
  });

  if (!newUser) {
    throw new Error("Failed to create user");
  }

  if (request.mfaEnabled) {
    await userMfaEnabledAtRegistration(Number(newUser.id));
  }

  const payload = {
    id: newUser.userId,
    email: newUser.email,
  };

  try {
    const verificationResult = await handleSendVerificationEmail(
      newUser.email,
      newUser.name,
      payload,
      false,
    );

    return {
      success: true,
      message: "User created successfully. Please verify your email.",
      verificationLink: verificationResult.verificationLink,
    };
  } catch (error: AppError | any) {
    throw new AppError(
      "Failed to send verification email",
      500,
      error.verificationLink,
    );
  }
}

async function userMfaEnabledAtRegistration(id: number) {
  const mfaSecret = generateMfaSecret();

  const encryptedMfaSecret = encrypt(mfaSecret);

  const mfaDetails = await prisma.userMfa.create({
    data: {
      userId: id,
      secret: encryptedMfaSecret,
      status: "PENDING",
    },
  });

  if (!mfaDetails) {
    throw new Error("Failed to create MFA details");
  }

  return mfaDetails;
}

async function handleSendVerificationEmail(
  email: string,
  name: string,
  payload: { id: string; email: string },
  flag: boolean,
): Promise<{ success: boolean; message: string; verificationLink: string }> {
  const token = generateJwtToken(payload, "1h");

  const verificationLink = `${process.env.CLIENT_URL}/verify?token=${token}&flag=${flag}`;
  try {
    await sendVerificationEmail(email, name, verificationLink, "60 minutes");

    return {
      success: true,
      message: "Verification email sent successfully",
      verificationLink,
    };
  } catch (error) {
    throw new AppError(
      "Failed to send verification email",
      500,
      verificationLink,
    );
  }
}

async function verifyEmail(token: string, flag: boolean) {
  const decoded = verifyJwtToken(token) as {
    id: string;
    email: string;
  };

  if (!decoded || !decoded.id || !decoded.email) {
    throw new Error("Invalid or expired verification token");
  }

  const user = await prisma.user.findUnique({
    where: { userId: decoded.id, email: decoded.email },
  });

  if (!user) {
    throw new Error("User does not exist");
  }

  if (user.isEmailVerified) {
    throw new Error("User already verified");
  }

  let qrCodeDataUrl: string | null = null;

  if (user.mfaEnabled) {
    const mfaDetails = await prisma.userMfa.findUnique({
      where: { userId: user.id },
    });

    if (!mfaDetails) {
      throw new Error("MFA details not found for user");
    }

    const mfaSecret = decrypt(mfaDetails.secret as string);
    const otpauthUri = generateMfaUri(user.email, mfaSecret);
    qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true, status: Status.ACTIVE },
  });

  if (!updatedUser) {
    throw new Error("Failed to update user verification status");
  }

  if (flag) {
    const meta = user.metadata as {
      organizationId: string;
      role: string;
    } | null;
    if (!meta || !meta.organizationId || !meta.role) {
      throw new Error("User metadata is missing for organization and role");
    }

    await prisma.organizationMember.create({
      data: {
        organizationId: Number(meta.organizationId),
        userId: updatedUser.id,
        role: mapMemberRoleToOrgRole(meta.role),
      },
    });
  }

  return {
    requiresMfaSetup: user.mfaEnabled && !user.isEmailVerified,
    qrCode: qrCodeDataUrl,
    email: updatedUser.email,
  };
}

type OrgRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

function mapMemberRoleToOrgRole(role: string): OrgRole {
  switch (role.trim().toLowerCase()) {
    case "owner":
      return "OWNER";
    case "admin":
      return "ADMIN";
    case "member":
      return "MEMBER";
    case "viewer":
      return "VIEWER";
    default:
      throw "VIEWER";
  }
}

async function setupMfa(email: string, otp: string) {
  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (!user) {
    throw new Error("User does not exist");
  }

  if (!user.mfaEnabled) {
    throw new Error("MFA is not enabled for this user");
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

  await prisma.userMfa.update({
    where: { userId: user.id },
    data: {
      status: MfaStatus.ENABLED,
      lastMfaTimeStep: timeStep,
      updatedAt: new Date(),
    },
  });

  return {
    success: true,
    message: "MFA setup completed successfully",
  };
}

async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (!user) {
    throw new Error("User does not exist");
  }

  if (!user.isEmailVerified) {
    throw new Error("User is not verified");
  }

  const isMatch = await bcrypt.compare(password, user.password as string);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  let accessToken: string | null = await generateSession(
    Number(user.id),
    user.userId,
    user.email,
  );

  // if (!user.mfaEnabled) {
  //   accessToken = await generateSession(
  //     Number(user.id),
  //     user.userId,
  //     user.email,
  //   );
  // }

  return {
    success: true,
    email: user.email,
    mfaVerificationRequired: false,
    accessToken: accessToken,
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

async function verifyMfaToken(email: string, otp: string) {
  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (!user) {
    throw new Error("User does not exist");
  }

  if (!user.mfaEnabled) {
    throw new Error("MFA is not enabled for this user");
  }

  const mfaDetails = await prisma.userMfa.findUnique({
    where: { userId: user.id },
  });

  if (!mfaDetails) {
    throw new Error("MFA details not found for user");
  }

  const mfaSecret = decrypt(mfaDetails.secret as string);

  const { valid, timeStep } = await verifyMfaOtp(
    otp,
    mfaSecret,
    mfaDetails.lastMfaTimeStep ? Number(mfaDetails.lastMfaTimeStep) : null,
  );

  if (!valid) throw new Error("Invalid OTP");

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
    throw new Error("Failed to generate access token");
  }

  return {
    success: true,
    message: "MFA verification successful",
    accessToken: accessToken,
  };
}

async function sendResetLink(email: string) {
  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user) {
    return {
      status: 200,
      success: true,
      message: "If an account exists, a reset link has been dispatched.",
    };
  }

  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not defined");
  }

  const resetToken = generateJwtToken(
    { userId: user.id, email: user.email },
    "1h",
  );

  const baseURL = process.env.FRONTEND_URL;

  const resetURL = `${baseURL}/reset-password?token=${resetToken}`;

  await sendPasswordResetEmail(email, user.name, resetURL);

  return {
    status: 200,
    success: true,
    enableMfa: user.mfaEnabled,
    message: "If an account exists, a reset link has been dispatched.",
  };
}

async function resetPassword(request: ResetRequest) {
  if (!request.password || request.password.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }

  if (!request.token) {
    throw new Error("Reset token is required");
  }

  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not defined");
  }

  const payload = verifyJwtToken(request.token);

  if (!payload) {
    throw new Error("Invalid or expired reset token");
  }

  const userId = payload.userId;

  const hashedPassword = await bcrypt.hash(request.password, 12);

  const user = await prisma.user.findFirst({
    where: { id: Number(userId), email: payload.email },
  });

  if (!user) {
    throw new Error("Invalid or expired reset token");
  }

  let updatedUser;

  if (user?.mfaEnabled) {
    const mfaDetails = await prisma.userMfa.findUnique({
      where: { userId: user.id },
    });

    if (!mfaDetails) {
      throw new Error("MFA details not found for user");
    }

    const mfaSecret = decrypt(mfaDetails.secret as string);

    const { valid } = await verifyMfaOtp(
      request.mfaOtp as string,
      mfaSecret,
      mfaDetails.lastMfaTimeStep ? Number(mfaDetails.lastMfaTimeStep) : null,
    );

    if (!valid) {
      throw new Error("Invalid MFA OTP");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    if (!updatedUser) {
      throw new Error("Failed to update password");
    }

    return {
      status: 200,
      success: true,
      message: "Password has been updated successfully",
    };
  }

  updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  if (!updatedUser) {
    throw new Error("Failed to update password");
  }

  return {
    status: 200,
    success: true,
    message: "Password has been updated successfully",
  };
}

export {
  createUser,
  verifyEmail,
  setupMfa,
  loginUser,
  verifyMfaToken,
  sendResetLink,
  resetPassword,
};
