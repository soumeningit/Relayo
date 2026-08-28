import type {
  ApiKey,
  CreateKeyResponse,
  RotateKeyResponse,
} from "../../types/apiKey";
import { api } from "../axios";
import { orgEndpoints } from "../endpoints";

function keysBase(orgId: string) {
  return `${orgEndpoints.DETAIL(orgId)}/keys`;
}

export async function listApiKeys(orgId: string): Promise<ApiKey[]> {
  const res = await api.get<{ success: boolean; data: ApiKey[] }>(
    keysBase(orgId),
  );
  return res.data.data;
}

export async function createApiKey(
  orgId: string,
  payload: { name: string; scopes?: string[]; expiresAt?: string },
): Promise<CreateKeyResponse> {
  try {
    const res = await api.post<{ success: boolean; data: CreateKeyResponse }>(
      keysBase(orgId),
      payload,
    );
    return res.data.data;
  } catch (error: any) {
    throw error;
  }
}

export async function rotateApiKey(
  orgId: string,
  keyId: string,
  otp: string,
): Promise<RotateKeyResponse> {
  const res = await api.patch<{ success: boolean; data: RotateKeyResponse }>(
    `${keysBase(orgId)}/${keyId}/rotate`,
    { otp },
  );
  return res.data.data;
}

export async function revokeApiKey(
  orgId: string,
  keyId: string,
  otp: string,
): Promise<void> {
  await api.patch(`${keysBase(orgId)}/${keyId}/revoke`, { otp });
}

export async function setupMfa(orgId: string): Promise<{ qrCode: string }> {
  const res = await api.post<{ success: boolean; data: { qrCode: string } }>(
    `${keysBase(orgId)}/mfa/setup`,
  );
  return res.data.data;
}

export async function completeMfaSetup(
  orgId: string,
  otp: string,
): Promise<void> {
  await api.post(`${keysBase(orgId)}/mfa/complete`, { otp });
}
