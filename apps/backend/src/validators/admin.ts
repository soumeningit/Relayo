import { z } from "zod";

export const adminSigninSchema = z.object({
  body: z.object({
    email: z.email({ error: "Email is required" }),
    password: z
      .string({ error: "Password is required" })
      .trim()
      .min(1, { error: "Password is required" }),
  }),
});

export const adminVerifyMfaSchema = z.object({
  body: z.object({
    email: z.email({ error: "Email is required" }),
    otp: z
      .string({ error: "OTP is required" })
      .length(6, { error: "OTP must be exactly 6 characters" }),
  }),
});

export const updateAdminProfileSchema = z.object({
  body: z.object({
    name: z
      .string({ error: "Name is required" })
      .trim()
      .min(1, { error: "Name cannot be empty" })
      .max(255, { error: "Name is too long" }),
  }),
});

const organizationIdParams = z.object({
  id: z.string({ error: "Organization id is required" }).min(1),
});

const pagedQuery = {
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
};

export const listOrganizationsQuery = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    ...pagedQuery,
  }),
});

export const updateOrganizationStatusSchema = z.object({
  body: z.object({ status: z.enum(["active", "suspended"]) }),
  params: organizationIdParams,
});

export const changeOrganizationPlanSchema = z.object({
  body: z.object({ plan: z.enum(["FREE", "PRO", "SCALE"]) }),
  params: organizationIdParams,
});

export const updateOrganizationNotesSchema = z.object({
  body: z.object({
    notes: z.string().max(5000, { error: "Notes too long" }),
  }),
  params: organizationIdParams,
});

export const listUsersQuery = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    ...pagedQuery,
  }),
});

const userIdParams = z.object({
  id: z.string({ error: "User id is required" }).min(1),
});

export const updateUserStatusSchema = z.object({
  body: z.object({
    status: z.enum(["verified", "unverified", "suspended"]),
  }),
  params: userIdParams,
});

export const listPaymentsQuery = z.object({
  query: z.object({
    status: z
      .enum(["paid", "pending", "failed", "refunded", "all"])
      .optional(),
  }),
});

export const listEventsQuery = z.object({
  query: z.object({
    organizationId: z.string().optional(),
    eventType: z.string().trim().optional(),
    search: z.string().trim().optional(),
    ...pagedQuery,
  }),
});

export const listDeliveriesQuery = z.object({
  query: z.object({
    organizationId: z.string().optional(),
    status: z
      .enum(["PENDING", "DELIVERED", "FAILED", "DEAD_LETTER", "PAUSED", ""])
      .optional(),
    destinationId: z.string().optional(),
    eventId: z.string().optional(),
    search: z.string().trim().optional(),
    ...pagedQuery,
  }),
});

export const listAuditQuery = z.object({
  query: z.object({
    category: z
      .enum(["auth", "security", "organization", "user", "billing", "system", ""])
      .optional(),
    actorType: z.string().optional(),
    query: z.string().trim().optional(),
  }),
});

export const searchQuery = z.object({
  query: z.object({ q: z.string().trim().optional() }),
});

const flagIdParams = z.object({
  id: z.string({ error: "Flag id is required" }).min(1),
});

export const updateFeatureFlagSchema = z.object({
  body: z.object({ enabled: z.boolean() }),
  params: flagIdParams,
});

export const exportParams = z.object({
  params: z.object({
    kind: z.enum(["organizations", "users", "payments"]),
  }),
});