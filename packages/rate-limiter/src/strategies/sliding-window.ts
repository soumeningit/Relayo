import { getRedisClient, loadScript } from "../redis/client.js";
import {
  RateLimitStrategyCheck,
  RateLimitResult,
  RateLimitConfig,
  RateLimitContext,
} from "../types/index.js";

const SLIDING_WINDOW_SCRIPT = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local windowMs = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])

  local windowStart = now - windowMs
  redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
  local count = redis.call('ZCARD', key)

  if count < limit then
    redis.call('ZADD', key, now, now .. ':' .. math.random(1000000))
    redis.call('PEXPIRE', key, windowMs + 1000)
    return {count + 1, limit, windowStart + windowMs}
  else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retryAfter = oldest[2] and (tonumber(oldest[2]) + windowMs - now) or windowMs
    return {count, limit, -retryAfter}
  end
`;

export class SlidingWindowStrategy implements RateLimitStrategyCheck {
  private scriptSha: string | null = null;

  private async loadScript(): Promise<void> {
    if (this.scriptSha) return;
    this.scriptSha = await loadScript(SLIDING_WINDOW_SCRIPT);
  }

  async check(
    key: string,
    config: RateLimitConfig,
    _context: RateLimitContext,
  ): Promise<RateLimitResult> {
    await this.loadScript();
    const redis = getRedisClient();
    const now = Date.now();

    const result = this.scriptSha
      ? await redis.evalsha(
          this.scriptSha,
          1,
          key,
          now.toString(),
          config.windowMs.toString(),
          config.limit.toString(),
        )
      : await redis.eval(
          SLIDING_WINDOW_SCRIPT,
          1,
          key,
          now.toString(),
          config.windowMs.toString(),
          config.limit.toString(),
        );

    const [current, , resetOrRetry] = result as number[];
    return {
      allowed: resetOrRetry >= 0,
      remaining: Math.max(0, config.limit - current),
      resetAt: resetOrRetry > 0 ? resetOrRetry : now + config.windowMs,
      limit: config.limit,
      retryAfterMs: resetOrRetry < 0 ? Math.abs(resetOrRetry) : undefined,
      configId: config.id,
      strategy: config.strategy,
    };
  }

  async reset(key: string): Promise<void> {
    await getRedisClient().del(key);
  }
}
