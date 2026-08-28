import type {
  RateLimitStrategy,
  IdentifierType,
  RateLimitConfig,
  AuditLog,
} from "@repo/db";

export type { RateLimitStrategy, IdentifierType, RateLimitConfig, AuditLog };

// ============= Interfaces =============

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
  retryAfterMs?: number;
  configId: string;
  strategy: string;
}

export interface RateLimitContext {
  identifier: string;
  identifierType: IdentifierType;
  route: string;
  method: string;
  apiKey?: string;
  userId?: string;
  ip: string;
  userAgent?: string;
}

export interface RateLimitOptions {
  skip?: (req: import("express").Request) => boolean;
  onLimited?: (
    res: import("express").Response,
    result: RateLimitResult,
  ) => void;
  auditDenied?: boolean;
  auditAll?: boolean;
}

export interface RateLimitStrategyCheck {
  check(
    key: string,
    config: RateLimitConfig,
    context: RateLimitContext,
  ): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

// ============= Queue Job Types =============

export enum QueueName {
  // NOTE: BullMQ forbids ":" in queue names (reserved separator)
  CONFIG_SYNC = "rate-limiter-config-sync",
  AUDIT_LOG = "rate-limiter-audit-log",
  CLEANUP = "rate-limiter-cleanup",
}

export interface ConfigSyncJobData {
  action: "sync_all" | "sync_one" | "invalidate";
  configId?: string;
}

export interface AuditLogJobData {
  identifier: string;
  identifierType: string;
  route: string;
  method: string;
  allowed: boolean;
  limitCount: number;
  remaining: number;
  configId: string | null;
  ip: string;
  userAgent?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CleanupJobData {
  olderThanDays: number;
}
