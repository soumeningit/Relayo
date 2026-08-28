import { slugify, minutesAgo } from "../../lib/time";
import { mockDeliveries, mockDestinations, mockEvents } from "../../mock/data";
import type {
  ApiKey,
  DashboardStats,
  Delivery,
  DeliveryRow,
  DeliveryStatus,
  Destination,
  SigningSecret,
  Tenant,
  WebhookEvent,
} from "../../types/dashboard";

const TENANT_STORAGE_KEY = "relayo-mock-tenant";
const API_KEY_PREFIX = "rk_live";

function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function randomToken(bytes: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const randoms = crypto.getRandomValues(new Uint8Array(bytes));
  randoms.forEach((byte) => {
    out += chars[byte % chars.length];
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Tenant                                                              */
/* ------------------------------------------------------------------ */

let tenantCache: Tenant | null | undefined;

export async function getMyTenant(): Promise<Tenant | null> {
  if (tenantCache !== undefined) return delay(tenantCache, 150);

  try {
    const raw = localStorage.getItem(TENANT_STORAGE_KEY);
    tenantCache = raw ? (JSON.parse(raw) as Tenant) : null;
  } catch {
    tenantCache = null;
  }
  return delay(tenantCache, 150);
}

export async function createTenant(name: string): Promise<Tenant> {
  const tenant: Tenant = {
    id: `tnt_${randomToken(10)}`,
    name: name.trim(),
    slug: slugify(name),
    createdAt: new Date().toISOString(),
  };
  tenantCache = tenant;
  localStorage.setItem(TENANT_STORAGE_KEY, JSON.stringify(tenant));
  return delay(tenant);
}

export async function renameTenant(
  tenantId: string,
  name: string,
): Promise<Tenant> {
  if (!tenantCache || tenantCache.id !== tenantId) {
    throw new Error("Tenant not found");
  }
  tenantCache = { ...tenantCache, name: name.trim(), slug: slugify(name) };
  localStorage.setItem(TENANT_STORAGE_KEY, JSON.stringify(tenantCache));
  return delay(tenantCache);
}

/* ------------------------------------------------------------------ */
/* API keys                                                            */
/* ------------------------------------------------------------------ */

const apiKeys: ApiKey[] = [
  {
    id: "key_01",
    name: "Default key",
    prefix: `${API_KEY_PREFIX}_a3f8`,
    scopes: [],
    createdAt: minutesAgo(60 * 24 * 40),
    lastUsedAt: minutesAgo(12),
    expiresAt: null,
  },
];

export async function listApiKeys(): Promise<ApiKey[]> {
  return delay([...apiKeys]);
}

/** Full key is returned exactly once */
export async function createApiKey(): Promise<{ key: ApiKey; secret: string }> {
  const secret = `${API_KEY_PREFIX}_${randomToken(24)}`;
  const key: ApiKey = {
    id: `key_${randomToken(6)}`,
    name: "New key",
    prefix: secret.slice(0, 13),
    scopes: [],
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    expiresAt: null,
  };
  apiKeys.unshift(key);
  return delay({ key, secret });
}

export async function rotateApiKey(id: string): Promise<{
  key: ApiKey;
  secret: string;
}> {
  const index = apiKeys.findIndex((k) => k.id === id);
  if (index === -1) throw new Error("API key not found");
  const secret = `${API_KEY_PREFIX}_${randomToken(24)}`;
  const rotated: ApiKey = {
    ...apiKeys[index],
    prefix: secret.slice(0, 13),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };
  apiKeys[index] = rotated;
  return delay({ key: rotated, secret });
}

export async function revokeApiKey(id: string): Promise<void> {
  const index = apiKeys.findIndex((k) => k.id === id);
  if (index !== -1) apiKeys.splice(index, 1);
  return delay(undefined);
}

/* ------------------------------------------------------------------ */
/* Destinations                                                        */
/* ------------------------------------------------------------------ */

export async function listDestinations(): Promise<Destination[]> {
  return delay(
    [...mockDestinations].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    ),
  );
}

export async function getDestination(id: string): Promise<Destination | null> {
  return delay(mockDestinations.find((d) => d.id === id) ?? null);
}

export async function createDestination(
  url: string,
): Promise<{ destination: Destination; signingSecret: SigningSecret }> {
  const destination: Destination = {
    id: `dst_${randomToken(8)}`,
    name: "New destination",
    url,
    status: "active",
    consecutiveFailures: 0,
    createdAt: new Date().toISOString(),
    lastSuccessAt: null,
    lastFailureAt: null,
  };
  mockDestinations.unshift(destination);
  return delay({
    destination,
    signingSecret: { destinationId: destination.id, secret: `whsec_${randomToken(32)}` },
  });
}

export async function rotateDestinationSecret(
  id: string,
): Promise<SigningSecret> {
  const destination = mockDestinations.find((d) => d.id === id);
  if (!destination) throw new Error("Destination not found");
  return delay({ destinationId: id, secret: `whsec_${randomToken(32)}` });
}

async function setStatus(
  id: string,
  status: Destination["status"],
): Promise<Destination> {
  const destination = mockDestinations.find((d) => d.id === id);
  if (!destination) throw new Error("Destination not found");
  destination.status = status;
  if (status === "active") {
    destination.consecutiveFailures = 0;
  }
  return delay(destination);
}

export async function pauseDestination(id: string): Promise<Destination> {
  return setStatus(id, "paused");
}

export async function resumeDestination(id: string): Promise<Destination> {
  return setStatus(id, "active");
}

export async function deleteDestination(id: string): Promise<void> {
  const index = mockDestinations.findIndex((d) => d.id === id);
  if (index !== -1) mockDestinations.splice(index, 1);
  return delay(undefined);
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export async function listEvents(): Promise<WebhookEvent[]> {
  return delay(
    [...mockEvents].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    ),
  );
}

export async function getEvent(id: string): Promise<WebhookEvent | null> {
  return delay(mockEvents.find((e) => e.id === id) ?? null);
}

/* ------------------------------------------------------------------ */
/* Deliveries                                                          */
/* ------------------------------------------------------------------ */

function toRow(delivery: Delivery): DeliveryRow {
  const event = mockEvents.find((e) => e.id === delivery.eventId);
  const destination = mockDestinations.find(
    (d) => d.id === delivery.destinationId,
  );
  return {
    ...delivery,
    eventType: event?.eventType ?? "unknown.event",
    destinationUrl: destination?.url ?? "unknown destination",
  };
}

export async function listDeliveries(filters?: {
  status?: DeliveryStatus;
  destinationId?: string;
  eventId?: string;
}): Promise<DeliveryRow[]> {
  let rows = mockDeliveries.map(toRow);
  if (filters?.status) {
    rows = rows.filter((r) => r.status === filters.status);
  }
  if (filters?.destinationId) {
    rows = rows.filter((r) => r.destinationId === filters.destinationId);
  }
  if (filters?.eventId) {
    rows = rows.filter((r) => r.eventId === filters.eventId);
  }
  return delay(rows.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)));
}

export async function getDelivery(id: string): Promise<DeliveryRow | null> {
  const delivery = mockDeliveries.find((d) => d.id === id);
  return delivery ? delay(toRow(delivery)) : delay(null);
}

/** Manual replay — re-queues a terminal delivery (at-least-once semantics) */
export async function replayDelivery(id: string): Promise<DeliveryRow> {
  const delivery = mockDeliveries.find((d) => d.id === id);
  if (!delivery) throw new Error("Delivery not found");

  delivery.status = "pending";
  delivery.attemptCount = 0;
  delivery.nextRetryAt = new Date(Date.now() + 2000).toISOString();
  delivery.lastError = null;
  delivery.attempts = [];
  delivery.updatedAt = new Date().toISOString();

  return delay(toRow(delivery));
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

export async function getDashboardStats(): Promise<DashboardStats> {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

  const eventsLast24h = mockEvents.filter(
    (e) => +new Date(e.createdAt) >= dayAgo,
  ).length;

  const terminal = mockDeliveries.filter(
    (d) => d.status === "delivered" || d.status === "dead_letter",
  );
  const delivered = mockDeliveries.filter((d) => d.status === "delivered");
  const successRatePct = terminal.length
    ? Math.round((delivered.length / terminal.length) * 100)
    : 100;

  return delay({
    eventsLast24h,
    successRatePct,
    pendingRetries: mockDeliveries.filter((d) => d.status === "failed").length,
    deadLettered: mockDeliveries.filter((d) => d.status === "dead_letter")
      .length,
  });
}
