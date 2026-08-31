import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// TLS policy for the DB connection. Encryption is enabled when the URL's
// sslmode says so (or by an explicit flag); these env vars control the
// certificate verification:
//   PG_SSL_CA_CERT  — inline PEM CA bundle. Full certificate verification
//                     against that CA (preferred for OCR services like Aiven).
//   PG_SSL_NO_VERIFY— encrypt without verifying the server cert. Fallback
//                     for hosts with self-signed certs; never set when a CA
//                     is available.
const sslNoVerify =
  process.env.PG_SSL_NO_VERIFY === "1" ||
  process.env.PG_SSL_NO_VERIFY?.toLowerCase() === "true";

const sslCaCert = process.env.PG_SSL_CA_CERT?.trim();

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// Parse DATABASE_URL ourselves and pass the fields to pg explicitly. If we
// pass a `connectionString`, pg re-parses it and its sslmode handling
// OVERWRITES the `ssl` option we set, silently dropping our CA/no-verify
// config. Without the `connectionString` key, pg uses `config.ssl` as-is.
function parseConnectionUrl(raw: string | undefined) {
  if (!raw) {
    return { host: undefined, port: undefined, user: undefined, password: undefined, database: undefined, wantsSsl: false };
  }
  const url = new URL(raw);
  const sslmode = url.searchParams.get("sslmode");
  return {
    host: url.hostname || undefined,
    port: url.port ? Number(url.port) : undefined,
    user: url.username ? safeDecode(url.username) : undefined,
    password: url.password ? safeDecode(url.password) : undefined,
    database: url.pathname.replace(/^\//, "") || undefined,
    wantsSsl: sslmode !== null && sslmode !== "disable",
  };
}

const connection = parseConnectionUrl(process.env.DATABASE_URL);

let ssl: { rejectUnauthorized?: boolean; ca?: string } | undefined;
if (sslCaCert) {
  ssl = { ca: sslCaCert, rejectUnauthorized: true };
} else if (sslNoVerify) {
  ssl = { rejectUnauthorized: false };
} else if (connection.wantsSsl) {
  ssl = {};
}

if (sslCaCert && sslNoVerify) {
  console.warn(
    "[db] both PG_SSL_CA_CERT and PG_SSL_NO_VERIFY are set — PG_SSL_CA_CERT wins (verification on).",
  );
}

const sslMode =
  ssl === undefined ? "off" : ssl.rejectUnauthorized === false ? "no-verify" : "verify";
console.log(
  `[db] connecting to ${connection.host ?? "defaults"} tls=${sslMode}`,
);

const adapter = new PrismaPg({
  host: connection.host,
  port: connection.port,
  user: connection.user,
  password: connection.password,
  database: connection.database,
  ...(ssl ? { ssl } : {}),
  max: Number(process.env.DB_POOL_MAX || 20),
  connectionTimeoutMillis: Number(
    process.env.DB_CONNECTION_TIMEOUT_MS || 5000,
  ),
});

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;