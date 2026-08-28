import { z } from "zod";

export const listDeliverySchema = z.object({
  params: z.object({
    identifier: z.string().min(1, "Identifier is required"),
  }),
  query: z.object({
    status: z
      .enum(["pending", "delivered", "failed", "dead_letter", "paused"])
      .optional(),
    destinationId: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const replayDeliverySchema = z.object({
  params: z.object({
    identifier: z.string().trim().min(1, "Identifier is required"),
    deliveryId: z
      .string()
      .regex(/^\d+$/, "Invalid delivery id"),
  }),
});

// import { z } from "zod";

// export const listDeliverySchema = z.object({
//   query: z.object({
//     identifier: z.string().trim().min(1, "Identifier is required"),

//     status: z
//       .enum(["pending", "delivered", "failed", "dead_letter", "paused"])
//       .optional(),

//     destinationId: z.string().optional(),
//   }),
// });
