import { prisma, Prisma, type PaymentType } from "@repo/db";
import { AppError } from "../errors/AppError";
import { generateJwtToken } from "../utils/helper";
import {
  pageResponse,
  parsePaginationQuery,
  type PaginationQueryOptions,
} from "../utils/pagination";
import { sendPasswordResetEmail } from "./email.service";

/* ------------------------------------------------------------------ */
/* Constants (decided: quotas/MRR live here, not in the DB)            */
/* ------------------------------------------------------------------ */

type AdminPlan = "FREE" | "PRO" | "SCALE";

const PLAN_MRR: Record<AdminPlan, number> = { FREE: 0, PRO: 999, SCALE: 2999 };
const PLAN_QUOTAS: Record<AdminPlan, number | null> = {
  FREE: 100_000,
  PRO: 2_000_000,
  SCALE: null,
};
const DAY = 24 * 60 * 60 * 1000;

function toUIPlan(plan: PaymentType | null): AdminPlan {
  if (plan === "PRO" || plan === "SCALE") return plan;
  return "FREE";
}

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
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export async function getAdminProfile(ctx: Context) {
  const user = await prisma.user.findUnique({
    where: { id: ctx.admin.id },
  });
  if (!user) throw new AppError("Admin not found", 404, "ADMIN_NOT_FOUND");

  const lastSession = await prisma.session.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return {
    name: user.name,
    email: user.email,
    mfaEnabled: user.mfaEnabled,
    lastLoginAt: (lastSession?.createdAt ?? user.updatedAt).toISOString(),
  };
}

export async function updateAdminProfile(ctx: Context, name: string) {
  const user = await prisma.user.update({
    where: { id: ctx.admin.id },
    data: { name },
  });

  const lastSession = await prisma.session.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return {
    name: user.name,
    email: user.email,
    mfaEnabled: user.mfaEnabled,
    lastLoginAt: (lastSession?.createdAt ?? user.updatedAt).toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Organizations                                                       */
/* ------------------------------------------------------------------ */

interface OrgRow {
  id: bigint;
  name: string;
  slug: string;
  PaymentType: PaymentType;
  status: string;
  paymentStatus: string;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  adminNotes: string | null;
  _count: { members: number };
}

function mapOrg(org: OrgRow) {
  return {
    id: String(org.id),
    name: org.name,
    slug: org.slug,
    plan: toUIPlan(org.PaymentType),
    status: org.status === "SUSPENDED" ? "suspended" : "active",
    memberCount: org._count.members,
    mrr: PLAN_MRR[toUIPlan(org.PaymentType)],
    createdAt: org.createdAt.toISOString(),
  };
}

export async function listAdminOrganizations(
  search?: string,
  pagination: PaginationQueryOptions = {},
) {
  const q = search?.trim().toLowerCase();
  const where: Prisma.OrganizationWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const { page, pageSize, skip, take } = parsePaginationQuery(pagination);
  const [items, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.organization.count({ where }),
  ]);
  return pageResponse(items.map(mapOrg), total, page, pageSize);
}

export async function getAdminOrganization(id: string) {
  const organizationId = BigInt(id);
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      _count: { select: { members: true, destinations: true } },
      members: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!organization) throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");

  const now = Date.now();
  const [events24h, deliveries30d, totalAttempts, successAttempts, pendingRetries] =
    await Promise.all([
      prisma.event.count({
        where: { organizationId, createdAt: { gte: new Date(now - DAY) } },
      }),
      prisma.delivery.count({
        where: { organizationId, createdAt: { gte: new Date(now - 30 * DAY) } },
      }),
      prisma.deliveryAttempt.count({
        where: {
          delivery: { organizationId },
          attemptedAt: { gte: new Date(now - 30 * DAY) },
        },
      }),
      prisma.deliveryAttempt.count({
        where: {
          delivery: { organizationId },
          status: "SUCCESS",
          attemptedAt: { gte: new Date(now - 30 * DAY) },
        },
      }),
      prisma.delivery.count({ where: { organizationId, status: "PENDING" } }),
    ]);

  const payments = await prisma.payment.findMany({
    where: { organizationId },
    include: { organization: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    organization: mapOrg(organization),
    usage: {
      destinations: organization._count.destinations,
      events24h,
      deliveries30d,
      successRatePct:
        totalAttempts === 0
          ? 100
          : Math.round((successAttempts / totalAttempts) * 1000) / 10,
      pendingRetries,
    },
    members: organization.members.map((m) => ({
      id: String(m.user.id),
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.createdAt.toISOString(),
    })),
    payments: payments.map((p) => mapPayment(p)),
  };
}

export async function updateOrganizationStatus(
  ctx: Context,
  id: string,
  status: "active" | "suspended",
) {
  const organizationId = BigInt(id);
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!organization) throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: { status: status === "suspended" ? "SUSPENDED" : "ACTIVE" },
    include: { _count: { select: { members: true } } },
  });

  await writeAdminAudit(
    ctx,
    "ORGANIZATION",
    status === "suspended" ? "Organization suspended" : "Organization reactivated",
    organization.name,
  );

  return mapOrg(updated);
}

export async function changeOrganizationPlan(
  ctx: Context,
  id: string,
  plan: AdminPlan,
) {
  const organizationId = BigInt(id);
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!organization) throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");
  if (organization.PaymentType === plan) {
    throw new AppError("Organization is already on this plan", 400, "PLAN_UNCHANGED");
  }

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: { PaymentType: plan },
    include: { _count: { select: { members: true } } },
  });

  await writeAdminAudit(
    ctx,
    "BILLING",
    `Plan changed to ${plan}`,
    organization.name,
  );

  return mapOrg(updated);
}

export async function extendOrganizationPeriod(ctx: Context, id: string) {
  const organizationId = BigInt(id);
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!organization) throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");

  const base = organization.currentPeriodEnd
    ? Math.max(organization.currentPeriodEnd.getTime(), Date.now())
    : Date.now();
  const next = new Date(base + 30 * DAY);

  await prisma.organization.update({
    where: { id: organizationId },
    data: { currentPeriodEnd: next },
  });

  await writeAdminAudit(
    ctx,
    "BILLING",
    "Billing period extended 30 days",
    organization.name,
  );

  return next.toISOString();
}

export async function deleteOrganization(ctx: Context, id: string) {
  const organizationId = BigInt(id);
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!organization) throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");

  await prisma.organization.delete({ where: { id: organizationId } });

  await writeAdminAudit(
    ctx,
    "ORGANIZATION",
    "Organization deleted",
    organization.name,
  );
}

export async function getOrganizationNotes(id: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: BigInt(id) },
    select: { adminNotes: true },
  });
  if (!organization) throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");
  return organization.adminNotes ?? "";
}

export async function updateOrganizationNotes(
  ctx: Context,
  id: string,
  notes: string,
) {
  const organizationId = BigInt(id);
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!organization) throw new AppError("Organization not found", 404, "ORG_NOT_FOUND");

  await prisma.organization.update({
    where: { id: organizationId },
    data: { adminNotes: notes },
  });

  await writeAdminAudit(
    ctx,
    "ORGANIZATION",
    "Internal notes updated",
    organization.name,
  );

  return notes;
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

interface UserRow {
  id: bigint;
  userId: string;
  name: string;
  email: string;
  status: string;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  role: string;
  createdAt: Date;
  _count: { organizationMembers: number };
}

function mapUser(row: UserRow) {
  return {
    id: String(row.userId),
    name: row.name,
    email: row.email,
    status:
      row.status === "SUSPENDED"
        ? "suspended"
        : row.isEmailVerified
          ? "verified"
          : "unverified",
    mfaEnabled: row.mfaEnabled,
    organizationCount: row._count.organizationMembers,
    joinedAt: row.createdAt.toISOString(),
  };
}

export async function listAdminUsers(
  search?: string,
  pagination: PaginationQueryOptions = {},
) {
  const q = search?.trim().toLowerCase();
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const { page, pageSize, skip, take } = parsePaginationQuery(pagination);
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { _count: { select: { organizationMembers: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);
  return pageResponse(items.map(mapUser), total, page, pageSize);
}

export async function updateUserStatus(
  ctx: Context,
  id: string,
  status: "verified" | "unverified" | "suspended",
) {
  const user = await prisma.user.findUnique({ where: { userId: id } });
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  if (user.role === "SUPER_ADMIN") {
    throw new AppError("Cannot modify the super admin account", 400, "SUPER_ADMIN_IMMUTABLE");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data:
      status === "suspended"
        ? { status: "SUSPENDED", isEmailVerified: true }
        : status === "verified"
          ? { status: "ACTIVE", isEmailVerified: true }
          : { status: "PENDING", isEmailVerified: false },
    include: { _count: { select: { organizationMembers: true } } },
  });

  await writeAdminAudit(
    ctx,
    "USER",
    status === "suspended"
      ? "User account suspended"
      : status === "verified"
        ? "User verified"
        : "User marked unverified",
    user.email,
  );

  return mapUser(updated);
}

export async function resetUserPassword(ctx: Context, id: string) {
  const user = await prisma.user.findUnique({ where: { userId: id } });
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  if (user.role === "SUPER_ADMIN") {
    throw new AppError("Cannot reset the super admin password here", 400, "SUPER_ADMIN_IMMUTABLE");
  }

  const baseURL = process.env.FRONTEND_URL;
  if (!baseURL) {
    throw new AppError("FRONTEND_URL is not configured", 500, "ENV_MISSING");
  }

  const resetToken = generateJwtToken(
    { userId: user.id, email: user.email },
    "1h",
  );
  const resetURL = `${baseURL}/reset-password?token=${resetToken}`;

  await sendPasswordResetEmail(user.email, user.name, resetURL);

  await writeAdminAudit(
    ctx,
    "USER",
    "Password reset requested",
    user.email,
  );

  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    include: { _count: { select: { organizationMembers: true } } },
  });

  return mapUser(fresh!);
}

export async function disableUserMfa(ctx: Context, id: string) {
  const user = await prisma.user.findUnique({ where: { userId: id } });
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  if (user.role === "SUPER_ADMIN") {
    throw new AppError("Cannot disable MFA on the super admin account", 400, "SUPER_ADMIN_IMMUTABLE");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: false },
    }),
    prisma.userMfa.deleteMany({ where: { userId: user.id } }),
  ]);

  await writeAdminAudit(
    ctx,
    "SECURITY",
    "MFA disabled (forced reset)",
    user.email,
  );

  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    include: { _count: { select: { organizationMembers: true } } },
  });

  return mapUser(fresh!);
}

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */

function mapPayment(p: {
  id: string;
  organizationId: bigint;
  organization?: { name: string } | null;
  planType: PaymentType | null;
  amount: number;
  status: string;
  capturedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: p.id,
    organizationId: String(p.organizationId),
    organizationName: p.organization?.name ?? "—",
    plan: toUIPlan(p.planType),
    amount: p.amount,
    status:
      p.status === "CAPTURED"
        ? "paid"
        : p.status === "FAILED"
          ? "failed"
          : p.status === "REFUNDED" || p.status === "PARTIALLY_REFUNDED"
            ? "refunded"
            : "pending",
    paidAt: (p.capturedAt ?? p.createdAt).toISOString(),
  };
}

export async function listAdminPayments(status?: string) {
  const payments = await prisma.payment.findMany({
    include: { organization: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  let mapped = payments.map(mapPayment);
  if (status && status !== "all") {
    mapped = mapped.filter((p) => p.status === status);
  }
  return mapped;
}

export async function refundPayment(ctx: Context, id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { organization: { select: { name: true } } },
  });
  if (!payment) throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");

  if (payment.status !== "CAPTURED") {
    throw new AppError("Only captured payments can be refunded", 400, "CANNOT_REFUND");
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: "REFUNDED",
      refundedAt: new Date(),
      amountRefunded: payment.amount,
    },
    include: { organization: { select: { name: true } } },
  });

  await writeAdminAudit(
    ctx,
    "BILLING",
    `Payment ${payment.id} refunded`,
    updated.organization?.name ?? "—",
  );

  return mapPayment(updated);
}

export async function retryPayment(ctx: Context, id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { organization: { select: { name: true } } },
  });
  if (!payment) throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: "CAPTURED",
      capturedAt: new Date(),
      captured: true,
      errorCode: null,
      errorDescription: null,
    },
    include: { organization: { select: { name: true } } },
  });

  await writeAdminAudit(
    ctx,
    "BILLING",
    `Payment ${payment.id} retried successfully`,
    updated.organization?.name ?? "—",
  );

  return mapPayment(updated);
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export async function getAdminOverview() {
  const now = Date.now();
  const [
    totalOrganizations,
    suspendedOrganizations,
    orgsByPlan,
    usersCount,
    events24h,
    deliveries30d,
    totalAttempts,
    successAttempts,
    payments,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { status: "SUSPENDED" } }),
    prisma.organization.groupBy({
      by: ["PaymentType", "status"],
      _count: { _all: true },
    }),
    prisma.user.count(),
    prisma.event.count({ where: { createdAt: { gte: new Date(now - DAY) } } }),
    prisma.delivery.count({
      where: { createdAt: { gte: new Date(now - 30 * DAY) } },
    }),
    prisma.deliveryAttempt.count({
      where: { attemptedAt: { gte: new Date(now - 30 * DAY) } },
    }),
    prisma.deliveryAttempt.count({
      where: { status: "SUCCESS", attemptedAt: { gte: new Date(now - 30 * DAY) } },
    }),
    prisma.payment.findMany({
      include: { organization: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const activeOrganizations = totalOrganizations - suspendedOrganizations;
  const byPlanMap = new Map<AdminPlan, { plan: AdminPlan; label: string; count: number }>();
  orgsByPlan.forEach((row) => {
    if (row.status === "SUSPENDED") return;
    const plan = toUIPlan(row.PaymentType);
    const entry =
      byPlanMap.get(plan) ?? {
        plan,
        label: plan === "FREE" ? "Free" : plan === "PRO" ? "Pro" : "Scale",
        count: 0,
      };
    entry.count += row._count._all;
    byPlanMap.set(plan, entry);
  });

  const successRatePct =
    totalAttempts === 0 ? 100 : Math.round((successAttempts / totalAttempts) * 1000) / 10;
  const byPlan = [...byPlanMap.values()].sort((a, b) => b.count - a.count);

  return {
    stats: {
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      totalUsers: usersCount,
      events24h,
      deliveries30d,
      successRatePct,
      mrr: byPlan.reduce((sum, entry) => sum + entry.count * PLAN_MRR[entry.plan], 0),
    },
    organizationsByPlan: byPlan,
    recentPayments: payments.map(mapPayment),
  };
}

/* ------------------------------------------------------------------ */
/* Revenue + churn                                                     */
/* ------------------------------------------------------------------ */

export async function getAdminRevenue() {
  const start = new Date(Date.now() - 30 * DAY);
  const [collectedAgg, refundedAgg, byPlanRows, seriesRows] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: "CAPTURED" },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } },
      _sum: { amountRefunded: true },
    }),
    prisma.payment.groupBy({
      by: ["planType"],
      where: { status: "CAPTURED" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.$queryRaw<
      { day: string; collected: number; refunded: number }[]
    >`SELECT to_char(COALESCE(captured_at, created_at), 'YYYY-MM-DD') AS day,
              COALESCE(SUM(CASE WHEN status = 'CAPTURED' THEN amount ELSE 0 END)::int, 0) AS collected,
              COALESCE(SUM(CASE WHEN status IN ('REFUNDED', 'PARTIALLY_REFUNDED') THEN amount_refunded ELSE 0 END)::int, 0) AS refunded
       FROM payments
       WHERE status IN ('CAPTURED', 'REFUNDED', 'PARTIALLY_REFUNDED')
         AND COALESCE(captured_at, created_at) >= ${start}
       GROUP BY 1`,
  ]);

  const byPlanMap = new Map<
    AdminPlan,
    { plan: AdminPlan; label: string; collected: number; count: number }
  >();
  byPlanRows.forEach((row) => {
    const plan = toUIPlan(row.planType);
    const entry =
      byPlanMap.get(plan) ?? {
        plan,
        label: plan === "FREE" ? "Free" : plan === "PRO" ? "Pro" : "Scale",
        collected: 0,
        count: 0,
      };
    entry.collected += row._sum.amount ?? 0;
    entry.count += row._count._all;
    byPlanMap.set(plan, entry);
  });

  // Last 30 days, bucketed by UTC date
  const series: { day: string; collected: number; refunded: number }[] = [];
  const map = new Map<string, { collected: number; refunded: number }>();
  seriesRows.forEach((row) => {
    map.set(row.day, { collected: row.collected, refunded: row.refunded });
  });
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const iso = new Date(today.getTime() - i * DAY).toISOString().slice(0, 10);
    series.push({ day: iso, ...(map.get(iso) ?? { collected: 0, refunded: 0 }) });
  }

  return {
    collectedTotal: collectedAgg._sum.amount ?? 0,
    refundedTotal: refundedAgg._sum.amountRefunded ?? 0,
    byPlan: [...byPlanMap.values()].sort((a, b) => b.collected - a.collected),
    series,
  };
}

export async function listExpiredOrganizations() {
  const organizations = await prisma.organization.findMany({
    where: { currentPeriodEnd: { lt: new Date() } },
    include: {
      _count: { select: { members: true } },
      payments: {
        where: { status: "CAPTURED" },
        orderBy: { capturedAt: "desc" },
        take: 1,
      },
    },
    take: 200,
  });

  return organizations.map((org) => {
    const lastPaid = org.payments[0];
    const lastPaidAt = lastPaid?.capturedAt ?? org.createdAt;
    return {
      organizationId: String(org.id),
      organizationName: org.name,
      slug: org.slug,
      previousPlan: toUIPlan(org.PaymentType),
      lastPaidAt: lastPaidAt.toISOString(),
      daysSinceExpiry: Math.max(
        0,
        Math.floor((Date.now() - (org.currentPeriodEnd?.getTime() ?? Date.now())) / DAY),
      ),
    };
  });
}

export async function getAdminUsage() {
  const now = Date.now();
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      PaymentType: true,
      status: true,
      currentPeriodEnd: true,
    },
    take: 200,
  });

  const eventsByOrg = await prisma.event.groupBy({
    by: ["organizationId"],
    where: { createdAt: { gte: new Date(now - 30 * DAY) } },
    _count: { _all: true },
  });
  const eventsMap = new Map(
    eventsByOrg.map((row) => [
      String(row.organizationId),
      row._count._all,
    ]),
  );

  return organizations
    .map((org) => {
      const plan = toUIPlan(org.PaymentType);
      const quota = PLAN_QUOTAS[plan];
      const periodEnd = org.currentPeriodEnd ?? new Date(now + 30 * DAY);
      return {
        organizationId: String(org.id),
        organizationName: org.name,
        slug: org.slug,
        plan,
        quota,
        used: eventsMap.get(String(org.id)) ?? 0,
        periodStart: new Date(periodEnd.getTime() - 30 * DAY).toISOString(),
        periodEnd: periodEnd.toISOString(),
        status: org.status === "SUSPENDED" ? "suspended" : "active",
      };
    })
    .sort(
      (a, b) =>
        a.used / (a.quota ?? Number.MAX_SAFE_INTEGER) -
        b.used / (b.quota ?? Number.MAX_SAFE_INTEGER),
    );
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

export async function getAdminSearch(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { organizations: [], users: [], payments: [] };

  const [organizations, users, payments] = await Promise.all([
    prisma.organization.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { _count: { select: { members: true } } },
      take: 5,
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { _count: { select: { organizationMembers: true } } },
      take: 5,
    }),
    prisma.payment.findMany({
      where: { organization: { name: { contains: q, mode: "insensitive" } } },
      include: { organization: { select: { name: true } } },
      take: 5,
    }),
  ]);

  return {
    organizations: organizations.map(mapOrg),
    users: users.map(mapUser),
    payments: payments.map(mapPayment),
  };
}