import { z } from "zod";

const slugSchema = z
  .string({ error: "Slug is required" })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    error: "Slug may only contain lowercase letters, numbers and single hyphens",
  })
  .max(120, { error: "Slug is too long" });

export const docSlugParams = z.object({
  params: z.object({
    slug: z.string({ error: "Slug is required" }).min(1, {
      error: "Slug is required",
    }),
  }),
});

const docIdParams = z.object({
  id: z
    .string({ error: "Doc id is required" })
    .regex(/^\d+$/, { error: "Doc id must be a numeric id" }),
});

export const createDocSchema = z.object({
  body: z.object({
    slug: slugSchema,
    title: z
      .string({ error: "Title is required" })
      .trim()
      .min(1, { error: "Title is required" })
      .max(255, { error: "Title is too long" }),
    content: z
      .string({ error: "Content is required" })
      .min(1, { error: "Content is required" }),
    excerpt: z
      .string()
      .trim()
      .max(500, { error: "Excerpt is too long" })
      .optional()
      .nullable(),
    published: z.boolean().optional(),
    authorName: z
      .string()
      .trim()
      .max(120, { error: "Author name is too long" })
      .optional()
      .nullable(),
  }),
});

export const updateDocSchema = z.object({
  params: docIdParams,
  body: z
    .object({
      slug: slugSchema.optional(),
      title: z
        .string({ error: "Title is required" })
        .trim()
        .min(1, { error: "Title is required" })
        .max(255, { error: "Title is too long" })
        .optional(),
      content: z
        .string({ error: "Content is required" })
        .min(1, { error: "Content is required" })
        .optional(),
      excerpt: z
        .string()
        .trim()
        .max(500, { error: "Excerpt is too long" })
        .optional()
        .nullable(),
      published: z.boolean().optional(),
      authorName: z
        .string()
        .trim()
        .max(120, { error: "Author name is too long" })
        .optional()
        .nullable(),
    })
    .refine(
      (data) => Object.values(data).some((value) => value !== undefined),
      { error: "At least one field must be provided" },
    ),
});

export const deleteDocParams = z.object({
  params: docIdParams,
});