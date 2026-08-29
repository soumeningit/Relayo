import "dotenv/config";
import Razorpay from "razorpay";
import { AppError } from "../errors/AppError";
import { PaymentPlanType } from "../type";

function requireConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new AppError(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      503,
      "RAZORPAY_NOT_CONFIGURED",
    );
  }
  return { keyId, keySecret };
}

let _razorpay: Razorpay | null = null;

// Lazy client: the backend boots without Razorpay keys (dev/CI),
// and payment endpoints surface a clear 503 until they exist.
export function getRazorpay(): Razorpay {
  if (!_razorpay) {
    const { keyId, keySecret } = requireConfig();
    _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return _razorpay;
}

// Public key id — safe to hand to the browser checkout modal.
export function getRazorpayKeyId(): string {
  return requireConfig().keyId;
}

export function getRazorpayWebhookSecret(): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new AppError(
      "RAZORPAY_WEBHOOK_SECRET is not configured.",
      503,
      "RAZORPAY_NOT_CONFIGURED",
    );
  }
  return secret;
}

// One-time monthly amounts in paise (minor units for INR).
export const PLAN_AMOUNTS_PAISE: Record<Exclude<PaymentPlanType, "FREE">, number> =
  {
    PRO: 99900,
    SCALE: 299900,
    ENTERPRISE: 999900,
  };

export const PERIOD_GRACE_DAYS = 0;