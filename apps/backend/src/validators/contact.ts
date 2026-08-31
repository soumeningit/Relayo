import { z } from "zod";

export const submitContactSchema = z.object({
  body: z.object({
    name: z
      .string({ error: "Name is required" })
      .trim()
      .min(1, { error: "Name is required" })
      .max(120, { error: "Name is too long" }),
    email: z.email({ error: "A valid email is required" }),
    message: z
      .string({ error: "Message is required" })
      .trim()
      .min(10, { error: "Message must be at least 10 characters" })
      .max(5000, { error: "Message is too long" }),
  }),
});
