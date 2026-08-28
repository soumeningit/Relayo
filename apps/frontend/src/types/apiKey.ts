export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export interface CreateKeyResponse {
  id: string;
  apiKey: string;
  prefix: string;
}

export interface RotateKeyResponse {
  apiKey: string;
  prefix: string;
}
