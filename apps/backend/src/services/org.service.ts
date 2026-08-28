import {
  OrganizationPaymentStatus,
  OrganizationRole,
  OrganizationStatus,
  Prisma,
  prisma,
} from "@repo/db";
import { generateOrganizationId, slugGenerator } from "../utils/helper";
import { PaymentPlanType } from "../type";

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
  // payment gateway will be implemented later
  const organization = await findOrganization(identifier);

  if (!organization) {
    throw new Error("Organization not found.");
  }

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

export {
  createOrganization,
  updateOrganization,
  submitOrganizationDetails,
  getOrganizationDetails,
  getMyOrganizations,
  submitPaymentDetails,
};
