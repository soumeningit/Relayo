import { z } from "zod";

export const getEventsSchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().max(320).optional(),
  }),
});

export const getEventDetailsSchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1).max(320),
    eventId: z.string().trim().min(1).max(320),
  }),
});
