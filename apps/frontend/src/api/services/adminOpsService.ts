import { minutesAgo } from "../../lib/time";
import {
  appendAuditEntry,
  readMutations,
  writeMutations,
} from "../mock/adminStore";
import {
  getSeedOrganizations,
  getSeedPayments,
  getSeedUsers,
} from "./adminMockService";
import type {
  AdminAuditCategory,
  AdminAuditEntry,
  AdminDestination,
  AdminDelivery,
  AdminDeliveryStatus,
  AdminEvent,
  AdminExpiredOrganization,
  AdminFeatureFlag,
  AdminHealth,
  AdminIncident,
  AdminPayment,
  AdminPlan,
  AdminRevenueData,
  AdminSearchResults,
  AdminUsageSummary,
  AdminConfigStatus,
} from "../../types/admin";

const ADMIN_EMAIL = "admin@relayo.app";
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EVENT_TYPES = [
  "order.created",
  "order.updated",
  "invoice.paid",
  "payment.failed",
  "user.signup",
  "charge.succeeded",
  "subscription.renewed",
  "cart.abandoned",
  "shipment.tracking_updated",
  "refund.issued",
];

const ORG_HOSTS: Record<string, string> = {
  org_01: "hooks.acmecorp.com",
  org_02: "api.globex.io",
  org_03: "events.initech.com",
  org_04: "ingest.umbrella.lab",
  org_05: "webhooks.stark.co",
  org_06: "gateway.wayne.co",
  org_07: "events.hooli.dev",
};

/* ------------------------------------------------------------------ */
/* Seed generation (deterministic)                                     */
/* ------------------------------------------------------------------ */

function buildDestinations(): AdminDestination[] {
  const orgs = getSeedOrganizations();
  const rand = mulberry32(20260101);
  const destinations: AdminDestination[] = [];

  orgs.forEach((org) => {
    const count = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const host = ORG_HOSTS[org.id] ?? "hooks.example.com";
      destinations.push({
        id: `dst_${org.id.slice(-2)}${i}`,
        organizationId: org.id,
        organizationName: org.name,
        url: `https://${i === 0 ? host : `alt${i}.${host}`}/webhook`,
        host: i === 0 ? host : `alt${i}.${host}`,
        status: rand() > 0.92 ? "paused" : "active",
        consecutiveFailures: rand() > 0.8 ? 1 + Math.floor(rand() * 4) : 0,
        createdAt: minutesAgo(60 * 24 * (10 + Math.floor(rand() * 190))),
      });
    }
  });
  return destinations;
}

const FAILURE_CODES = [500, 502, 503, 504, 408, 429];
const FAILURE_MESSAGES: Record<number, string> = {
  500: "Internal server error",
  502: "Bad gateway",
  503: "Service unavailable",
  504: "Upstream timeout",
  408: "Request timeout",
  429: "Rate limited upstream",
};

function attemptFailureHand(rand: ReturnType<typeof mulberry32>): {
  code: number;
  error: string;
} {
  const code = FAILURE_CODES[Math.floor(rand() * FAILURE_CODES.length)];
  return { code, error: FAILURE_MESSAGES[code] };
}

function buildDeliveriesAndEvents(): { events: AdminEvent[]; deliveries: AdminDelivery[] } {
  const orgs = getSeedOrganizations();
  const destinations = buildDestinations();
  const rand = mulberry32(987654);
  const events: AdminEvent[] = [];
  const deliveries: AdminDelivery[] = [];

  let deliveryIndex = 0;

  orgs.forEach((org) => {
    const orgDests = destinations.filter((d) => d.organizationId === org.id);
    const eventCount = 6 + Math.floor(rand() * 10);

    for (let e = 0; e < eventCount; e++) {
      const eventId = `evt_${org.id.slice(-2)}_${e + 1}`;
      const eventType = EVENT_TYPES[Math.floor(rand() * EVENT_TYPES.length)];
      const createdAt = minutesAgo(60 * (1 + Math.floor(rand() * 24 * 14)));

      events.push({
        id: eventId,
        organizationId: org.id,
        organizationName: org.name,
        eventType,
        payload: {
          id: `obj_${eventId}`,
          type: eventType,
          createdAt,
        },
        createdAt,
        deliveryCount: 0,
      });

      const dest =
        orgDests.length > 0
          ? orgDests[Math.floor(rand() * orgDests.length)]
          : {
              id: "dst_x",
              organizationId: org.id,
              organizationName: org.name,
              url: "https://hooks.example.com/webhook",
              host: "hooks.example.com",
              status: "active" as const,
              consecutiveFailures: 0,
              createdAt: minutesAgo(60 * 24 * 10),
            };

      const roll = rand();
      const status: AdminDeliveryStatus =
        roll < 0.76
          ? "DELIVERED"
          : roll < 0.81
            ? "PENDING"
            : roll < 0.9
              ? "FAILED"
              : "DEAD_LETTER";

      const attempts: AdminDelivery["attempts"] = [];
      let lastResponseCode: number | null = null;
      let lastError: string | null = null;
      let latencyMs: number | null = null;
      let lastAttemptAt = createdAt;

      const attemptCount =
        status === "DEAD_LETTER"
          ? 4
          : status === "FAILED"
            ? 2
            : status === "PENDING"
              ? 1
              : rand() < 0.15
                ? 2
                : 1;

      for (let a = 0; a < attemptCount; a++) {
        const isFinalAttempt = a === attemptCount - 1;
        const fails = !(
          (status === "DELIVERED" || status === "PENDING") && isFinalAttempt
        );

        const backoffMs = a * a * 10_000;
        const attemptedAt = new Date(
          new Date(createdAt).getTime() + backoffMs,
        );
        lastAttemptAt = attemptedAt.toISOString();

        if (fails) {
          const { code, error } = attemptFailureHand(rand);
          lastResponseCode = code;
          lastError = error;
          latencyMs = 800 + Math.floor(rand() * 3200);
          attempts.push({
            attemptNumber: a + 1,
            responseCode: code,
            latencyMs,
            error,
            attemptedAt: attemptedAt.toISOString(),
          });
        } else {
          lastResponseCode = 200;
          lastError = null;
          latencyMs = 120 + Math.floor(rand() * 700);
          attempts.push({
            attemptNumber: a + 1,
            responseCode: 200,
            latencyMs,
            error: null,
            attemptedAt: attemptedAt.toISOString(),
          });
        }
      }

      deliveryIndex += 1;
      deliveries.push({
        id: `dlv_${org.id.slice(-2)}_${deliveryIndex.toString().padStart(4, "0")}`,
        organizationId: org.id,
        organizationName: org.name,
        eventId,
        eventType,
        destinationId: dest.id,
        destinationHost: dest.host,
        status,
        attempts,
        lastResponseCode,
        lastError,
        latencyMs,
        createdAt,
        updatedAt: lastAttemptAt,
      });
      events[events.length - 1].deliveryCount = 1;
    }
  });

  return { events, deliveries };
}

const seedSet = buildDeliveriesAndEvents();

/* ------------------------------------------------------------------ */
/* Destinations                                                        */
/* ------------------------------------------------------------------ */

export async function listAdminDestinations(): Promise<AdminDestination[]> {
  return delay(buildDestinations());
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export async function listAdminEvents(filters?: {
  organizationId?: string;
  eventType?: string;
}): Promise<AdminEvent[]> {
  let events = [...seedSet.events].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
  if (filters?.organizationId) {
    events = events.filter((e) => e.organizationId === filters.organizationId);
  }
  const typeQuery = filters?.eventType?.trim().toLowerCase();
  if (typeQuery) {
    events = events.filter((e) => e.eventType.toLowerCase().includes(typeQuery));
  }
  return delay(events);
}

export async function getAdminEvent(id: string): Promise<AdminEvent> {
  const event = seedSet.events.find((e) => e.id === id);
  if (!event) throw new Error("Event not found.");
  return delay(event);
}

/* ------------------------------------------------------------------ */
/* Deliveries                                                          */
/* ------------------------------------------------------------------ */

export async function listAdminDeliveries(filters?: {
  organizationId?: string;
  status?: AdminDeliveryStatus | "";
  destinationId?: string;
  eventId?: string;
}): Promise<AdminDelivery[]> {
  let deliveries = [...seedSet.deliveries].sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
  );
  if (filters?.organizationId) {
    deliveries = deliveries.filter((d) => d.organizationId === filters.organizationId);
  }
  if (filters?.status) {
    deliveries = deliveries.filter((d) => d.status === filters.status);
  }
  if (filters?.destinationId) {
    deliveries = deliveries.filter((d) => d.destinationId === filters.destinationId);
  }
  if (filters?.eventId) {
    deliveries = deliveries.filter((d) => d.eventId === filters.eventId);
  }
  return delay(deliveries);
}

export async function getAdminDelivery(id: string): Promise<AdminDelivery> {
  const delivery = seedSet.deliveries.find((d) => d.id === id);
  if (!delivery) throw new Error("Delivery not found.");
  return delay(delivery);
}

/* ------------------------------------------------------------------ */
/* Health + incidents                                                  */
/* ------------------------------------------------------------------ */

const seedIncidents: AdminIncident[] = [
  {
    id: "inc_01",
    severity: "critical",
    title: "Rapid retry storm in Scale organizations",
    message:
      "Delivery attempt volume is ~3x baseline for the last 20 minutes. Retry backoff is absorbing it; no data loss.",
    status: "open",
    startedAt: minutesAgo(35),
  },
  {
    id: "inc_02",
    severity: "warning",
    title: "Elevated 5xx from hooks.acmecorp.com",
    message:
      "Consecutive failures against Acme Corp destinations passed 5, opening circuit breakers. Probing every 60s.",
    status: "open",
    startedAt: minutesAgo(120),
  },
  {
    id: "inc_03",
    severity: "info",
    title: "Redis failover (Upstash)",
    message: "Automatic replication failover completed in 4s. No deliveries lost.",
    status: "resolved",
    startedAt: minutesAgo(60 * 24 * 2),
    resolvedAt: minutesAgo(60 * 24 * 2 - 4 * 60),
  },
];

function buildHealthSeries() {
  const rand = mulberry32(424242);
  const series = [];
  for (let i = 119; i >= 0; i--) {
    const wave = 1 + 0.35 * Math.sin(i / 9);
    const spike = rand() < 0.05 ? 1.6 : 1;
    series.push({
      timestamp: new Date(Date.now() - (119 - i) * MINUTE).toISOString(),
      eventsPerMinute: Math.round(412 * wave * spike),
      errorRatePct: Number(
        Math.max(0.2, Math.min(3.8, 1.1 + rand() * 1.6 + (spike > 1 ? 1.2 : 0))).toFixed(1),
      ),
    });
  }
  return series;
}

const seedQueues = [
  {
    name: "outbound-deliveries",
    depth: 128,
    processed: 3_240_118,
    stalled: 0,
    jobsPerSecond: 214,
    healthy: true,
    note: "Steady",
  },
  {
    name: "retry-backoff",
    depth: 12,
    processed: 982_331,
    stalled: 0,
    jobsPerSecond: 11,
    healthy: true,
    note: "Normal",
  },
  {
    name: "dead-letter-sweep",
    depth: 7,
    processed: 12_440,
    stalled: 0,
    jobsPerSecond: 0.4,
    healthy: true,
    note: "Idle",
  },
  {
    name: "webhook-batching",
    depth: 2104,
    processed: 120_190,
    stalled: 3,
    jobsPerSecond: 42,
    healthy: false,
    note: "3 stalled jobs — worker restarting",
  },
];

export async function listAdminIncidents(): Promise<AdminIncident[]> {
  return delay([...seedIncidents]);
}

export async function listOpenIncidents(): Promise<AdminIncident[]> {
  return delay(seedIncidents.filter((incident) => incident.status === "open"));
}

export async function getAdminHealth(): Promise<AdminHealth> {
  const queueDepth = seedQueues.reduce((sum, queue) => sum + queue.depth, 0);
  const openBreakers = seedSet.deliveries.filter(
    (d) => d.status === "FAILED" || d.status === "DEAD_LETTER",
  ).length;

  return delay({
    metrics: {
      eventsPerMinute: 412,
      attemptsPerMinute: 486,
      deliveredPerMinute: 471,
      p95LatencyMs: 1240,
      errorRatePct: 1.4,
      queueDepth,
      deadLetterTotal: 344,
      deadLetter30d: 96,
      openCircuitBreakers: Math.min(5, openBreakers),
      workerCount: 12,
      redisMemoryMb: 142,
      redisRegion: "ap-south-1",
      rateLimitUsagePct: 78,
    },
    series: buildHealthSeries(),
    queues: seedQueues,
    incidents: [...seedIncidents].sort(
      (a, b) => +new Date(b.startedAt) - +new Date(a.startedAt),
    ),
  });
}

/* ------------------------------------------------------------------ */
/* Usage                                                               */
/* ------------------------------------------------------------------ */

const PLAN_QUOTAS: Record<AdminPlan, number | null> = {
  FREE: 100_000,
  PRO: 2_000_000,
  SCALE: null,
};

export async function getAdminUsage(): Promise<AdminUsageSummary[]> {
  const orgs = getSeedOrganizations();
  const rand = mulberry32(5551212);

  const summaries: AdminUsageSummary[] = orgs.map((org) => {
    const quota = PLAN_QUOTAS[org.plan];
    const periodEnd = readMutations().orgPeriodEnds[org.id]
      ? new Date(readMutations().orgPeriodEnds[org.id])
      : new Date(Date.now() + (5 + Math.floor(rand() * 28)) * DAY);

    return {
      organizationId: org.id,
      organizationName: org.name,
      slug: org.slug,
      plan: org.plan,
      quota,
      used:
        quota === null
          ? 2_000_000 + Math.floor(rand() * 4_000_000)
          : Math.round(quota * (0.62 + rand() * 0.36)),
      periodStart: new Date(periodEnd.getTime() - 30 * DAY).toISOString(),
      periodEnd: periodEnd.toISOString(),
      status: org.status,
    };
  });

  return delay(
    summaries.sort(
      (a, b) =>
        (b.used / (b.quota ?? Number.MAX_SAFE_INTEGER)) -
        (a.used / (a.quota ?? Number.MAX_SAFE_INTEGER)),
    ),
  );
}

/* ------------------------------------------------------------------ */
/* Revenue + churn                                                     */
/* ------------------------------------------------------------------ */

export async function getAdminRevenue(): Promise<AdminRevenueData> {
  const payments = getSeedPayments();
  const paid = payments.filter((payment) => payment.status === "paid");
  const collectedTotal = paid.reduce((sum, p) => sum + p.amount, 0);
  const refundedTotal = payments
    .filter((payment) => payment.status === "refunded")
    .reduce((sum, p) => sum + p.amount, 0);

  const byPlanMap = new Map<AdminPlan, { plan: AdminPlan; label: string; collected: number; count: number }>();
  paid.forEach((payment) => {
    const entry =
      byPlanMap.get(payment.plan) ?? {
        plan: payment.plan,
        label: payment.plan[0] + payment.plan.slice(1).toLowerCase(),
        collected: 0,
        count: 0,
      };
    entry.collected += payment.amount;
    entry.count += 1;
    byPlanMap.set(payment.plan, entry);
  });

  const rand = mulberry32(909090);
  const series = [];
  for (let i = 29; i >= 0; i--) {
    const spike = rand() < 0.18 ? 2999 : 0;
    series.push({
      day: new Date(Date.now() - i * DAY).toISOString().slice(0, 10),
      collected: spike + (rand() < 0.5 ? 999 : 0) + (rand() < 0.2 ? 999 : 0),
      refunded: rand() < 0.15 ? 999 : 0,
    });
  }

  return delay({
    collectedTotal,
    refundedTotal,
    byPlan: [...byPlanMap.values()].sort((a, b) => b.collected - a.collected),
    series,
  });
}

const seedExpired: AdminExpiredOrganization[] = [
  {
    organizationId: "org_03",
    organizationName: "Initech",
    slug: "initech",
    previousPlan: "PRO",
    lastPaidAt: minutesAgo(60 * 24 * 34),
    daysSinceExpiry: 4,
  },
  {
    organizationId: "org_05",
    organizationName: "Stark Industries",
    slug: "stark-industries",
    previousPlan: "PRO",
    lastPaidAt: minutesAgo(60 * 24 * 3),
    daysSinceExpiry: 0,
  },
];

export async function listExpiredOrganizations(): Promise<AdminExpiredOrganization[]> {
  return delay(
    seedExpired.filter(
      (org) => !readMutations().deletedOrgIds.includes(org.organizationId),
    ),
  );
}

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

const ADMIN_ACTOR = {
  actorType: "admin" as const,
  actorEmail: ADMIN_EMAIL,
  ip: "103.87.204.16",
  location: "Mumbai, IN",
};

function buildSeedAudit(): AdminAuditEntry[] {
  const rand = mulberry32(314159);
  const kinds: {
    actorType: AdminAuditEntry["actorType"];
    actorEmail: string | null;
    ip: string;
    location: string;
    category: AdminAuditCategory;
    action: string;
    target: string;
  }[] = [
    {
      actorType: "user",
      actorEmail: "peter@acmecorp.com",
      ip: "203.0.113.24",
      location: "Bengaluru, IN",
      category: "organization",
      action: "Organization created",
      target: "Acme Corp",
    },
    {
      actorType: "user",
      actorEmail: "hank@globex.io",
      ip: "45.132.80.11",
      location: "Frankfurt, DE",
      category: "organization",
      action: "Organization created",
      target: "Globex Engineering",
    },
    {
      actorType: "user",
      actorEmail: "peter@acmecorp.com",
      ip: "203.0.113.24",
      location: "Bengaluru, IN",
      category: "user",
      action: "User invited to organization",
      target: "gwen@acmecorp.com",
    },
    {
      actorType: "system",
      actorEmail: null,
      ip: "10.0.0.1",
      location: "Internal",
      category: "billing",
      action: "Payment received",
      target: "Pro · ₹999",
    },
    {
      actorType: "user",
      actorEmail: "wesker@umbrella.lab",
      ip: "198.51.100.7",
      location: "Singapore, SG",
      category: "auth",
      action: "User signed in",
      target: "Console",
    },
    {
      actorType: "user",
      actorEmail: "tony@stark.co",
      ip: "198.51.100.9",
      location: "Singapore, SG",
      category: "security",
      action: "MFA enabled",
      target: "tony@stark.co",
    },
    {
      actorType: "system",
      actorEmail: null,
      ip: "10.0.0.1",
      location: "Internal",
      category: "billing",
      action: "Plan upgraded to SCALE",
      target: "Globex Engineering",
    },
    {
      actorType: "admin",
      actorEmail: ADMIN_EMAIL,
      ip: "103.87.204.16",
      location: "Mumbai, IN",
      category: "organization",
      action: "Organization suspended",
      target: "Initech",
    },
    {
      actorType: "admin",
      actorEmail: ADMIN_EMAIL,
      ip: "103.87.204.16",
      location: "Mumbai, IN",
      category: "user",
      action: "Account verified",
      target: "mina@kaos.inc",
    },
    {
      actorType: "system",
      actorEmail: null,
      ip: "10.0.0.1",
      location: "Internal",
      category: "system",
      action: "Circuit breaker opened",
      target: "hooks.acmecorp.com",
    },
    {
      actorType: "user",
      actorEmail: "bruce@wayne.co",
      ip: "185.220.101.42",
      location: "New York, US",
      category: "security",
      action: "New device signed in",
      target: "bruce@wayne.co",
    },
  ];

  const entries: AdminAuditEntry[] = [];
  for (let i = 0; i < 42; i++) {
    const kind = kinds[Math.floor(rand() * kinds.length)];
    entries.push({
      id: `seed_aud_${i}`,
      timestamp: minutesAgo(rand() * 60 * 24 * 14),
      actorType: kind.actorType,
      actorEmail: kind.actorEmail,
      category: kind.category,
      action: kind.action,
      target: kind.target,
      ip: kind.ip,
      location: kind.location,
    });
  }
  entries.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  return entries;
}

const seedAudit = buildSeedAudit();

export async function listAuditEntries(filters?: {
  category?: AdminAuditCategory | "";
  actorType?: string;
  query?: string;
}): Promise<AdminAuditEntry[]> {
  let entries = [...readMutations().auditAppended, ...seedAudit];
  if (filters?.category) {
    entries = entries.filter((entry) => entry.category === filters.category);
  }
  if (filters?.actorType && filters.actorType !== "all") {
    entries = entries.filter((entry) => entry.actorType === filters.actorType);
  }
  const query = filters?.query?.trim().toLowerCase();
  if (query) {
    entries = entries.filter(
      (entry) =>
        entry.action.toLowerCase().includes(query) ||
        entry.target.toLowerCase().includes(query) ||
        (entry.actorEmail ?? "").toLowerCase().includes(query),
    );
  }
  return delay(entries.slice(0, 120));
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

export async function getAdminSearch(query: string): Promise<AdminSearchResults> {
  const q = query.trim().toLowerCase();
  if (!q) return delay({ organizations: [], users: [], payments: [] });

  return delay({
    organizations: getSeedOrganizations()
      .filter(
        (org) => org.name.toLowerCase().includes(q) || org.slug.toLowerCase().includes(q),
      )
      .slice(0, 5),
    users: getSeedUsers()
      .filter(
        (user) =>
          user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q),
      )
      .slice(0, 5),
    payments: getSeedPayments()
      .filter(
        (payment) =>
          payment.organizationName.toLowerCase().includes(q) ||
          payment.id.toLowerCase().includes(q),
      )
      .slice(0, 5),
  });
}

/* ------------------------------------------------------------------ */
/* Feature flags + config status                                       */
/* ------------------------------------------------------------------ */

const seedFlags: AdminFeatureFlag[] = [
  {
    id: "retry-backoff-v2",
    label: "Retry backoff v2",
    description: "Adaptive exponential backoff with jitter for failed deliveries.",
    enabled: true,
  },
  {
    id: "webhook-batching",
    label: "Webhook batching",
    description: "Batch multiple events into a single delivery to busy destinations.",
    enabled: false,
  },
  {
    id: "require-mfa-all",
    label: "Require MFA for all users",
    description: "Enforce multi-factor authentication on every customer account.",
    enabled: true,
  },
  {
    id: "maintenance-mode",
    label: "Maintenance mode",
    description: "Blocks new event ingestion platform-wide. Use during deploys.",
    enabled: false,
    dangerous: true,
  },
];

export async function getFeatureFlags(): Promise<AdminFeatureFlag[]> {
  const flags = readMutations().flags;
  return delay(
    seedFlags.map((flag) => ({ ...flag, enabled: flags[flag.id] ?? flag.enabled })),
  );
}

export async function updateFeatureFlag(
  id: string,
  enabled: boolean,
): Promise<AdminFeatureFlag> {
  const flag = seedFlags.find((f) => f.id === id);
  if (!flag) throw new Error("Feature flag not found.");

  const mutations = readMutations();
  mutations.flags[id] = enabled;
  writeMutations(mutations);

  appendAuditEntry({
    id: `aud_${Date.now()}_flag`,
    timestamp: new Date().toISOString(),
    ...ADMIN_ACTOR,
    category: "system",
    action: `Feature flag ${enabled ? "enabled" : "disabled"}`,
    target: flag.label,
  });

  return delay({ ...flag, enabled });
}

const seedConfigStatus: AdminConfigStatus[] = [
  { key: "smtp", label: "Email / SMTP", status: "healthy", detail: "resend.com · 3 retries" },
  { key: "redis", label: "Redis (Upstash)", status: "healthy", detail: "ap-south-1 · 142 MB / 256 MB" },
  { key: "payments", label: "Payments (Razorpay)", status: "healthy", detail: "Live mode · v1" },
  { key: "rate-limiter", label: "Rate limiter", status: "warning", detail: "At 78% of daily quota" },
  { key: "webhook-worker", label: "Webhook workers", status: "healthy", detail: "12 workers · 1 draining" },
];

export async function getConfigStatus(): Promise<AdminConfigStatus[]> {
  return delay([...seedConfigStatus]);
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

export function buildAdminCsv(
  kind: "organizations" | "users" | "payments",
): string {
  if (kind === "organizations") {
    return toCsv(
      ["id", "name", "slug", "plan", "status", "memberCount", "mrr", "createdAt"],
      getSeedOrganizations().map((org) => [
        org.id,
        org.name,
        org.slug,
        org.plan,
        org.status,
        org.memberCount,
        org.mrr,
        org.createdAt,
      ]),
    );
  }
  if (kind === "users") {
    return toCsv(
      ["id", "name", "email", "status", "mfaEnabled", "organizationCount", "joinedAt"],
      getSeedUsers().map((user) => [
        user.id,
        user.name,
        user.email,
        user.status,
        user.mfaEnabled,
        user.organizationCount,
        user.joinedAt,
      ]),
    );
  }
  return toCsv(
    ["id", "organizationId", "organizationName", "plan", "amount", "status", "paidAt"],
    getSeedPayments().map((payment: AdminPayment) => [
      payment.id,
      payment.organizationId,
      payment.organizationName,
      payment.plan,
      payment.amount,
      payment.status,
      payment.paidAt,
    ]),
  );
}