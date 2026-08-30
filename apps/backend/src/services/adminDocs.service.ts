import { prisma, Prisma } from "@repo/db";
import { AppError } from "../errors/AppError";

/* ------------------------------------------------------------------ */
/* Admin session + audit primitives                                    */
/* ------------------------------------------------------------------ */

export interface Context {
  admin: { id: number; email: string };
  ip?: string;
}

type AuditCategory =
  | "AUTH"
  | "SECURITY"
  | "ORGANIZATION"
  | "USER"
  | "BILLING"
  | "SYSTEM";

async function writeAdminAudit(
  ctx: Context,
  category: AuditCategory,
  action: string,
  target: string,
) {
  await prisma.adminAuditLog.create({
    data: {
      actorType: "ADMIN",
      actorId: ctx.admin.id,
      actorEmail: ctx.admin.email,
      category,
      action,
      target,
      ip: ctx.ip ?? "0.0.0.0",
    },
  });
}

/* ------------------------------------------------------------------ */
/* Docs CRUD                                                           */
/* ------------------------------------------------------------------ */

export interface CreateDocInput {
  slug: string;
  title: string;
  content: string;
  excerpt?: string | null;
  published?: boolean;
  authorName?: string | null;
}

export interface UpdateDocInput {
  slug?: string;
  title?: string;
  content?: string;
  excerpt?: string | null;
  published?: boolean;
  authorName?: string | null;
}

export async function listAllDocs() {
  return prisma.doc.findMany({
    orderBy: { updatedAt: "desc" },
  });
}

export async function createDoc(ctx: Context, input: CreateDocInput) {
  const existing = await prisma.doc.findUnique({
    where: { slug: input.slug },
  });

  if (existing) {
    throw new AppError(
      "A document with this slug already exists",
      409,
      "SLUG_EXISTS",
    );
  }

  const published = input.published ?? false;
  const doc = await prisma.doc.create({
    data: {
      slug: input.slug,
      title: input.title,
      content: input.content,
      excerpt: input.excerpt ?? null,
      published,
      publishedAt: published ? new Date() : null,
      authorName: input.authorName ?? null,
    },
  });

  await writeAdminAudit(
    ctx,
    "SYSTEM",
    published ? "CREATE_DOC" : "CREATE_DOC_DRAFT",
    doc.slug,
  );

  return doc;
}

function parseDocId(id: string): bigint {
  if (!/^\d+$/.test(id)) {
    throw new AppError("Doc id must be a numeric id", 400, "INVALID_DOC_ID");
  }
  return BigInt(id);
}

export async function getDocById(id: string) {
  const doc = await prisma.doc.findUnique({
    where: { id: parseDocId(id) },
  });

  if (!doc) {
    throw new AppError("Document not found", 404, "DOC_NOT_FOUND");
  }

  return doc;
}

export async function updateDoc(ctx: Context, id: string, input: UpdateDocInput) {
  const existing = await prisma.doc.findUnique({
    where: { id: parseDocId(id) },
  });

  if (!existing) {
    throw new AppError("Document not found", 404, "DOC_NOT_FOUND");
  }

  if (input.slug && input.slug !== existing.slug) {
    const clash = await prisma.doc.findUnique({
      where: { slug: input.slug },
    });

    if (clash) {
      throw new AppError(
        "A document with this slug already exists",
        409,
        "SLUG_EXISTS",
      );
    }
  }

  const nextPublished = input.published ?? existing.published;
  const nextPublishedAt =
    nextPublished && !existing.publishedAt ? new Date() : existing.publishedAt;

  const data: Prisma.DocUpdateInput = {
    slug: input.slug,
    title: input.title,
    content: input.content,
    excerpt: input.excerpt,
    authorName: input.authorName,
    published: nextPublished,
    publishedAt: nextPublishedAt,
  };

  const doc = await prisma.doc.update({
    where: { id: parseDocId(id) },
    data,
  });

  const action =
    nextPublished !== existing.published
      ? nextPublished
        ? "PUBLISH_DOC"
        : "UNPUBLISH_DOC"
      : "UPDATE_DOC";

  await writeAdminAudit(ctx, "SYSTEM", action, doc.slug);

  return doc;
}

export async function deleteDoc(ctx: Context, id: string) {
  const existing = await prisma.doc.findUnique({
    where: { id: parseDocId(id) },
  });

  if (!existing) {
    throw new AppError("Document not found", 404, "DOC_NOT_FOUND");
  }

  await prisma.doc.delete({
    where: { id: BigInt(id) },
  });

  await writeAdminAudit(ctx, "SYSTEM", "DELETE_DOC", existing.slug);

  return { deleted: true };
}