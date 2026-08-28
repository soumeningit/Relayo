import { z } from "zod";

const orgIdentifierParam = z.object({
  identifier: z.string().trim().min(1).max(320),
});

export const listApiKeysSchema = z.object({
  params: orgIdentifierParam,
});

export const createApiKeySchema = z.object({
  params: orgIdentifierParam,
  body: z.object({
    name: z
      .string({ error: "Key name is required" })
      .trim()
      .min(1, { error: "Key name cannot be empty" })
      .max(100, { error: "Key name is too long" }),
    scopes: z.array(z.string().trim().min(1)).optional(),
    expiresAt: z.coerce.date().optional(),
  }),
});

export const rotateApiKeySchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
    keyId: z.string().trim().min(1),
  }),
  body: z.object({
    otp: z
      .string({ error: "OTP is required" })
      .regex(/^\d{6}$/, { error: "OTP must be exactly 6 digits" }),
  }),
});

export const revokeApiKeySchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
    keyId: z.string().trim().min(1),
  }),
  body: z.object({
    otp: z
      .string({ error: "OTP is required" })
      .regex(/^\d{6}$/, { error: "OTP must be exactly 6 digits" }),
  }),
});

export const completeMfaSetupSchema = z.object({
  params: orgIdentifierParam,
  body: z.object({
    otp: z
      .string({ error: "OTP is required" })
      .regex(/^\d{6}$/, { error: "OTP must be exactly 6 digits" }),
  }),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>["body"];
export type RotateApiKeyInput = z.infer<typeof rotateApiKeySchema>["body"];
export type RevokeApiKeyInput = z.infer<typeof revokeApiKeySchema>["body"];
export type CompleteMfaSetupInput = z.infer<
  typeof completeMfaSetupSchema
>["body"];
