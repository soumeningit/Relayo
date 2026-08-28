export type DestinationStatus = "active" | "paused";
export type CircuitState = "closed" | "open" | "half_open";

/** Raw delivery row returned by GET /org/:identifier/destinations/:id/details */
export interface DestinationDelivery {
  id: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "PAUSED";
  attempts: number;
  lastResponseStatusCode: number | null;
  lastErrorMessage: string | null;
  updatedAt: string;
  event: {
    eventId: string;
    eventType: string;
  };
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export interface Destination {
  deliveries?: DestinationDelivery[];
  id: string;
  name: string;
  url: string;
  status: DestinationStatus;
  consecutiveFailures: number;
  createdAt: string;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
}

/** Derive circuit state from consecutive failures. */
export function circuitStateOf(
  failures: number,
): "closed" | "open" | "half_open" {
  if (failures === 0) return "closed";
  if (failures >= 5) return "open";
  return "half_open";
}

export interface SigningSecret {
  destinationId: string;
  secret: string;
}

export type DeliveryStatus =
  | "pending"
  | "delivered"
  | "failed"
  | "dead_letter"
  | "paused";

export interface DeliveryAttempt {
  attemptNumber: number;
  responseCode: number | null;
  latencyMs: number | null;
  error: string | null;
  attemptedAt: string;
}

export interface Delivery {
  id: string;
  eventId: string;
  destinationId: string;
  status: DeliveryStatus;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  lastResponseCode: number | null;
  lastError: string | null;
  attempts: DeliveryAttempt[];
  updatedAt: string;
}

export interface WebhookEvent {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: string;
}

/** Delivery joined with its event/destination for table display */
export interface DeliveryRow extends Delivery {
  eventType: string;
  destinationUrl: string;
}

export interface DashboardStats {
  eventsLast24h: number;
  successRatePct: number;
  pendingRetries: number;
  deadLettered: number;
}

export interface DestinationFilters {
  status?: DestinationStatus;
}
