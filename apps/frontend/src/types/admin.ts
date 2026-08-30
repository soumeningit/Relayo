export type AdminPlan = "FREE" | "PRO" | "SCALE";
export type AdminOrgStatus = "active" | "suspended";
export type AdminUserStatus = "verified" | "unverified" | "suspended";
export type AdminPaymentStatus = "paid" | "pending" | "failed" | "refunded";
export type AdminMemberRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export const PLAN_LABELS: Record<AdminPlan, string> = {
  FREE: "Free",
  PRO: "Pro",
  SCALE: "Scale",
};

export interface AdminSessionUser {
  id: string;
  name: string;
  email: string;
}

export interface AdminLoginResponse {
  success: boolean;
  email: string;
  mfaRequired: boolean;
  /** Demo-only: the code that would be delivered via authenticator/email/SMS. */
  otp?: string;
}

export interface AdminVerifyMfaResponse {
  success: boolean;
  token: string;
  user: AdminSessionUser;
}

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  plan: AdminPlan;
  status: AdminOrgStatus;
  memberCount: number;
  /** Monthly recurring revenue in INR (0 for free orgs). */
  mrr: number;
  createdAt: string;
}

export interface AdminOrgUsage {
  destinations: number;
  events24h: number;
  deliveries30d: number;
  successRatePct: number;
  pendingRetries: number;
}

export interface AdminMember {
  id: string;
  name: string;
  email: string;
  role: AdminMemberRole;
  joinedAt: string;
}

export interface AdminPayment {
  id: string;
  organizationId: string;
  organizationName: string;
  plan: AdminPlan;
  amount: number;
  status: AdminPaymentStatus;
  paidAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  status: AdminUserStatus;
  mfaEnabled: boolean;
  organizationCount: number;
  joinedAt: string;
}

export interface AdminPlanCount {
  plan: AdminPlan | "FREE";
  label: string;
  count: number;
}

export interface AdminOverviewData {
  stats: {
    totalOrganizations: number;
    activeOrganizations: number;
    suspendedOrganizations: number;
    totalUsers: number;
    events24h: number;
    deliveries30d: number;
    successRatePct: number;
    mrr: number;
  };
  organizationsByPlan: AdminPlanCount[];
  recentPayments: AdminPayment[];
}

export interface AdminOrganizationDetail {
  organization: AdminOrganization;
  usage: AdminOrgUsage;
  members: AdminMember[];
  payments: AdminPayment[];
}

export interface AdminProfile {
  name: string;
  email: string;
  mfaEnabled: boolean;
  lastLoginAt: string;
}

export type AdminDeliveryStatus =
  | "PENDING"
  | "DELIVERED"
  | "FAILED"
  | "DEAD_LETTER"
  | "PAUSED";

export interface AdminDeliveryAttempt {
  attemptNumber: number;
  responseCode: number | null;
  latencyMs: number | null;
  error: string | null;
  attemptedAt: string;
}

export interface AdminDelivery {
  id: string;
  organizationId: string;
  organizationName: string;
  eventId: string;
  eventType: string;
  destinationId: string;
  destinationHost: string;
  status: AdminDeliveryStatus;
  attempts: AdminDeliveryAttempt[];
  lastResponseCode: number | null;
  lastError: string | null;
  latencyMs: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Delivery counts for the current filter scope (independent of status filter). */
export interface AdminDeliverySummary {
  total: number;
  pending: number;
  failed: number;
}

export interface AdminEvent {
  id: string;
  organizationId: string;
  organizationName: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
  deliveryCount: number;
}

export interface AdminDestination {
  id: string;
  organizationId: string;
  organizationName: string;
  url: string;
  host: string;
  status: "active" | "paused";
  consecutiveFailures: number;
  createdAt: string;
}

export interface AdminIncident {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  status: "open" | "resolved";
  startedAt: string;
  resolvedAt?: string;
}

export interface AdminWorkerQueue {
  name: string;
  depth: number;
  processed: number;
  stalled: number;
  jobsPerSecond: number;
  healthy: boolean;
  note: string;
}

export interface AdminHealth {
  metrics: {
    eventsPerMinute: number;
    attemptsPerMinute: number;
    deliveredPerMinute: number;
    p95LatencyMs: number;
    errorRatePct: number;
    queueDepth: number;
    deadLetterTotal: number;
    deadLetter30d: number;
    openCircuitBreakers: number;
    workerCount: number;
    redisMemoryMb: number;
    redisRegion: string;
    rateLimitUsagePct: number;
  };
  series: {
    timestamp: string;
    eventsPerMinute: number;
    errorRatePct: number;
  }[];
  queues: AdminWorkerQueue[];
  incidents: AdminIncident[];
}

export interface AdminUsageSummary {
  organizationId: string;
  organizationName: string;
  slug: string;
  plan: AdminPlan;
  quota: number | null;
  used: number;
  periodStart: string;
  periodEnd: string;
  status: AdminOrgStatus;
}

export type AdminAuditCategory =
  | "auth"
  | "security"
  | "organization"
  | "user"
  | "billing"
  | "system";

export interface AdminAuditEntry {
  id: string;
  timestamp: string;
  actorType: "admin" | "user" | "system";
  actorEmail: string | null;
  category: AdminAuditCategory;
  action: string;
  target: string;
  ip: string;
  location: string;
}

export interface AdminRevenuePoint {
  day: string;
  collected: number;
  refunded: number;
}

export interface AdminRevenueData {
  collectedTotal: number;
  refundedTotal: number;
  byPlan: {
    plan: AdminPlan;
    label: string;
    collected: number;
    count: number;
  }[];
  series: AdminRevenuePoint[];
}

export interface AdminExpiredOrganization {
  organizationId: string;
  organizationName: string;
  slug: string;
  previousPlan: AdminPlan;
  lastPaidAt: string;
  daysSinceExpiry: number;
}

export interface AdminFeatureFlag {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  dangerous?: boolean;
}

export type AdminConfigStatusLevel = "healthy" | "warning" | "down";

export interface AdminConfigStatus {
  key: string;
  label: string;
  status: AdminConfigStatusLevel;
  detail: string;
}

export interface AdminSearchResults {
  organizations: AdminOrganization[];
  users: AdminUser[];
  payments: AdminPayment[];
}