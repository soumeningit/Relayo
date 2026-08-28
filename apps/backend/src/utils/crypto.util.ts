import "dotenv/config";
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

const encryptionKey = process.env.ENCRYPTION_KEY;

if (!encryptionKey) {
  throw new Error("ENCRYPTION_KEY is not defined");
}

if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
  throw new Error(
    "ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)",
  );
}

const KEY = Uint8Array.from(
  encryptionKey.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)),
);

// Helper function for type compatibility
function toUint8Array(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(ALGORITHM, KEY, toUint8Array(iv));

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // iv:authTag:ciphertext
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encryptedHex] = encryptedText.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted value");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, toUint8Array(iv));

  decipher.setAuthTag(toUint8Array(authTag));

  const decrypted = Buffer.concat([
    decipher.update(toUint8Array(encrypted)),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
