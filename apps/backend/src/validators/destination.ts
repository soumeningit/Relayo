import { z } from "zod";

const orgIdentifierParam = z.object({
  identifier: z.string().trim().min(1).max(320),
});

export const listDestinationsSchema = z.object({
  params: orgIdentifierParam,
});

export const getDestinationSchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
    destinationId: z.string().trim().min(1),
  }),
});

export const createDestinationSchema = z.object({
  params: orgIdentifierParam,
  body: z.object({
    name: z
      .string({ error: "Name is required" })
      .trim()
      .min(1, { error: "Name cannot be empty" })
      .max(255, { error: "Name is too long" }),
    url: z
      .string({ error: "URL is required" })
      .trim()
      .min(1, { error: "URL cannot be empty" })
      .max(2048, { error: "URL is too long" })
      .pipe(z.url({ error: "Invalid URL format" })),
  }),
});

const destinationIdParam = z.object({
  identifier: z.string().trim().min(1).max(320),
  destinationId: z.string().trim().min(1),
});

export const pauseDestinationSchema = z.object({
  params: destinationIdParam,
});

export const resumeDestinationSchema = z.object({
  params: destinationIdParam,
});

export const rotateSecretSchema = z.object({
  params: destinationIdParam,
});

export const deleteDestinationSchema = z.object({
  params: destinationIdParam,
});

export const getDestinationDetailsSchema = z.object({
  params: destinationIdParam,
});

export type CreateDestinationInput = z.infer<
  typeof createDestinationSchema
>["body"];
