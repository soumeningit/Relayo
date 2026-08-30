import { prisma } from "@repo/db";
import { AppError } from "../errors/AppError";

const PUBLISHED_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  authorName: true,
  publishedAt: true,
} as const;

export async function listPublishedDocs() {
  return prisma.doc.findMany({
    where: { published: true },
    select: { ...PUBLISHED_SELECT },
    orderBy: { publishedAt: "desc" },
  });
}

export async function getPublishedDocBySlug(slug: string) {
  const doc = await prisma.doc.findFirst({
    where: { slug, published: true },
  });

  if (!doc) {
    throw new AppError("Document not found", 404, "DOC_NOT_FOUND");
  }

  return doc;
}