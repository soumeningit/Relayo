export interface Event {
  id: string;
  eventType: string;
  idempotencyKey: string;
  createdAt: string;
  deliveryCount: number;
}

export type DeliveryStatus = "delivered" | "dead_letter" | "paused" | "pending";

export interface Delivery {
  id: string;
  destinationUrl: string;
  status: DeliveryStatus;
  attemptCount: number;
  maxAttempts: number;
  lastError: string | null;
  updatedAt: string;
}

export interface EventDetails {
  id: string;
  eventType: string;
  idempotencyKey: string;
  createdAt: string;
  payload: any;
  deliveries: Delivery[];
}
