import { AddressType, prisma } from "@repo/db";
import bcrypt from "bcrypt";
import { compressImage, uploadImage } from "./file.service";
import { generateAddressId } from "../utils/helper";

async function resolveUser(publicUserId: string) {
  const user = await prisma.user.findUnique({
    where: { userId: publicUserId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

const userSelect = {
  id: true,
  userId: true,
  email: true,
  name: true,
  status: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

const profileSelect = {
  id: true,
  userId: true,
  bio: true,
  avatarUrl: true,
  updatedAt: true,
} as const;

export async function getProfile(publicUserId: string) {
  const user = await resolveUser(publicUserId);

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: userSelect,
  });

  let userProfile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    select: profileSelect,
  });

  if (!userProfile) {
    userProfile = await prisma.userProfile.create({
      data: { userId: user.id },
      select: profileSelect,
    });
  }

  const addresses = await prisma.address.findMany({
    where: { profileId: userProfile.id },
    select: {
      id: true,
      addressId: true,
      type: true,
      street: true,
      city: true,
      state: true,
      country: true,
      zipCode: true,
      updatedAt: true,
    },
    orderBy: { type: "asc" },
  });

  return { user: userData, userProfile, addresses };
}

export async function updateProfile(
  publicUserId: string,
  input: { name?: string; bio?: string; avatarUrl?: string },
  file?: { buffer: Buffer },
) {
  const user = await resolveUser(publicUserId);

  let userProfile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
  });

  if (!userProfile) {
    userProfile = await prisma.userProfile.create({
      data: { userId: user.id },
    });
  }

  let avatarUrl: string | null | undefined;
  if (file) {
    const compressed = await compressImage(file.buffer);
    avatarUrl = await uploadImage(compressed, "relayo/avatars");
  } else if (input.avatarUrl !== undefined) {
    avatarUrl =
      input.avatarUrl.trim() === "" ? null : input.avatarUrl.trim();
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: input.name !== undefined ? { name: input.name.trim() } : {},
    select: userSelect,
  });

  const updatedUserProfile = await prisma.userProfile.update({
    where: { id: userProfile.id },
    data: {
      ...(input.bio !== undefined
        ? { bio: input.bio.trim() === "" ? null : input.bio.trim() }
        : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    },
    select: profileSelect,
  });

  return { user: updatedUser, userProfile: updatedUserProfile };
}

export async function updateAddress(
  publicUserId: string,
  input: {
    type: AddressType;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  },
) {
  const user = await resolveUser(publicUserId);

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!userProfile) {
    throw new Error("User profile not found");
  }

  const data = {
    street: input.street?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim() || "",
    country: input.country?.trim() || "",
    zipCode: input.zipCode?.trim() || "",
  };

  const existing = await prisma.address.findUnique({
    where: {
      profileId_type: { profileId: userProfile.id, type: input.type },
    },
  });

  if (!existing) {
    return prisma.address.create({
      data: {
        profileId: userProfile.id,
        addressId: generateAddressId(input.type),
        type: input.type,
        ...data,
      },
      select: {
        id: true,
        addressId: true,
        type: true,
        street: true,
        city: true,
        state: true,
        country: true,
        zipCode: true,
        updatedAt: true,
      },
    });
  }

  return prisma.address.update({
    where: { id: existing.id },
    data,
    select: {
      id: true,
      addressId: true,
      type: true,
      street: true,
      city: true,
      state: true,
      country: true,
      zipCode: true,
      updatedAt: true,
    },
  });
}

export async function updatePassword(
  publicUserId: string,
  oldPassword: string,
  newPassword: string,
) {
  const user = await resolveUser(publicUserId);

  if (!user.password) {
    throw new Error("User not found");
  }

  if (user.isOauthUser) {
    throw new Error("Password update is not allowed for OAuth users");
  }

  if (!user.isEmailVerified) {
    throw new Error(
      "Email is not verified. Please verify your email before updating the password.",
    );
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new Error("Old password is incorrect");
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    throw new Error("New password cannot be the same as the old password");
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedNewPassword },
  });
}