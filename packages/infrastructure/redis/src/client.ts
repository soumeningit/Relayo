import Redis, { Cluster } from "ioredis";

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  clusterEnabled?: boolean;
  clusterNodes?: Array<{ host: string; port: number }>;
  tls?: boolean;
}

interface ResolvedRedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  clusterEnabled: boolean;
  clusterNodes: Array<{ host: string; port: number }>;
  tls: boolean;
}

const DEFAULT_CONFIG: ResolvedRedisConfig = {
  host: "localhost",
  port: 6379,
  db: 0,
  keyPrefix: "",
  clusterEnabled: false,
  clusterNodes: [],
  tls: false,
};

function readTlsFlag(): boolean {
  const value = process.env.REDIS_TLS;
  return value === "1" || value?.toLowerCase() === "true";
}

// ioredis enables TLS when the `tls` option is an object ({}).
function maybeTls<T extends object>(options: T, enabled: boolean): T {
  return enabled ? { ...options, tls: {} } : options;
}

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

  lastConfig = { ...DEFAULT_CONFIG, tls: readTlsFlag(), ...config };

  if (lastConfig.clusterEnabled && lastConfig.clusterNodes.length > 0) {
    // Cluster config
    const clusterOptions: any = maybeTls(
      {
        redisOptions: {
          keyPrefix: lastConfig.keyPrefix,
          maxRetriesPerRequest: null,
          password: getValidPassword(lastConfig.password), // <-- USE HELPER
        },
      },
      lastConfig.tls,
    );

    client = new Cluster(lastConfig.clusterNodes, clusterOptions);
  } else {
    // Standard standalone config
    const clientOptions: any = maybeTls(
      {
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
      },
      lastConfig.tls,
    );

    client = new Redis(clientOptions);
  }

  client.on("error", (err: any) => {
    console.error("[redis] Client error:", err.message);
  });

  return client;
}

export function getBullMQConnection(): Redis {
  if (bullMqConnection) return bullMqConnection;

  // Read env vars directly rather than `lastConfig` — getBulMQConnection() is
  // invoked during static imports, before getRedisClient(config) has set
  // lastConfig, so it would otherwise connect to the local defaults.
  const host = process.env.REDIS_HOST || "localhost";
  const port = parseInt(process.env.REDIS_PORT || "6379");
  const password = process.env.REDIS_PASSWORD || undefined;
  const tls = readTlsFlag();

  const bullMqOptions: any = maybeTls(
    {
      host,
      port,
      db: 0,
      maxRetriesPerRequest: null,
      password: getValidPassword(password),
    },
    tls,
  );

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
