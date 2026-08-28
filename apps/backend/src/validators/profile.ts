import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name cannot be empty").max(255).optional(),
    bio: z.string().trim().max(2000, "Bio is too long").optional(),
    avatarUrl: z.string().trim().url("Invalid avatar URL").optional(),
  }),
});

export const updateAddressSchema = z.object({
  body: z.object({
    type: z.enum(["CURRENT", "PERMANENT"]),
    street: z.string().trim().max(255).optional(),
    city: z.string().trim().max(255).optional(),
    state: z.string().trim().max(255).optional(),
    country: z.string().trim().max(255).optional(),
    zipCode: z.string().trim().max(20).optional(),
  }),
});