// packages/rate-limiter/src/strategies/fixed-window.ts
import { getRedisClient, loadScript } from "../redis/client.js";
import {
  RateLimitStrategyCheck,
  RateLimitResult,
  RateLimitConfig,
  RateLimitContext,
} from "../types/index.js";

const FIXED_WINDOW_SCRIPT = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local windowMs = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])

  local windowKey = key .. ':' .. math.floor(now / windowMs)
  local windowEnd = (math.floor(now / windowMs) + 1) * windowMs

  local count = tonumber(redis.call('GET', windowKey) or '0')

  if count < limit then
    count = redis.call('INCR', windowKey)
    if count == 1 then
      redis.call('PEXPIRE', windowKey, windowMs + 1000)
    end
    return {count, limit, windowEnd}
  else
    return {count, limit, -(windowEnd - now)}
  end
`;

export class FixedWindowStrategy implements RateLimitStrategyCheck {
  private scriptSha: string | null = null;

  private async loadScript(): Promise<void> {
    if (this.scriptSha) return;
    this.scriptSha = await loadScript(FIXED_WINDOW_SCRIPT);
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
          FIXED_WINDOW_SCRIPT,
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
    const keys = await getRedisClient().keys(`${key}:*`);
    if (keys.length > 0) {
      await getRedisClient().del(...keys);
    }
  }
}
