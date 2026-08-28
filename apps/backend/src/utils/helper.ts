import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { API_KEY_PREFIX_LENGTH } from "../type";

export function generateJwtToken(
  payload: object,
  expiresIn: SignOptions["expiresIn"],
): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not defined");
  }

  return jwt.sign(payload, secret, {
    expiresIn,
    algorithm: "HS256",
  });
}

export function createToken() {
  return crypto.randomBytes(32).toString("hex") + "-" + Date.now();
}

export function verifyJwtToken(token: string): JwtPayload | null {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not defined");
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (typeof decoded === "string") {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export function createUserId(): string {
  return crypto.randomBytes(16).toString("hex") + "-" + Date.now();
}

export function slugGenerator(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "") +
    "-" +
    Date.now()
  );
}

export function generateOrganizationId(): string {
  return "ORG-" + crypto.randomBytes(16).toString("hex") + "-" + Date.now();
}

export function generateApiKey(): { apiKey: string; prefix: string } {
  const secret = crypto.randomBytes(32).toString("hex");
  const apiKey = `REL-${secret}`;

  const prefix = apiKey.slice(0, API_KEY_PREFIX_LENGTH);

  return { apiKey, prefix };
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

export function verifyApiKey(apiKey: string, storedHash: string): boolean {
  const hash = new Uint8Array(Buffer.from(hashApiKey(apiKey), "hex"));

  const stored = new Uint8Array(Buffer.from(storedHash, "hex"));

  if (hash.length !== stored.length) {
    return false;
  }

  return crypto.timingSafeEqual(hash, stored);
}

export function createAPIKeyId(data: string): string {
  const id = crypto.randomBytes(16).toString("hex");
  return `${data}-${id}`;
}

export function generateDestinationId(): string {
  return "DST-" + crypto.randomBytes(16).toString("hex") + "-" + Date.now();
}

export function generateDestinationSigningSecret(): string {
  const key = crypto.randomBytes(32).toString("hex");

  return `DST-REL-${key}`;
}

export function generateAddressId(type: string): string {
  return `ADDR-${type.slice(0, 2).toUpperCase()}-${crypto.randomBytes(16).toString("hex")}`;
}
