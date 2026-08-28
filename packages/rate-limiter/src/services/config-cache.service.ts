import { getRedisClient } from "../redis/client.js";
import { RateLimitConfig, IdentifierType } from "../types/index.js";
import { prisma } from "@repo/db";

const CACHE_KEY = "rl:configs:all";
const CACHE_TTL = 60;

export class ConfigCacheService {
  async getAll(): Promise<RateLimitConfig[]> {
    const redis = getRedisClient();
    const cached = await redis.get(CACHE_KEY);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Fall through to DB
      }
    }

    const configs = await prisma.rateLimitConfig.findMany({
      where: { enabled: true },
      orderBy: [{ priority: "desc" }],
    });

    await redis.set(CACHE_KEY, JSON.stringify(configs), "EX", CACHE_TTL);
    return configs;
  }

  async findMatching(
    route: string,
    _method: string,
    identifierType?: IdentifierType,
  ): Promise<RateLimitConfig[]> {
    const allConfigs = await this.getAll();

    return allConfigs.filter((cfg) => {
      if (identifierType && cfg.identifierType !== identifierType) return false;
      if (!cfg.routePattern || cfg.routePattern === "*") return true;
      if (cfg.routePattern === route) return true;

      try {
        const pattern = cfg.routePattern
          .replace(/\*/g, ".*")
          .replace(/\?/g, ".");
        return new RegExp(`^${pattern}$`).test(route);
      } catch {
        return false;
      }
    });
  }

  async invalidate(id?: string): Promise<void> {
    const redis = getRedisClient();
    if (id) {
      await redis.del(`rl:config:${id}`);
    }
    await redis.del(CACHE_KEY);
  }

  async warmup(): Promise<void> {
    await this.getAll();
  }
}
