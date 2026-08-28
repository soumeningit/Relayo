// packages/rate-limiter/src/index.ts
// Middleware
export { rateLimit } from "./middleware/rate-limit.js";
export { extractIdentity } from "./middleware/identity-extractor.js";
export type { RateLimitRequest } from "./middleware/identity-extractor.js";

// Services (for direct use)
export { RateLimiterService } from "./services/rate-limiter.service.js";
export { ConfigCacheService } from "./services/config-cache.service.js";

// Strategies (for custom use)
export { SlidingWindowStrategy } from "./strategies/sliding-window.js";
export { FixedWindowStrategy } from "./strategies/fixed-window.js";
export { TokenBucketStrategy } from "./strategies/token-bucket.js";

// Redis (for connection management)
export {
  getRedisClient,
  getBullMQConnection,
  connectRedis,
  disconnectRedis,
} from "./redis/client.js";

// Queues (for manual operations)
export {
  enqueueConfigSync,
  enqueueAuditLog,
  enqueueCleanup,
  scheduleCleanupDaily,
  closeQueues,
} from "./queues/index.js";

// Types
export type {
  RateLimitResult,
  RateLimitContext,
  RateLimitOptions,
  RateLimitStrategyCheck,
} from "./types/index.js";
export { QueueName } from "./types/index.js";
export type {
  ConfigSyncJobData,
  AuditLogJobData,
  CleanupJobData,
} from "./types/index.js";

// Re-export Prisma types used
export type {
  RateLimitConfig,
  AuditLog,
  RateLimitStrategy,
  IdentifierType,
} from "./types/index.js";
