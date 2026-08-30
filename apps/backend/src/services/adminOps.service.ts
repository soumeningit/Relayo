import { prisma, Prisma } from "@repo/db";
import { getBullMQConnection, getRedisClient } from "@repo/redis";
import { Queue } from "bullmq";
import { AppError } from "../errors/AppError";
import {
  pageResponse,
  parsePaginationQuery,
  type PaginationQueryOptions,
} from "../utils/pagination";
import type { Context } from "./admin.service";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function isNumericId(q: string): boolean {
  return /^\d+$/.test(q);
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function mapDeliveryStatus(
  status: string,
): "PENDING" | "DELIVERED" | "FAILED" | "DEAD_LETTER" | "PAUSED" {
  switch (status) {
    case "SUCCESS":
      return "DELIVERED";
    case "FAILED":
      return "FAILED";
    case "DEAD_LETTER":
      return "DEAD_LETTER";
    case "PAUSED":
      return "PAUSED";
    default:
      return "PENDING";
  }
}

/* ------------------------------------------------------------------ */
/* Destinations                                                        */
/* ------------------------------------------------------------------ */

export async function listAdminDestinations() {
  const rows = await prisma.destination.findMany({
    include: { organization: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return rows.map((d) => ({
    id: String(d.id),
    organizationId: String(d.organizationId),
    organizationName: d.organization.name,
    url: d.url,
    host: hostOf(d.url),
    status: d.status === "PAUSED" ? "paused" : "active",
    consecutiveFailures: d.consecutiveFailures,
    createdAt: d.createdAt.toISOString(),
  }));
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export async function listAdminEvents(
  filters?: {
    organizationId?: string;
    eventType?: string;
    search?: string;
  },
  pagination: PaginationQueryOptions = {},
) {
  const q = filters?.search?.trim().toLowerCase();
  const { page, pageSize, skip, take } = parsePaginationQuery(pagination);
  const where: Prisma.EventWhereInput = {
    ...(filters?.organizationId
      ? { organizationId: BigInt(filters.organizationId) }
      : {}),
    ...(filters?.eventType?.trim()
      ? { eventType: { contains: filters.eventType.trim(), mode: "insensitive" } }
      : {}),
    ...(q
      ? {
          OR: [
            { eventType: { contains: q, mode: "insensitive" } },
            { organization: { name: { contains: q, mode: "insensitive" } } },
            ...(isNumericId(q) ? [{ id: BigInt(q) }] : []),
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        organization: { select: { name: true } },
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.event.count({ where }),
  ]);

  return pageResponse(
    items.map((event) => ({
      id: String(event.id),
      organizationId: String(event.organizationId),
      organizationName: event.organization.name,
      eventType: event.eventType,
      payload: (event.payload as Record<string, unknown>) ?? {},
      createdAt: event.createdAt.toISOString(),
      deliveryCount: event._count.deliveries,
    })),
    total,
    page,
    pageSize,
  );
}

export async function getAdminEvent(id: string) {
  const event = await prisma.event.findUnique({
    where: { id: BigInt(id) },
    include: {
      organization: { select: { name: true } },
      _count: { select: { deliveries: true } },
    },
  });
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

  return {
    id: String(event.id),
    organizationId: String(event.organizationId),
    organizationName: event.organization.name,
    eventType: event.eventType,
    payload: (event.payload as Record<string, unknown>) ?? {},
    createdAt: event.createdAt.toISOString(),
    deliveryCount: event._count.deliveries,
  };
}

/* ------------------------------------------------------------------ */
/* Deliveries                                                          */
/* ------------------------------------------------------------------ */

const TERMINAL_DELIVERY_STATUSES = ["SUCCESS", "FAILED", "DEAD_LETTER", "PAUSED"] as const;

type AdminDeliveryStatusFilter = (typeof TERMINAL_DELIVERY_STATUSES)[number] | "PENDING";

function mapWhereStatus(ui: string): AdminDeliveryStatusFilter {
  const normalized = ui.toUpperCase();
  if (normalized === "DELIVERED") return "SUCCESS";
  return normalized as AdminDeliveryStatusFilter;
}

function mapDelivery(d: {
  id: bigint;
  organizationId: bigint;
  eventId: bigint;
  destinationId: bigint;
  status: string;
  latencyMs: number | null;
  lastResponseStatusCode: number | null;
  lastErrorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  organization: { name: string };
  event: { eventType: string };
  destination: { url: string };
  deliveryAttempts: {
    attemptNumber: number;
    responseCode: number | null;
    latencyMs: number | null;
    errorMessage: string | null;
    attemptedAt: Date;
  }[];
}) {
  return {
    id: String(d.id),
    organizationId: String(d.organizationId),
    organizationName: d.organization.name,
    eventId: String(d.eventId),
    eventType: d.event.eventType,
    destinationId: String(d.destinationId),
    destinationHost: hostOf(d.destination.url),
    status: mapDeliveryStatus(d.status),
    attempts: d.deliveryAttempts.map((a) => ({
      attemptNumber: a.attemptNumber,
      responseCode: a.responseCode,
      latencyMs: a.latencyMs,
      error: a.errorMessage,
      attemptedAt: a.attemptedAt.toISOString(),
    })),
    lastResponseCode: d.lastResponseStatusCode,
    lastError: d.lastErrorMessage,
    latencyMs: d.latencyMs,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export async function listAdminDeliveries(
  filters?: {
    organizationId?: string;
    status?: string;
    destinationId?: string;
    eventId?: string;
    search?: string;
  },
  pagination: PaginationQueryOptions = {},
) {
  const q = filters?.search?.trim().toLowerCase();
  const { page, pageSize, skip, take } = parsePaginationQuery(pagination);
  const where: Prisma.DeliveryWhereInput = {
    ...(filters?.organizationId
      ? { organizationId: BigInt(filters.organizationId) }
      : {}),
    ...(filters?.destinationId
      ? { destinationId: BigInt(filters.destinationId) }
      : {}),
    ...(filters?.eventId ? { eventId: BigInt(filters.eventId) } : {}),
    ...(filters?.status ? { status: mapWhereStatus(filters.status) } : {}),
    ...(q
      ? {
          OR: [
            { organization: { name: { contains: q, mode: "insensitive" } } },
            { event: { eventType: { contains: q, mode: "insensitive" } } },
            { destination: { url: { contains: q, mode: "insensitive" } } },
            ...(isNumericId(q) ? [{ id: BigInt(q) }] : []),
          ],
        }
      : {}),
  };

  const summaryWhere: Prisma.DeliveryWhereInput = { ...where };
  delete summaryWhere.status;

  const [rows, total, statusCounts] = await Promise.all([
    prisma.delivery.findMany({
      where,
      include: {
        organization: { select: { name: true } },
        event: { select: { eventType: true } },
        destination: { select: { url: true } },
        deliveryAttempts: { orderBy: { attemptNumber: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take,
    }),
    prisma.delivery.count({ where }),
    prisma.delivery.groupBy({
      by: ["status"],
      where: summaryWhere,
      _count: { _all: true },
    }),
  ]);

  const summary = { total, pending: 0, failed: 0 };
  statusCounts.forEach((row) => {
    const count = (row._count as { _all: number } | undefined)?._all ?? 0;
    if (row.status === "PENDING") summary.pending += count;
    if (row.status === "FAILED" || row.status === "DEAD_LETTER") {
      summary.failed += count;
    }
  });

  return {
    ...pageResponse(rows.map(mapDelivery), total, page, pageSize),
    summary,
  };
}

export async function getAdminDelivery(id: string) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: BigInt(id) },
    include: {
      organization: { select: { name: true } },
      event: { select: { eventType: true } },
      destination: { select: { url: true } },
      deliveryAttempts: { orderBy: { attemptNumber: "asc" } },
    },
  });
  if (!delivery) throw new AppError("Delivery not found", 404, "DELIVERY_NOT_FOUND");

  return mapDelivery(delivery);
}

/* ------------------------------------------------------------------ */
/* Incidents                                                           */
/* ------------------------------------------------------------------ */

function mapIncident(i: {
  id: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  startedAt: Date;
  resolvedAt: Date | null;
}) {
  return {
    id: i.id,
    severity:
      i.severity === "CRITICAL"
        ? "critical"
        : i.severity === "WARNING"
          ? "warning"
          : "info",
    title: i.title,
    message: i.message,
    status: i.status === "OPEN" ? "open" : "resolved",
    startedAt: i.startedAt.toISOString(),
    ...(i.resolvedAt ? { resolvedAt: i.resolvedAt.toISOString() } : {}),
  };
}

export async function listAdminIncidents() {
  const incidents = await prisma.incident.findMany({
    orderBy: { startedAt: "desc" },
    take: 300,
  });
  return incidents.map(mapIncident);
}

export async function listOpenIncidents() {
  const incidents = await prisma.incident.findMany({
    where: { status: "OPEN" },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  return incidents.map(mapIncident);
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

async function getRedisMemoryMb(): Promise<number | null> {
  try {
    const redisClient = getRedisClient();
    const info = await redisClient.info("memory");
    const match = info.match(/used_memory:(\d+)/);
    if (!match) return null;
    return Math.round(Number(match[1]) / 1048576);
  } catch {
    return null;
  }
}

interface BucketRow {
  bucket: Date;
  count: number;
}

interface AttemptBucketRow {
  bucket: Date;
  attempts: number;
  failed: number;
}

async function buildHealthSeries(): Promise<
  { timestamp: string; eventsPerMinute: number; errorRatePct: number }[]
> {
  const start = new Date(Date.now() - 120 * 60 * 1000);

  const [eventRows, attemptRows] = await Promise.all([
    prisma.$queryRaw<
      BucketRow[]
    >`SELECT date_trunc('minute', created_at) AS bucket, COUNT(*)::int AS count FROM events WHERE created_at >= ${start} GROUP BY 1`,
    prisma.$queryRaw<
      AttemptBucketRow[]
    >`SELECT date_trunc('minute', attempted_at) AS bucket, COUNT(*)::int AS attempts, COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed FROM delivery_attempts WHERE attempted_at >= ${start} GROUP BY 1`,
  ]);

  const eventsByMinute = new Map<number, number>();
  (eventRows as BucketRow[]).forEach((row) => {
    const ms =
      row.bucket instanceof Date ? row.bucket.getTime() : new Date(row.bucket).getTime();
    eventsByMinute.set(ms, row.count);
  });

  const attemptsByMinute = new Map<number, { attempts: number; failed: number }>();
  (attemptRows as AttemptBucketRow[]).forEach((row) => {
    const ms =
      row.bucket instanceof Date ? row.bucket.getTime() : new Date(row.bucket).getTime();
    attemptsByMinute.set(ms, { attempts: row.attempts, failed: row.failed });
  });

  const series: { timestamp: string; eventsPerMinute: number; errorRatePct: number }[] = [];
  for (let i = 119; i >= 0; i--) {
    const bucketMs = Date.now() - i * 60 * 1000;
    const key = Math.floor(bucketMs / 60_000) * 60_000;
    const events = eventsByMinute.get(key) ?? 0;
    const attemptBucket = attemptsByMinute.get(key);
    const attempts = attemptBucket?.attempts ?? 0;
    const failed = attemptBucket?.failed ?? 0;
    series.push({
      timestamp: new Date(bucketMs).toISOString(),
      eventsPerMinute: events,
      errorRatePct:
        attempts === 0 ? 0 : Number(((failed / attempts) * 100).toFixed(1)),
    });
  }
  return series;
}

export async function getAdminHealth() {
  const now = Date.now();
  const last5m = new Date(now - 5 * 60 * 1000);
  const lastHour = new Date(now - HOUR);

  const [
    events5m,
    attempts5m,
    success5m,
    attemptsHour,
    failedHour,
    deadLetterTotal,
    deadLetter30d,
    openBreakers,
    latencyRows,
    deliveryBeats,
    redisMemoryMb,
  ] = await Promise.all([
    prisma.event.count({ where: { createdAt: { gte: last5m } } }),
    prisma.deliveryAttempt.count({ where: { attemptedAt: { gte: last5m } } }),
    prisma.deliveryAttempt.count({
      where: { status: "SUCCESS", attemptedAt: { gte: last5m } },
    }),
    prisma.deliveryAttempt.count({ where: { attemptedAt: { gte: lastHour } } }),
    prisma.deliveryAttempt.count({
      where: { status: "FAILED", attemptedAt: { gte: lastHour } },
    }),
    prisma.delivery.count({ where: { status: "DEAD_LETTER" } }),
    prisma.delivery.count({
      where: { status: "DEAD_LETTER", createdAt: { gte: new Date(now - 30 * DAY) } },
    }),
    prisma.destination.count({
      where: { breakerOpenedAt: { not: null } },
    }),
    prisma.$queryRaw<{ p95: number | null }[]>`SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)::float8 AS p95 FROM delivery_attempts WHERE latency_ms IS NOT NULL AND attempted_at >= ${lastHour}`,
    prisma.deliveryAttempt.count({ where: { attemptedAt: { gte: last5m } } }),
    getRedisMemoryMb(),
  ]);

  const p95 = Math.round(latencyRows[0]?.p95 ?? 0);

  let queueDepth = 0;
  let queueCompleted = 0;
  let queueFailed = 0;
  let deliveryHealthy = true;
  try {
    const queue = new Queue("relayo_deliveries", {
      connection: getBullMQConnection(),
    });
    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "delayed",
      "completed",
      "failed",
    );
    queueDepth = counts.waiting + counts.active + counts.delayed;
    queueCompleted = counts.completed;
    queueFailed = counts.failed;
    deliveryHealthy = queueFailed === 0;
    await queue.close();
  } catch {
    // Redis unreachable — health reflects degraded state below.
  }

  const pendingCount = await prisma.delivery.count({ where: { status: "PENDING" } });
  const totalAttempts = await prisma.deliveryAttempt.count();
  const totalDeliveries = await prisma.delivery.count();
  const deadLetterSweep = await prisma.delivery.count({ where: { status: "DEAD_LETTER" } });

  const incidents = await prisma.incident.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  const redisRegion = process.env.REDIS_REGION ?? "ap-south-1";

  return {
    metrics: {
      eventsPerMinute: Math.round(events5m / 5),
      attemptsPerMinute: Math.round(attempts5m / 5),
      deliveredPerMinute: Math.round(success5m / 5),
      p95LatencyMs: p95,
      errorRatePct:
        attemptsHour === 0 ? 0 : Number(((failedHour / attemptsHour) * 100).toFixed(1)),
      queueDepth,
      deadLetterTotal,
      deadLetter30d,
      openCircuitBreakers: openBreakers,
      workerCount: Number(process.env.DELIVERY_WORKER_CONCURRENCY || 1),
      redisMemoryMb: redisMemoryMb ?? 0,
      redisRegion,
      rateLimitUsagePct: Number(process.env.RATE_LIMIT_USAGE_PCT || 0),
    },
    series: await buildHealthSeries(),
    queues: [
      {
        name: "outbound-deliveries",
        depth: queueDepth,
        processed: queueCompleted,
        stalled: 0,
        jobsPerSecond: deliveryBeats / 300,
        healthy: deliveryHealthy,
        note: deliveryHealthy ? "Steady" : "Failed jobs detected",
      },
      {
        name: "retry-backoff",
        depth: pendingCount,
        processed: totalAttempts,
        stalled: 0,
        jobsPerSecond: attempts5m / 300,
        healthy: true,
        note: "Normal",
      },
      {
        name: "dead-letter-sweep",
        depth: deadLetterSweep,
        processed: totalDeliveries,
        stalled: 0,
        jobsPerSecond: 0,
        healthy: true,
        note: "Idle",
      },
    ],
    incidents: incidents.map(mapIncident),
  };
}

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

const CATEGORY_MAP: Record<string, "AUTH" | "SECURITY" | "ORGANIZATION" | "USER" | "BILLING" | "SYSTEM"> = {
  auth: "AUTH",
  security: "SECURITY",
  organization: "ORGANIZATION",
  user: "USER",
  billing: "BILLING",
  system: "SYSTEM",
};

const ACTOR_MAP: Record<string, "ADMIN" | "USER" | "SYSTEM"> = {
  admin: "ADMIN",
  user: "USER",
  system: "SYSTEM",
};

export async function listAuditEntries(filters?: {
  category?: string;
  actorType?: string;
  query?: string;
}) {
  const q = filters?.query?.trim().toLowerCase();
  const entries = await prisma.adminAuditLog.findMany({
    where: {
      ...(filters?.category ? { category: CATEGORY_MAP[filters.category] } : {}),
      ...(filters?.actorType && filters.actorType !== "all"
        ? { actorType: ACTOR_MAP[filters.actorType] }
        : {}),
      ...(q
        ? {
            OR: [
              { action: { contains: q, mode: "insensitive" } },
              { target: { contains: q, mode: "insensitive" } },
              { actorEmail: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { timestamp: "desc" },
    take: 120,
  });

  return entries.map((entry) => ({
    id: entry.id,
    timestamp: entry.timestamp.toISOString(),
    actorType: entry.actorType.toLowerCase(),
    actorEmail: entry.actorEmail,
    category: entry.category.toLowerCase(),
    action: entry.action,
    target: entry.target,
    ip: entry.ip,
    location: entry.location ?? "",
  }));
}

/* ------------------------------------------------------------------ */
/* Feature flags                                                       */
/* ------------------------------------------------------------------ */

export async function getFeatureFlags() {
  const flags = await prisma.featureFlag.findMany({
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return flags.map((flag) => ({
    id: flag.key,
    label: flag.label,
    description: flag.description ?? "",
    enabled: flag.enabled,
    ...(flag.dangerous ? { dangerous: true } : {}),
  }));
}

export async function updateFeatureFlag(ctx: Context, id: string, enabled: boolean) {
  const flag = await prisma.featureFlag.findUnique({ where: { key: id } });
  if (!flag) throw new AppError("Feature flag not found", 404, "FLAG_NOT_FOUND");

  const updated = await prisma.featureFlag.update({
    where: { key: id },
    data: { enabled },
  });

  await writeAudit(ctx, "SYSTEM", `Feature flag ${enabled ? "enabled" : "disabled"}`, flag.label);

  return {
    id: updated.key,
    label: updated.label,
    description: updated.description ?? "",
    enabled: updated.enabled,
    ...(updated.dangerous ? { dangerous: true } : {}),
  };
}

async function writeAudit(
  ctx: Context,
  category: "AUTH" | "SECURITY" | "ORGANIZATION" | "USER" | "BILLING" | "SYSTEM",
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
/* Config status                                                       */
/* ------------------------------------------------------------------ */

export async function getConfigStatus() {
  const redisHealthy = (await getRedisMemoryMb()) !== null;
  const rateLimitUsagePct = Number(process.env.RATE_LIMIT_USAGE_PCT || 0);

  return [
    {
      key: "smtp",
      label: "Email / SMTP",
      status: process.env.RESEND_API_KEY || process.env.SMTP_HOST ? "healthy" : "warning",
      detail: process.env.RESEND_API_KEY || process.env.SMTP_HOST
        ? "resend.com · 3 retries"
        : "Not configured",
    },
    {
      key: "redis",
      label: "Redis (Upstash)",
      status: redisHealthy ? "healthy" : "down",
      detail: redisHealthy
        ? `${process.env.REDIS_REGION ?? "ap-south-1"} · reachable`
        : "Unreachable",
    },
    {
      key: "payments",
      label: "Payments (Razorpay)",
      status: process.env.RAZORPAY_KEY_ID ? "healthy" : "warning",
      detail: process.env.RAZORPAY_KEY_ID ? "Live mode · v1" : "Keys not configured",
    },
    {
      key: "rate-limiter",
      label: "Rate limiter",
      status: rateLimitUsagePct >= 90 ? "warning" : "healthy",
      detail: `At ${rateLimitUsagePct}% of daily quota`,
    },
    {
      key: "webhook-worker",
      label: "Webhook workers",
      status: "healthy",
      detail: `${Number(process.env.DELIVERY_WORKER_CONCURRENCY || 1)} worker(s) connected`,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* CSV export                                                          */
/* ------------------------------------------------------------------ */

function csvEscape(value: string | number | boolean | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(header: string[], rows: (string | number | boolean | null)[][]): string {
  return [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}

export async function buildAdminCsv(kind: "organizations" | "users" | "payments") {
  if (kind === "organizations") {
    const orgs = await prisma.organization.findMany({
      include: { _count: { select: { members: true } } },
      take: 100_000,
    });
    return toCsv(
      ["id", "name", "slug", "plan", "status", "memberCount", "createdAt"],
      orgs.map((org) => [
        String(org.id),
        org.name,
        org.slug,
        org.PaymentType,
        org.status,
        org._count.members,
        org.createdAt.toISOString(),
      ]),
    );
  }
  if (kind === "users") {
    const users = await prisma.user.findMany({
      include: { _count: { select: { organizationMembers: true } } },
      take: 100_000,
    });
    return toCsv(
      ["id", "name", "email", "status", "mfaEnabled", "organizationCount", "joinedAt"],
      users.map((user) => [
        user.userId,
        user.name,
        user.email,
        user.status,
        user.mfaEnabled,
        user._count.organizationMembers,
        user.createdAt.toISOString(),
      ]),
    );
  }
  const payments = await prisma.payment.findMany({
    include: { organization: { select: { name: true } } },
    take: 100_000,
  });
  return toCsv(
    ["id", "organizationId", "organizationName", "plan", "amount", "status", "paidAt"],
    payments.map((payment) => [
      payment.id,
      String(payment.organizationId),
      payment.organization?.name ?? "—",
      payment.planType ?? "FREE",
      payment.amount,
      payment.status,
      (payment.capturedAt ?? payment.createdAt).toISOString(),
    ]),
  );
}