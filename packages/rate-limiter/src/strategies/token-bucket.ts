// packages/rate-limiter/src/strategies/token-bucket.ts
import { getRedisClient, loadScript } from "../redis/client.js";
import {
  RateLimitStrategyCheck,
  RateLimitResult,
  RateLimitConfig,
  RateLimitContext,
} from "../types/index.js";

const TOKEN_BUCKET_SCRIPT = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local capacity = tonumber(ARGV[2])
  local refillRate = tonumber(ARGV[3])

  local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
  local tokens = tonumber(data[1]) or capacity
  local lastRefill = tonumber(data[2]) or now

  local elapsed = now - lastRefill
  local newTokens = math.min(capacity, tokens + (elapsed * refillRate / 1000))

  if newTokens >= 1 then
    newTokens = newTokens - 1
    redis.call('HMSET', key, 'tokens', newTokens, 'lastRefill', now)
    redis.call('PEXPIRE', key, math.ceil(capacity / refillRate * 1000) + 1000)
    return {math.floor(newTokens), capacity, 0}
  else
    local waitTime = math.ceil((1 - newTokens) / refillRate * 1000)
    redis.call('HMSET', key, 'tokens', newTokens, 'lastRefill', now)
    redis.call('PEXPIRE', key, math.ceil(capacity / refillRate * 1000) + 1000)
    return {math.floor(newTokens), capacity, -waitTime}
  end
`;

export class TokenBucketStrategy implements RateLimitStrategyCheck {
  private scriptSha: string | null = null;

  private async loadScript(): Promise<void> {
    if (this.scriptSha) return;
    this.scriptSha = await loadScript(TOKEN_BUCKET_SCRIPT);
  }

  async check(
    key: string,
    config: RateLimitConfig,
    _context: RateLimitContext,
  ): Promise<RateLimitResult> {
    await this.loadScript();
    const redis = getRedisClient();
    const now = Date.now();
    // Burst allows short spikes above the sustained limit
    const capacity = config.burst ?? config.limit;
    const refillRate =
      config.refillRate ?? config.limit / (config.windowMs / 1000);

    const result = this.scriptSha
      ? await redis.evalsha(
          this.scriptSha,
          1,
          key,
          now.toString(),
          capacity.toString(),
          refillRate.toString(),
        )
      : await redis.eval(
          TOKEN_BUCKET_SCRIPT,
          1,
          key,
          now.toString(),
          capacity.toString(),
          refillRate.toString(),
        );

    const [remainingTokens, , retryOrZero] = result as number[];
    return {
      allowed: retryOrZero >= 0,
      remaining: Math.max(0, remainingTokens),
      resetAt:
        now + (retryOrZero < 0 ? Math.abs(retryOrZero) : config.windowMs),
      limit: capacity,
      retryAfterMs: retryOrZero < 0 ? Math.abs(retryOrZero) : undefined,
      configId: config.id,
      strategy: config.strategy,
    };
  }

  async reset(key: string): Promise<void> {
    await getRedisClient().del(key);
  }
}
