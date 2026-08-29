import { z } from "zod";

export const createOrgSchema = z.object({
  body: z.object({
    name: z
      .string({ error: "Organization name is required" })
      .trim()
      .min(2, { error: "Organization name must be at least 2 characters" })
      .max(255, { error: "Organization name is too long" }),

    orgEmail: z
      .email({ error: "A valid organization email is required" })
      .max(255),

    metaData: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const orgIdentifierSchema = z.object({
  params: z.object({
    // Accepts either the public slug (acme-corp-173…) or ORG-… id
    identifier: z
      .string({ error: "Organization identifier is required" })
      .trim()
      .min(1, { error: "Organization identifier cannot be empty" })
      .max(320),
  }),
});

export const updateOrgSchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
  }),
  body: z
    .object({
      name: z
        .string({ error: "Organization name is required" })
        .trim()
        .min(2, { error: "Organization name must be at least 2 characters" })
        .max(255, { error: "Organization name is too long" })
        .optional(),

      contactEmail: z
        .email({ error: "Contact email must be a valid email" })
        .max(255)
        .optional(),
    })
    .refine(
      (data) => data.name !== undefined || data.contactEmail !== undefined,
      {
        error: "Provide at least one field to update",
      },
    ),
});

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} is too long` })
    .optional()
    .or(z.literal(""));

export const submitOrgDetailsSchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
  }),
  body: z.object({
    description: optionalText("Description", 2000),
    website: z
      .union([
        z.url({ error: "Website must be a valid URL" }).max(2048),
        z.literal(""),
      ])
      .optional(),
    address: optionalText("Address", 500),
    phone: optionalText("Phone number", 20),
    metaData: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const submitPaymentDetailsSchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
  }),
  body: z.object({
    planType: z.enum(["FREE", "PRO", "SCALE", "ENTERPRISE"], {
      error: "Invalid plan type",
    }),
  }),
});

export const verifyPaymentSchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
  }),
  body: z.object({
    razorpayOrderId: z.string().trim().min(1),
    razorpayPaymentId: z.string().trim().min(1),
    razorpaySignature: z.string().trim().min(1),
  }),
});

export const deliveryDetailsSchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
  }),
});

export const inviteMemberSchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
  }),
  body: z.object({
    email: z
      .email({ error: "A valid email address is required" })
      .max(255, { error: "Email is too long" }),
    role: z.enum(["ADMIN", "MEMBER", "VIEWER"], {
      error: "Invalid role",
    }),
  }),
});

export const lookupInviteeSchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
  }),
  body: z.object({
    email: z
      .email({ error: "A valid email address is required" })
      .max(255, { error: "Email is too long" }),
  }),
});

export const memberParamsSchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
    memberId: z.coerce.number().int().positive(),
  }),
});

export const updateMemberRoleSchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
    memberId: z.coerce.number().int().positive(),
  }),
  body: z.object({
    role: z.enum(["ADMIN", "MEMBER", "VIEWER"], { error: "Invalid role" }),
  }),
});

export const inviteParamsSchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
    inviteId: z.coerce.number().int().positive(),
  }),
});

export const inviteTokenParamsSchema = z.object({
  params: z.object({
    token: z.string().trim().min(1, { error: "Invite token is required" }),
  }),
});

export const respondInviteSchema = z.object({
  body: z.object({
    token: z
      .string({ error: "Invite token is required" })
      .trim()
      .min(1, { error: "Invite token cannot be empty" }),
    response: z.enum(["accept", "decline"], {
      error: "Response must be accept or decline",
    }),
  }),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>["body"];

export type SubmitOrgDetailsInput = z.infer<
  typeof submitOrgDetailsSchema
>["body"];

export type SubmitPaymentDetailsInput = z.infer<
  typeof submitPaymentDetailsSchema
>["body"];
