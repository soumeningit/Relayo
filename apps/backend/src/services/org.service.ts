import {
  InvitationStatus,
  OrganizationPaymentStatus,
  OrganizationRole,
  OrganizationStatus,
  Prisma,
  prisma,
} from "@repo/db";
import {
  createUserId,
  generateInvitationToken,
  generateOrganizationId,
  generateRegistrationInvitationToken,
  slugGenerator,
} from "../utils/helper";
import { PaymentPlanType } from "../type";
import { createRazorpayOrder, verifyRazorpayPayment } from "./payment.service";
import * as mailservice from "./email.service";

interface CreateOrganizationInput {
  name: string;
  orgEmail: string;
  creatorPublicId: string;
  metaData?: Record<string, unknown>;
}

interface SubmitDetailsInput {
  identifier: string;
  description?: string;
  website?: string;
  address?: string;
  phone?: string;
  metaData?: Prisma.InputJsonValue;
}

interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  completedSteps: number;
  contactEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002";
}

function findOrganization(identifier: string) {
  return prisma.organization.findFirst({
    where: { OR: [{ slug: identifier }, { organizationId: identifier }] },
  });
}

async function getMyOrganizations(userId: string): Promise<OrgSummary[]> {
  const user = await prisma.user.findUnique({
    where: { userId: userId },
    select: { id: true },
  });

  if (!user) {
    throw new Error("User not found.");
  }
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      organization: {
        select: {
          organizationId: true,
          name: true,
          slug: true,
          status: true,
          completedSteps: true,
          contactEmail: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return memberships.map((membership) => ({
    id: membership.organization.organizationId,
    name: membership.organization.name,
    slug: membership.organization.slug,
    status: membership.organization.status,
    completedSteps: membership.organization.completedSteps,
    contactEmail: membership.organization.contactEmail,
    createdAt: membership.organization.createdAt,
    updatedAt: membership.organization.updatedAt,
  }));
}

async function getOrganizationDetails(identifier: string) {
  const organization = await findOrganization(identifier);

  if (!organization) {
    throw new Error("Organization not found.");
  }

  return prisma.organization.findUnique({
    where: { id: organization.id },
    select: {
      organizationId: true,
      name: true,
      slug: true,
      status: true,
      contactEmail: true,
      completedSteps: true,
      PaymentType: true,
      paymentStatus: true,
      currentPeriodEnd: true,
      createdAt: true,
      updatedAt: true,
      metadata: true,

      details: {
        select: {
          description: true,
          logoUrl: true,
          address: true,
          phoneNumber: true,
          website: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
        },
      },

      members: {
        select: {
          role: true,
          user: { select: { userId: true, name: true, email: true } },
        },
      },
    },
  });
}

interface UpdateOrganizationInput {
  identifier: string;
  name?: string;
  contactEmail?: string;
}

async function updateOrganization(
  data: UpdateOrganizationInput,
): Promise<OrgSummary> {
  const organization = await findOrganization(data.identifier);

  if (!organization) {
    throw new Error("Organization not found.");
  }

  try {
    const updated = await prisma.organization.update({
      where: { id: organization.id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.contactEmail !== undefined
          ? { contactEmail: data.contactEmail.trim() }
          : {}),
      },
      select: {
        organizationId: true,
        name: true,
        slug: true,
        status: true,
        completedSteps: true,
        contactEmail: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const response: OrgSummary = {
      id: updated.organizationId,
      name: updated.name,
      slug: updated.slug,
      status: updated.status,
      completedSteps: updated.completedSteps,
      contactEmail: updated.contactEmail,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    return response;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error(
        "An organization with this name already exists. Please choose another name.",
      );
    }
    throw error;
  }
}

async function createOrganization(data: CreateOrganizationInput) {
  // Resolve the numeric PK once — needed for registered_by and membership
  const creator = await prisma.user.findUnique({
    where: { userId: data.creatorPublicId },
    select: { id: true, email: true, isEmailVerified: true },
  });

  if (!creator) {
    throw new Error("Creator is not a registered user.");
  }

  if (!creator.isEmailVerified) {
    throw new Error("Creator's email is not verified.");
  }

  // Enforce one owned organization per user
  const ownedMembership = await prisma.organizationMember.findFirst({
    where: { userId: creator.id, role: OrganizationRole.OWNER },
    select: {
      organization: {
        select: { organizationId: true, name: true, slug: true },
      },
    },
  });

  if (ownedMembership) {
    return {
      alreadyExists: true,
      data: {
        id: ownedMembership.organization.organizationId,
        name: ownedMembership.organization.name,
        slug: ownedMembership.organization.slug,
      },
    };
  }

  try {
    // Atomic: org + details + OWNER membership
    const organization = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          organizationId: generateOrganizationId(),
          name: data.name.trim(),
          slug: slugGenerator(data.name),
          contactEmail: data.orgEmail.trim(),
          completedSteps: 1,
          metadata: (data.metaData ?? {}) as Prisma.InputJsonValue,
          details: {
            create: {
              registered_by: creator.id,
            },
          },
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: created.id,
          userId: creator.id,
          role: OrganizationRole.OWNER,
        },
      });

      return created;
    });

    return {
      alreadyExists: false,
      data: {
        id: organization.organizationId,
        name: organization.name,
        slug: organization.slug,
      },
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error(
        "An organization with this name already exists. Please choose another name.",
      );
    }
    throw error;
  }
}

async function submitPaymentDetails(
  identifier: string,
  paymentType: PaymentPlanType,
) {
  const organization = await findOrganization(identifier);

  if (!organization) {
    throw new Error("Organization not found.");
  }

  // FREE is instantly activated. Paid plans get a Razorpay order — the org is
  // only switched to ACTIVE once the payment is captured (signature verify or
  // webhook), which grants one 30-day period.
  if (paymentType === "FREE") {
    const updatedOrganization = await prisma.organization.update({
      where: { id: organization.id },
      data: {
        PaymentType: paymentType,
        status: OrganizationStatus.ACTIVE,
        completedSteps: Math.max(organization.completedSteps, 3),
        paymentStatus: OrganizationPaymentStatus.PENDING,
        updatedAt: new Date(),
      },
    });

    if (!updatedOrganization) {
      throw new Error("Failed to update organization payment details.");
    }

    return {
      success: true,
      message: "Organization payment details submitted successfully.",
      data: {
        id: updatedOrganization.organizationId,
        name: updatedOrganization.name,
        slug: updatedOrganization.slug,
        paymentType: updatedOrganization.PaymentType,
        status: updatedOrganization.status,
        completedSteps: updatedOrganization.completedSteps,
        paymentStatus: updatedOrganization.paymentStatus,
        currentPeriodEnd: updatedOrganization.currentPeriodEnd,
        order: null,
      },
    };
  }

  const order = await createRazorpayOrder(organization, paymentType);

  return {
    success: true,
    message: "Razorpay order created. Complete payment to activate the plan.",
    data: {
      id: organization.organizationId,
      name: organization.name,
      slug: organization.slug,
      paymentType,
      status: organization.status,
      completedSteps: organization.completedSteps,
      paymentStatus: organization.paymentStatus,
      currentPeriodEnd: organization.currentPeriodEnd,
      order,
    },
  };
}

async function submitOrganizationDetails(data: SubmitDetailsInput) {
  const organization = await findOrganization(data.identifier);

  if (!organization) {
    throw new Error("Organization not found.");
  }

  const updatedDetails = await prisma.organizationDetails.update({
    where: { organizationId: organization.id },
    data: {
      ...(data.description !== undefined
        ? { description: data.description.trim() }
        : {}),
      ...(data.website !== undefined ? { website: data.website.trim() } : {}),
      ...(data.address !== undefined ? { address: data.address.trim() } : {}),
      ...(data.phone !== undefined ? { phoneNumber: data.phone.trim() } : {}),
      ...(data.metaData !== undefined
        ? { metadata: data.metaData as Prisma.InputJsonValue }
        : {}),
    },
  });

  if (!updatedDetails) {
    throw new Error("Failed to update organization details.");
  }

  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      completedSteps: Math.max(organization.completedSteps, 2),
      status: OrganizationStatus.ACTIVE,
      updatedAt: new Date(),
    },
  });

  return {
    success: true,
    message: "Organization details submitted successfully.",
    data: {
      id: organization.organizationId,
      name: organization.name,
      slug: organization.slug,
      description: updatedDetails.description,
      website: updatedDetails.website,
      address: updatedDetails.address,
      phone: updatedDetails.phoneNumber,
      metaData: updatedDetails.metadata,
    },
  };
}

async function verifyPayment(
  identifier: string,
  input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  },
) {
  const organization = await findOrganization(identifier);

  if (!organization) {
    throw new Error("Organization not found.");
  }

  return verifyRazorpayPayment(organization, input);
}

const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const REGISTRATION_EXPIRY_MS = 24 * 60 * 60 * 1000;

async function requireOrgMember(userId: number, organizationId: number) {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new Error("You are not a member of this organization.");
  }

  return membership.role;
}

async function requireOrgAdmin(userId: number, organizationId: number) {
  const role = await requireOrgMember(userId, organizationId);

  if (role !== OrganizationRole.OWNER && role !== OrganizationRole.ADMIN) {
    throw new Error(
      "You do not have permission to manage organization members.",
    );
  }

  return role;
}

async function inviteMemberToOrganization(
  userId: string,
  identifier: string,
  email: string,
  role: OrganizationRole,
) {
  const emailNormalized = email.trim().toLowerCase();

  const inviter = await prisma.user.findUnique({
    where: { userId: userId },
    select: { id: true, email: true, name: true, isEmailVerified: true },
  });

  if (!inviter) {
    throw new Error("Inviter is not a registered user.");
  }

  if (!inviter.isEmailVerified) {
    throw new Error("Inviter's email is not verified.");
  }

  const organization = await findOrganization(identifier);

  if (!organization) {
    throw new Error("Organization not found.");
  }

  await requireOrgAdmin(Number(inviter.id), Number(organization.id));

  const existingMember = await prisma.organizationMember.findFirst({
    where: {
      organizationId: organization.id,
      user: { email: emailNormalized },
    },
    select: { id: true },
  });

  if (existingMember) {
    throw new Error("User is already a member of the organization.");
  }

  const pendingInvitation = await prisma.organizationInvitation.findFirst({
    where: {
      organizationId: organization.id,
      email: emailNormalized,
      status: InvitationStatus.PENDING,
      valid: true,
    },
    select: { id: true },
  });

  if (pendingInvitation) {
    throw new Error("User already has a pending invitation.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: emailNormalized },
    select: { id: true, name: true },
  });

  const token = generateInvitationToken(organization.organizationId);
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);

  let invitation;
  try {
    invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId: organization.id,
        email: emailNormalized,
        role: role,
        invitedBy: inviter.id,
        token: token,
        expiresAt: expiresAt,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("An invitation for this email already exists.");
    }
    throw error;
  }

  // Registered users receive the invitation as an in-app notification (the
  // same record backs it) — no email involved. Only external invitees get one.
  const isRegistered = Boolean(existingUser);

  if (!isRegistered) {
    const URL = `${process.env.FRONTEND_URL}/invite/${token}`;

    try {
      await mailservice.sendInvitationEmail(
        emailNormalized,
        emailNormalized.split("@")[0],
        inviter.name || inviter.email,
        organization.name,
        role,
        URL,
        expiresAt.toLocaleString(),
      );
    } catch (error) {
      console.error(
        `[Organization Service Error]: Failed to send invitation email to ${emailNormalized}`,
        error,
      );
      throw new Error(
        "Invitation created, but the email could not be sent. Copy the invite link and share it with your teammate.",
      );
    }
  }

  return {
    success: true,
    message: isRegistered
      ? "Invitation sent — they can accept or reject it from their notifications."
      : "Invitation email sent successfully.",
    isRegistered,
    invitation: invitation,
  };
}

async function getInvitationDetails(token: string) {
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { token: token },
    select: {
      email: true,
      role: true,
      status: true,
      valid: true,
      expiresAt: true,
      organization: { select: { name: true } },
      inviter: { select: { name: true, email: true } },
    },
  });

  if (!invitation || !invitation.valid) {
    return {
      isValid: false,
      reason: "This invitation link is no longer valid.",
    };
  }

  if (invitation.expiresAt < new Date()) {
    return { isValid: false, reason: "This invitation has expired." };
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    return { isValid: false, reason: "This invitation has already been used." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true, name: true },
  });

  return {
    isValid: true,
    email: invitation.email,
    name: existingUser?.name ?? null,
    isRegistered: Boolean(existingUser),
    orgName: invitation.organization.name,
    role: invitation.role,
    inviterName: invitation.inviter.name || invitation.inviter.email,
    expiresAt: invitation.expiresAt,
  };
}

async function userRespondToInvitation(
  token: string,
  response: "accept" | "decline",
) {
  const invitation = await prisma.organizationInvitation.findUnique({
    where: {
      token: token,
      valid: true,
    },
  });

  if (!invitation) {
    throw new Error("Invitation not found.");
  }

  if (invitation.expiresAt < new Date()) {
    throw new Error("Invitation has expired.");
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new Error("Invitation has already been responded to.");
  }

  const status = mapUserResponseToInvitationStatus(response);
  const orgName = (
    await prisma.organization.findUnique({
      where: { id: invitation.organizationId },
      select: { name: true },
    })
  )?.name;

  const common = {
    email: invitation.email,
    orgName: orgName ?? null,
    role: invitation.role,
  };

  if (status === "DECLINED") {
    await prisma.organizationInvitation.update({
      where: { token: token },
      data: { status: status, valid: false },
    });

    return {
      success: true,
      message: "Invitation declined.",
      ...common,
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true },
  });

  // Registered user accepting the invite — simply create the membership.
  if (existingUser) {
    const alreadyMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: invitation.organizationId,
        userId: existingUser.id,
      },
      select: { id: true },
    });

    if (alreadyMember) {
      await prisma.organizationInvitation.update({
        where: { token: token },
        data: { status: InvitationStatus.ACCEPTED, valid: false },
      });

      return {
        success: true,
        message: "You are already a member of this organization.",
        ...common,
      };
    }

    await prisma.$transaction([
      prisma.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: existingUser.id,
          role: invitation.role,
        },
      }),
      prisma.organizationInvitation.update({
        where: { token: token },
        data: { status: InvitationStatus.ACCEPTED, valid: false },
      }),
    ]);

    return {
      success: true,
      message: "You've joined the organization.",
      ...common,
    };
  }

  // New user: pre-create the account (unverified, no password), grant the
  // membership, and hand back a short-lived registration token. Completing
  // signup with that token activates the account.
  const userId = createUserId();
  const registrationToken = generateRegistrationInvitationToken();

  const newUser = await prisma.user.create({
    data: {
      userId: userId,
      email: invitation.email,
      name: invitation.email.split("@")[0],
    },
  });

  if (!newUser) {
    throw new Error("Failed to create user.");
  }

  await prisma.$transaction([
    prisma.token.create({
      data: {
        userId: newUser.userId,
        userEmail: newUser.email,
        token: registrationToken,
        expiresAt: new Date(Date.now() + REGISTRATION_EXPIRY_MS),
      },
    }),
    prisma.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId: newUser.id,
        role: invitation.role,
      },
    }),
    prisma.organizationInvitation.update({
      where: { token: token },
      data: { status: InvitationStatus.ACCEPTED, valid: false },
    }),
  ]);

  return {
    success: true,
    message: "Please provide your details to complete registration.",
    ...common,
    registrationToken: registrationToken,
  };
}

async function listMembers(userId: string, identifier: string) {
  const requester = await prisma.user.findUnique({
    where: { userId: userId },
    select: { id: true },
  });

  if (!requester) {
    throw new Error("User not found.");
  }

  const organization = await findOrganization(identifier);

  if (!organization) {
    throw new Error("Organization not found.");
  }

  await requireOrgMember(Number(requester.id), Number(organization.id));

  const [members, invitations] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            userId: true,
            name: true,
            email: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.organizationInvitation.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        inviter: { select: { name: true, email: true } },
      },
    }),
  ]);

  const inviteeEmails = invitations.map((invite) => invite.email);
  const registeredInvitees = await prisma.user.findMany({
    where: { email: { in: inviteeEmails } },
    select: { email: true, name: true },
  });
  const registeredByEmail = new Map(
    registeredInvitees.map((user) => [user.email, user.name]),
  );

  return {
    members: members.map((member) => ({
      id: member.id,
      userId: member.user.userId,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      joinedAt: member.createdAt,
      lastActiveAt: member.user.updatedAt,
    })),
    invitations: invitations.map((invite) => ({
      id: invite.id,
      email: invite.email,
      name: registeredByEmail.get(invite.email) ?? null,
      role: invite.role,
      token: invite.token,
      status: invite.status,
      isRegistered: registeredByEmail.has(invite.email),
      invitedAt: invite.createdAt,
      respondedAt:
        invite.status === InvitationStatus.PENDING ? null : invite.updatedAt,
      expiresAt: invite.expiresAt,
      invitedBy: invite.inviter.name || invite.inviter.email,
    })),
  };
}

async function removeMember(
  userId: string,
  identifier: string,
  memberId: number,
) {
  const inviter = await prisma.user.findUnique({
    where: { userId: userId },
    select: { id: true },
  });

  if (!inviter) {
    throw new Error("Inviter is not a registered user.");
  }

  const organization = await findOrganization(identifier);

  if (!organization) {
    throw new Error("Organization not found.");
  }

  const actorRole = await requireOrgAdmin(
    Number(inviter.id),
    Number(organization.id),
  );

  const member = await prisma.organizationMember.findUnique({
    where: { id: memberId },
    select: { id: true, role: true, userId: true },
  });

  if (!member) {
    throw new Error("Member not found.");
  }

  if (member.role === OrganizationRole.OWNER) {
    throw new Error("The organization owner cannot be removed.");
  }

  if (member.userId === inviter.id) {
    throw new Error("You cannot remove yourself.");
  }

  if (
    actorRole === OrganizationRole.ADMIN &&
    member.role === OrganizationRole.ADMIN
  ) {
    throw new Error("Only the owner can remove another admin.");
  }

  await prisma.organizationMember.delete({ where: { id: memberId } });

  return { success: true };
}

async function updateMemberRole(
  userId: string,
  identifier: string,
  memberId: number,
  role: OrganizationRole,
) {
  const inviter = await prisma.user.findUnique({
    where: { userId: userId },
    select: { id: true },
  });

  if (!inviter) {
    throw new Error("Inviter is not a registered user.");
  }

  const organization = await findOrganization(identifier);

  if (!organization) {
    throw new Error("Organization not found.");
  }

  const actorRole = await requireOrgAdmin(
    Number(inviter.id),
    Number(organization.id),
  );

  if (role === OrganizationRole.OWNER) {
    throw new Error("Ownership cannot be transferred through this action.");
  }

  const member = await prisma.organizationMember.findUnique({
    where: { id: memberId },
    select: { id: true, role: true },
  });

  if (!member) {
    throw new Error("Member not found.");
  }

  if (member.role === OrganizationRole.OWNER) {
    throw new Error("The owner's role cannot be changed.");
  }

  if (actorRole === OrganizationRole.ADMIN) {
    if (role === OrganizationRole.ADMIN) {
      throw new Error("Only the owner can grant the admin role.");
    }
  }

  const updated = await prisma.organizationMember.update({
    where: { id: memberId },
    data: { role: role },
    select: { id: true, role: true },
  });

  return updated;
}

async function revokeInvitation(
  userId: string,
  identifier: string,
  invitationId: number,
) {
  const inviter = await prisma.user.findUnique({
    where: { userId: userId },
    select: { id: true },
  });

  if (!inviter) {
    throw new Error("Inviter is not a registered user.");
  }

  const organization = await findOrganization(identifier);

  if (!organization) {
    throw new Error("Organization not found.");
  }

  await requireOrgAdmin(Number(inviter.id), Number(organization.id));

  const invitation = await prisma.organizationInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation || invitation.organizationId !== organization.id) {
    throw new Error("Invitation not found.");
  }

  if (invitation.status === InvitationStatus.ACCEPTED) {
    throw new Error("An accepted invitation cannot be cancelled.");
  }

  await prisma.organizationInvitation.update({
    where: { id: invitationId },
    data: { status: InvitationStatus.EXPIRED, valid: false },
  });

  return { success: true };
}

async function resendInvitation(
  userId: string,
  identifier: string,
  invitationId: number,
) {
  const inviter = await prisma.user.findUnique({
    where: { userId: userId },
    select: { id: true, name: true, email: true },
  });

  if (!inviter) {
    throw new Error("Inviter is not a registered user.");
  }

  const organization = await findOrganization(identifier);

  if (!organization) {
    throw new Error("Organization not found.");
  }

  await requireOrgAdmin(Number(inviter.id), Number(organization.id));

  const invitation = await prisma.organizationInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation || invitation.organizationId !== organization.id) {
    throw new Error("Invitation not found.");
  }

  if (invitation.status !== InvitationStatus.PENDING || !invitation.valid) {
    throw new Error("Only pending invitations can be re-sent.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { email: true },
  });

  if (existingUser) {
    return {
      success: true,
      message:
        "This invite is delivered as an in-app notification — nothing to re-send.",
    };
  }

  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);
  const URL = `${process.env.FRONTEND_URL}/invite/${invitation.token}`;

  await mailservice.sendInvitationEmail(
    invitation.email,
    invitation.email.split("@")[0],
    inviter.name || inviter.email,
    organization.name,
    invitation.role,
    URL,
    expiresAt.toLocaleString(),
  );

  await prisma.organizationInvitation.update({
    where: { id: invitationId },
    data: { expiresAt: expiresAt },
  });

  return {
    success: true,
    message: "Invitation email re-sent successfully.",
  };
}

async function lookupInvitee(
  userId: string,
  identifier: string,
  email: string,
) {
  const emailNormalized = email.trim().toLowerCase();

  const inviter = await prisma.user.findUnique({
    where: { userId: userId },
    select: { id: true },
  });

  if (!inviter) {
    throw new Error("Inviter is not a registered user.");
  }

  const organization = await findOrganization(identifier);

  if (!organization) {
    throw new Error("Organization not found.");
  }

  await requireOrgAdmin(Number(inviter.id), Number(organization.id));

  const existingUser = await prisma.user.findUnique({
    where: { email: emailNormalized },
    select: { name: true, email: true },
  });

  return {
    isRegistered: Boolean(existingUser),
    name: existingUser?.name ?? null,
  };
}

function mapUserResponseToInvitationStatus(
  response: "accept" | "decline",
): "ACCEPTED" | "DECLINED" {
  return response === "accept" ? "ACCEPTED" : "DECLINED";
}

export {
  createOrganization,
  updateOrganization,
  submitOrganizationDetails,
  getOrganizationDetails,
  getMyOrganizations,
  submitPaymentDetails,
  verifyPayment,
  inviteMemberToOrganization,
  getInvitationDetails,
  userRespondToInvitation,
  listMembers,
  removeMember,
  updateMemberRole,
  revokeInvitation,
  resendInvitation,
  lookupInvitee,
  mapUserResponseToInvitationStatus,
};
