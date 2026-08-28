import { api } from "../axios";
import { orgEndpoints } from "../endpoints";
import type { Destination, SigningSecret } from "../../types/dashboard";

function destBase(orgId: string) {
  return `${orgEndpoints.DETAIL(orgId)}/destinations`;
}

export async function listDestinations(orgId: string): Promise<Destination[]> {
  const res = await api.get<{ success: boolean; data: Destination[] }>(
    destBase(orgId),
  );
  return res.data.data;
}

export async function getDestination(
  orgId: string,
  destinationId: string,
): Promise<Destination> {
  const res = await api.get<{ success: boolean; data: Destination }>(
    `${destBase(orgId)}/${destinationId}`,
  );
  return res.data.data;
}

export async function createDestination(
  orgId: string,
  payload: { name: string; url: string },
): Promise<{ destination: Destination; signingSecret: string }> {
  const res = await api.post<{
    success: boolean;
    data: { destination: Destination; signingSecret: string };
  }>(destBase(orgId), payload);

  return res.data.data;
}

export async function pauseDestination(
  orgId: string,
  destinationId: string,
): Promise<Destination> {
  const res = await api.patch<{ success: boolean; data: Destination }>(
    `${destBase(orgId)}/${destinationId}/pause`,
  );
  return res.data.data;
}

export async function resumeDestination(
  orgId: string,
  destinationId: string,
): Promise<Destination> {
  const res = await api.patch<{ success: boolean; data: Destination }>(
    `${destBase(orgId)}/${destinationId}/resume`,
  );
  return res.data.data;
}

export async function rotateDestinationSecret(
  orgId: string,
  destinationId: string,
): Promise<SigningSecret> {
  const res = await api.post<{ success: boolean; data: SigningSecret }>(
    `${destBase(orgId)}/${destinationId}/rotate-secret`,
  );
  return res.data.data;
}

export async function deleteDestination(
  orgId: string,
  destinationId: string,
): Promise<void> {
  await api.delete(`${destBase(orgId)}/${destinationId}`);
}

export async function getDestinationDetails(
  orgId: string,
  destinationId: string,
): Promise<Destination> {
  const res = await api.get<{ success: boolean; data: Destination }>(
    `${destBase(orgId)}/${destinationId}/details`,
  );
  return res.data.data;
}
