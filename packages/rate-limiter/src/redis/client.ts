// import Redis, { Cluster } from "ioredis";

// export interface RedisConfig {
//   host?: string;
//   port?: number;
//   password?: string;
//   db?: number;
//   keyPrefix?: string;
//   clusterEnabled?: boolean;
//   clusterNodes?: Array<{ host: string; port: number }>;
// }

// interface ResolvedRedisConfig {
//   host: string;
//   port: number;
//   password?: string;
//   db: number;
//   keyPrefix: string;
//   clusterEnabled: boolean;
//   clusterNodes: Array<{ host: string; port: number }>;
// }

// const DEFAULT_CONFIG: ResolvedRedisConfig = {
//   host: "localhost",
//   port: 6379,
//   password: undefined,
//   db: 0,
//   keyPrefix: "rl:",
//   clusterEnabled: false,
//   clusterNodes: [],
// };

// let client: Redis | Cluster | null = null;

// /** Separate connection for BullMQ — it forbids ioredis keyPrefix */
// let bullMqConnection: Redis | null = null;

// let lastConfig: ResolvedRedisConfig = { ...DEFAULT_CONFIG };

// export function getRedisClient(config?: RedisConfig): Redis | Cluster {
//   if (client) return client;

//   lastConfig = { ...DEFAULT_CONFIG, ...config };

//   if (lastConfig.clusterEnabled && lastConfig.clusterNodes.length > 0) {
//     client = new Cluster(lastConfig.clusterNodes, {
//       redisOptions: {
//         password: lastConfig.password,
//         keyPrefix: lastConfig.keyPrefix,
//         maxRetriesPerRequest: null,
//       },
//     });
//   } else {
//     client = new Redis({
//       host: lastConfig.host,
//       port: lastConfig.port,
//       password: lastConfig.password,
//       db: lastConfig.db,
//       keyPrefix: lastConfig.keyPrefix,
//       maxRetriesPerRequest: null,
//       lazyConnect: true,
//       retryStrategy(times: number) {
//         return Math.min(times * 50, 2000);
//       },
//     });
//   }

//   client.on("error", (err) => {
//     console.error("[rate-limiter] Redis error:", err.message);
//   });

//   return client;
// }

// /**
//  * Connection for BullMQ queues/workers. BullMQ manages its own key layout
//  * and throws if the underlying ioredis client has a keyPrefix configured,
//  * so this is a dedicated connection without one.
//  */
// export function getBullMQConnection(): Redis {
//   if (bullMqConnection) return bullMqConnection;

//   bullMqConnection = new Redis({
//     host: lastConfig.host,
//     port: lastConfig.port,
//     password: lastConfig.password,
//     db: lastConfig.db,
//     // NO keyPrefix here — required by BullMQ
//     maxRetriesPerRequest: null,
//   });

//   bullMqConnection.on("error", (err) => {
//     console.error("[rate-limiter] BullMQ Redis error:", err.message);
//   });

//   return bullMqConnection;
// }

// /**
//  * Loads a Lua script once and returns its SHA (ioredis's `.script()` typing
//  * is too narrow, hence the structural cast).
//  */
// export async function loadScript(script: string): Promise<string> {
//   const redis = getRedisClient() as unknown as {
//     script: (subcommand: string, code: string) => Promise<string>;
//   };
//   return redis.script("load", script);
// }

// export async function connectRedis(
//   config?: RedisConfig,
//   timeoutMs = 5000,
// ): Promise<void> {
//   const redis = getRedisClient(config);

//   // maxRetriesPerRequest is null, so ping() can pend forever while Redis is
//   // unreachable — bound the wait so callers can degrade gracefully.
//   await new Promise<void>((resolve, reject) => {
//     const timer = setTimeout(
//       () =>
//         reject(new Error(`Redis connection timed out after ${timeoutMs}ms`)),
//       timeoutMs,
//     );

//     // Floating-ping safety: swallow any late rejection
//     redis
//       .ping()
//       .then(() => {
//         clearTimeout(timer);
//         resolve();
//       })
//       .catch((err: unknown) => {
//         clearTimeout(timer);
//         reject(err instanceof Error ? err : new Error(String(err)));
//       });
//   });
// }

// export async function disconnectRedis(): Promise<void> {
//   try {
//     if (bullMqConnection) {
//       await bullMqConnection.quit();
//       bullMqConnection = null;
//     }
//   } catch {
//     // ignore — may already be disconnected
//   }

//   if (client) {
//     await client.quit();
//     client = null;
//   }
// }

import {
  getRedisClient as baseGetClient,
  getBullMQConnection as baseGetBullMQ,
  connectRedis as baseConnect,
  disconnectRedis as baseDisconnect,
  loadScript as baseLoadScript,
  RedisConfig,
} from "@repo/redis";

// Rate Limiter specific defaults
const RATE_LIMITER_CONFIG: RedisConfig = {
  keyPrefix: "rl:", // Force the 'rl:' prefix back!
};

// Add explicit return types using ReturnType to fix the TS 2742 error
export function getRedisClient(
  config?: RedisConfig,
): ReturnType<typeof baseGetClient> {
  return baseGetClient({ ...RATE_LIMITER_CONFIG, ...config });
}

export function getBullMQConnection(): ReturnType<typeof baseGetBullMQ> {
  return baseGetBullMQ();
}

export function connectRedis(
  config?: RedisConfig,
  timeoutMs?: number,
): ReturnType<typeof baseConnect> {
  return baseConnect({ ...RATE_LIMITER_CONFIG, ...config }, timeoutMs);
}

export function disconnectRedis(): ReturnType<typeof baseDisconnect> {
  return baseDisconnect();
}

export function loadScript(script: string): ReturnType<typeof baseLoadScript> {
  return baseLoadScript(script);
}

// Re-export types so other rate-limiter files don't break
export type { RedisConfig };
