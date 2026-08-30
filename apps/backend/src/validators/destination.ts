import { z } from "zod";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

// Webhook URLs are endpoints the platform POSTs payloads to, so they are
// locked down: HTTPS is required. Plain HTTP is tolerated only for local
// development (localhost / 127.0.0.1), e.g. a local tunnel-less ngrok-free
// setup or a dev receiver on http://localhost:3000/hook.
function isSecureDestinationUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol === "http:") {
    return LOCAL_HOSTNAMES.has(parsed.hostname);
  }

  return parsed.protocol === "https:";
}

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
      .pipe(z.url({ error: "Invalid URL format" }))
      .refine(isSecureDestinationUrl, {
        error:
          "Destination URL must use HTTPS. Plain HTTP is only allowed for localhost/127.0.0.1 (e.g. https://hooks.example.com/webhook or http://localhost:3000/hook).",
      }),
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
