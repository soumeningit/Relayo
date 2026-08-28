import { z } from "zod";

const orgIdentifierParam = z.object({
  identifier: z.string().trim().min(1).max(320),
});

export const listDestinationsSchema = z.object({
  params: orgIdentifierParam,
});

export const acceptEventSchema = z.object({
  body: z.object({
    eventType: z.string().trim().min(1).max(255),
    destinationId: z.string().trim().min(1).max(255).optional(),
    payload: z.record(z.string(), z.any()),
  }),
});

export const getEventsSchema = z.object({
  params: orgIdentifierParam,
});
