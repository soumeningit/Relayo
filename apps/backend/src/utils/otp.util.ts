import { generateSecret, generateURI, verify } from "otplib";

const APP_NAME = process.env.APP_NAME || "Relayo";

export function generateMfaSecret(): string {
  return generateSecret();
}

export function generateMfaUri(email: string, secret: string): string {
  return generateURI({
    issuer: APP_NAME,
    label: email,
    secret,
  });
}

interface OtpCheckResult {
  valid: boolean;
  timeStep?: number;
}

/**
 * Verifies a 6-digit TOTP code against the user's secret.
 * Fails closed on malformed input or any thrown OTPError.
 */
export async function verifyMfaOtp(
  token: string,
  secret: string,
  afterTimeStep?: number | null,
): Promise<OtpCheckResult> {
  if (!token || !/^\d{6}$/.test(token)) {
    return { valid: false };
  }

  try {
    const result = await verify({
      secret,
      token,
      strategy: "totp",
      epochTolerance: 30, // one adjacent 30s period either side
      ...(afterTimeStep != null ? { afterTimeStep } : {}),
    });

    if (!result.valid) return { valid: false };

    const timeStep = "timeStep" in result ? result.timeStep : undefined;
    return { valid: true, timeStep };
  } catch {
    return { valid: false };
  }
}
