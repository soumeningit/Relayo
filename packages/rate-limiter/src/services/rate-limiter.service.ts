import {
  RateLimitConfig,
  RateLimitResult,
  RateLimitContext,
  RateLimitStrategyCheck,
  RateLimitStrategy,
} from "../types/index.js";
import { ConfigCacheService } from "./config-cache.service.js";
import { SlidingWindowStrategy } from "../strategies/sliding-window.js";
import { FixedWindowStrategy } from "../strategies/fixed-window.js";
import { TokenBucketStrategy } from "../strategies/token-bucket.js";

const strategies: Map<RateLimitStrategy, RateLimitStrategyCheck> = new Map();
strategies.set("SLIDING_WINDOW", new SlidingWindowStrategy());
strategies.set("FIXED_WINDOW", new FixedWindowStrategy());
strategies.set("TOKEN_BUCKET", new TokenBucketStrategy());

export class RateLimiterService {
  private configCache: ConfigCacheService;

  constructor(configCache?: ConfigCacheService) {
    this.configCache = configCache ?? new ConfigCacheService();
  }

  async check(context: RateLimitContext): Promise<RateLimitResult> {
    const configs = await this.configCache.findMatching(
      context.route,
      context.method,
      context.identifierType,
    );

    if (configs.length === 0) {
      return this.defaultResult();
    }

    let result: RateLimitResult | null = null;

    for (const cfg of configs) {
      const key = this.buildKey(context, cfg);
      const strategy = strategies.get(cfg.strategy);

      if (!strategy) continue;

      try {
        const checkResult = await strategy.check(key, cfg, context);

        if (!checkResult.allowed) {
          return checkResult;
        }

        if (!result || checkResult.remaining < result.remaining) {
          result = checkResult;
        }
      } catch {
        // If Redis fails for this config, skip it (fail open)
        continue;
      }
    }

    return result ?? this.defaultResult();
  }

  async reset(identifier: string, route?: string): Promise<void> {
    const configs = await this.configCache.getAll();
    for (const cfg of configs) {
      const key = this.buildKeyFromParts(
        identifier,
        cfg.identifierType,
        route || "*",
        cfg.id,
      );
      const strategy = strategies.get(cfg.strategy);
      await strategy?.reset(key);
    }
  }

  private buildKey(context: RateLimitContext, cfg: RateLimitConfig): string {
    return this.buildKeyFromParts(
      context.identifier,
      cfg.identifierType,
      context.route,
      cfg.id,
    );
  }

  private buildKeyFromParts(
    identifier: string,
    identifierType: string,
    route: string,
    configId: string,
  ): string {
    const safeId =
      identifier.length > 64
        ? this.hash(identifier)
        : identifier.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeRoute = route.replace(/[^a-zA-Z0-9_/-]/g, "_");
    return `${identifierType}:${safeId}:${safeRoute}:${configId}`;
  }

  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  private defaultResult(): RateLimitResult {
    return {
      allowed: true,
      remaining: 1000,
      resetAt: Date.now() + 60000,
      limit: 1000,
      configId: "default",
      strategy: "FIXED_WINDOW",
    };
  }
}
