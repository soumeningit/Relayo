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
//   keyPrefix: "", // Generic: No prefix by default
//   clusterEnabled: false,
//   clusterNodes: [],
// };

// let client: Redis | Cluster | null = null;
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

//   client.on("error", (err: any) => {
//     console.error("[redis] Client error:", err.message);
//   });

//   return client;
// }

// export function getBullMQConnection(): Redis {
//   if (bullMqConnection) return bullMqConnection;

//   bullMqConnection = new Redis({
//     host: lastConfig.host,
//     port: lastConfig.port,
//     password: lastConfig.password,
//     db: lastConfig.db,
//     maxRetriesPerRequest: null, // NO keyPrefix
//   });

//   bullMqConnection.on("error", (err: any) => {
//     console.error("[redis] BullMQ error:", err.message);
//   });

//   return bullMqConnection;
// }

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

//   await new Promise<void>((resolve, reject) => {
//     const timer = setTimeout(
//       () =>
//         reject(new Error(`Redis connection timed out after ${timeoutMs}ms`)),
//       timeoutMs,
//     );

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
//     /* ignore */
//   }

//   if (client) {
//     await client.quit();
//     client = null;
//   }
// }

import Redis, { Cluster } from "ioredis";

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  clusterEnabled?: boolean;
  clusterNodes?: Array<{ host: string; port: number }>;
}

interface ResolvedRedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  clusterEnabled: boolean;
  clusterNodes: Array<{ host: string; port: number }>;
}

const DEFAULT_CONFIG: ResolvedRedisConfig = {
  host: "localhost",
  port: 6379,
  // Removed undefined here, handled dynamically now
  db: 0,
  keyPrefix: "",
  clusterEnabled: false,
  clusterNodes: [],
};

function getValidPassword(pass?: string): string | undefined {
  if (!pass || pass === "undefined" || pass.trim() === "") {
    return undefined;
  }
  return pass;
}

let client: Redis | Cluster | null = null;
let bullMqConnection: Redis | null = null;
let lastConfig: ResolvedRedisConfig = { ...DEFAULT_CONFIG };

export function getRedisClient(config?: RedisConfig): Redis | Cluster {
  if (client) return client;

  lastConfig = { ...DEFAULT_CONFIG, ...config };

  if (lastConfig.clusterEnabled && lastConfig.clusterNodes.length > 0) {
    // Cluster config
    const clusterOptions: any = {
      redisOptions: {
        keyPrefix: lastConfig.keyPrefix,
        maxRetriesPerRequest: null,
        password: getValidPassword(lastConfig.password), // <-- USE HELPER
      },
    };
    // Only pass password if it exists
    // if (lastConfig.password) {
    //   clusterOptions.redisOptions.password = lastConfig.password;
    // }

    client = new Cluster(lastConfig.clusterNodes, clusterOptions);
  } else {
    // Standard standalone config
    const clientOptions: any = {
      host: lastConfig.host,
      port: lastConfig.port,
      db: lastConfig.db,
      keyPrefix: lastConfig.keyPrefix,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy(times: number) {
        return Math.min(times * 50, 2000);
      },
      password: getValidPassword(lastConfig.password), // <-- USE HELPER
    };
    // Only pass password if it exists
    // if (lastConfig.password) {
    //   clientOptions.password = lastConfig.password;
    // }

    client = new Redis(clientOptions);
  }

  client.on("error", (err: any) => {
    console.error("[redis] Client error:", err.message);
  });

  return client;
}

export function getBullMQConnection(): Redis {
  if (bullMqConnection) return bullMqConnection;

  // BullMQ config
  const bullMqOptions: any = {
    host: lastConfig.host,
    port: lastConfig.port,
    db: lastConfig.db,
    maxRetriesPerRequest: null,
    password: getValidPassword(lastConfig.password), // <-- USE HELPER
  };
  // Only pass password if it exists (Fixes the SASL error)
  // if (lastConfig.password) {
  //   bullMqOptions.password = lastConfig.password;
  // }

  bullMqConnection = new Redis(bullMqOptions);

  bullMqConnection.on("error", (err: any) => {
    console.error("[redis] BullMQ error:", err.message);
  });

  return bullMqConnection;
}

export async function loadScript(script: string): Promise<string> {
  const redis = getRedisClient() as unknown as {
    script: (subcommand: string, code: string) => Promise<string>;
  };
  return redis.script("load", script);
}

export async function connectRedis(
  config?: RedisConfig,
  timeoutMs = 5000,
): Promise<void> {
  const redis = getRedisClient(config);

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(new Error(`Redis connection timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );

    redis
      .ping()
      .then(() => {
        clearTimeout(timer);
        resolve();
      })
      .catch((err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}

export async function disconnectRedis(): Promise<void> {
  try {
    if (bullMqConnection) {
      await bullMqConnection.quit();
      bullMqConnection = null;
    }
  } catch {
    /* ignore */
  }

  if (client) {
    await client.quit();
    client = null;
  }
}
