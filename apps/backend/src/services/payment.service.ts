import crypto from "crypto";
import { Prisma, prisma } from "@repo/db";
import {
  PaymentApiOperation,
  PaymentApiResponseStatus,
  PaymentAttemptStatus,
  PaymentEventType,
  PaymentStatus,
} from "@repo/db";
import {
  getRazorpay,
  getRazorpayKeyId,
  getRazorpayWebhookSecret,
  PLAN_AMOUNTS_PAISE,
} from "../configs/razorpay";
import { AppError } from "../errors/AppError";
import { PaymentPlanType } from "../type";

// One-time payment grants one 30-day period, starting from max(now, currentPeriodEnd).
const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

function extendPeriod(from: Date | null): Date {
  const base =
    from && from.getTime() > Date.now() ? from.getTime() : Date.now();
  return new Date(base + PERIOD_MS);
}

function signBody(content: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(content).digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  const left = Uint8Array.from(Buffer.from(a));
  const right = Uint8Array.from(Buffer.from(b));
  if (left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i++) {
    result |= left[i] ^ right[i];
  }
  return result === 0;
}

interface VerifyInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface OrderPayload {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

// ---------------------------------------------------------------------------
// CREATE ORDER
// ---------------------------------------------------------------------------
export async function createRazorpayOrder(
  org: { id: bigint; organizationId: string },
  planType: Exclude<PaymentPlanType, "FREE">,
): Promise<OrderPayload> {
  const amount = PLAN_AMOUNTS_PAISE[planType];
  const currency = "INR";

  const existing = await prisma.payment.findFirst({
    where: {
      organizationId: org.id,
      status: PaymentStatus.CREATED,
      planType,
    },
  });

  if (existing) {
    return {
      orderId: existing.razorpayOrderId,
      amount,
      currency,
      keyId: getRazorpayKeyId(),
    };
  }

  try {
    const order = await getRazorpay().orders.create({
      amount,
      currency,
      receipt: `relayo-${org.id}-${Date.now()}`,
      notes: { organizationId: String(org.id), planType },
    });

    const payment = await prisma.payment.create({
      data: {
        organizationId: org.id,
        razorpayOrderId: order.id as string,
        amount: amount / 100, // convert paise to rupees
        currency,
        status: PaymentStatus.CREATED,
        planType,
      },
    });

    await prisma.paymentApiResponse.create({
      data: {
        paymentId: payment.id,
        operation: PaymentApiOperation.CREATE_ORDER,
        status: PaymentApiResponseStatus.SUCCESS,
        httpStatusCode: 200,
        responseBody: order as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });

    return {
      orderId: payment.razorpayOrderId,
      amount,
      currency,
      keyId: getRazorpayKeyId(),
    };
  } catch (error) {
    console.error(
      `[Payment Service Error]: Failed to create Razorpay order for org ${org.organizationId}`,
      error,
    );
    const rzpError = error as {
      statusCode?: number;
      error?: { code?: string; description?: string };
    };
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          organizationId: org.id,
          razorpayOrderId: `failed_${Date.now()}`,
          amount: amount / 100, // convert paise to rupees
          currency,
          status: PaymentStatus.FAILED,
          planType,
          errorCode:
            rzpError.error?.code ?? String(rzpError.statusCode ?? "PROVIDER"),
          errorDescription:
            rzpError.error?.description ?? "Failed to create Razorpay order",
        },
      });
      await tx.paymentApiResponse.create({
        data: {
          paymentId: payment.id,
          operation: PaymentApiOperation.CREATE_ORDER,
          status: PaymentApiResponseStatus.ERROR,
          httpStatusCode: rzpError.statusCode ?? 0,
          errorCode: rzpError.error?.code ?? undefined,
          errorDescription:
            rzpError.error?.description ?? "Failed to create Razorpay order",
          completedAt: new Date(),
        },
      });
    });

    throw new AppError(
      "The payment provider could not create an order. Please try again.",
      502,
      "RAZORPAY_ORDER_FAILED",
    );
  }
}

// ---------------------------------------------------------------------------
// VERIFY PAYMENT (server-side signature check after the checkout modal)
// ---------------------------------------------------------------------------
export async function verifyRazorpayPayment(
  org: { id: bigint; organizationId: string },
  input: VerifyInput,
) {
  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
  });

  if (!payment || payment.organizationId !== org.id) {
    throw new AppError(
      "Payment order not found for this organization.",
      404,
      "PAYMENT_NOT_FOUND",
    );
  }

  // Idempotent success — the order was already captured for this org.
  if (
    payment.status === PaymentStatus.CAPTURED &&
    payment.razorpayPaymentId === input.razorpayPaymentId
  ) {
    return buildVerifiedState(org.id, payment.planType, true);
  }

  const attemptNumber =
    (await prisma.paymentAttempt.count({ where: { paymentId: payment.id } })) +
    1;

  await prisma.paymentAttempt.create({
    data: {
      paymentId: payment.id,
      attemptNumber,
      status: PaymentAttemptStatus.INITIATED,
      amount: Number(payment.amount),
      currency: payment.currency,
      initiatedAt: new Date(),
    },
  });

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new AppError(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      503,
      "RAZORPAY_NOT_CONFIGURED",
    );
  }

  const body = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
  if (!safeCompare(signBody(body, secret), input.razorpaySignature)) {
    await recordAttemptFailure(
      payment.id,
      attemptNumber,
      input.razorpayPaymentId,
      "Invalid payment signature",
    );
    throw new AppError(
      "Payment signature verification failed.",
      400,
      "PAYMENT_SIGNATURE_INVALID",
    );
  }

  // Signature is valid — fetch the authoritative payment state.
  let providerPayment: any;
  try {
    providerPayment = await getRazorpay().payments.fetch(
      input.razorpayPaymentId,
    );
    await recordApiCall(
      payment.id,
      PaymentApiOperation.FETCH_PAYMENT,
      "SUCCESS",
      200,
      providerPayment,
    );
  } catch (error) {
    const err = error as { statusCode?: number };
    await recordApiCall(
      payment.id,
      PaymentApiOperation.FETCH_PAYMENT,
      "ERROR",
      err.statusCode ?? 0,
      error,
    );
    throw new AppError(
      "The payment provider could not confirm the payment. Please retry.",
      502,
      "RAZORPAY_FETCH_FAILED",
    );
  }

  const status: string = providerPayment?.status;

  if (status === "captured") {
    await applyCaptured(
      payment.id,
      org.id,
      payment.planType,
      providerPayment,
      input.razorpaySignature,
    );
    return buildVerifiedState(org.id, payment.planType, true);
  }

  if (status === "authorized") {
    // Auto-capture INR orders so verification completes without a second click.
    try {
      const captured = await getRazorpay().payments.capture(
        input.razorpayPaymentId,
        Math.round(Number(payment.amount) * 100),
        "INR",
      );
      await recordApiCall(
        payment.id,
        PaymentApiOperation.CAPTURE_PAYMENT,
        "SUCCESS",
        200,
        captured,
      );
      await applyCaptured(
        payment.id,
        org.id,
        payment.planType,
        captured,
        input.razorpaySignature,
      );
      return buildVerifiedState(org.id, payment.planType, true);
    } catch (error) {
      const err = error as { statusCode?: number; message?: string };
      await recordApiCall(
        payment.id,
        PaymentApiOperation.CAPTURE_PAYMENT,
        "ERROR",
        err.statusCode ?? 0,
        {
          message: err.message ?? "Capture failed",
          code: err.statusCode ?? undefined,
        },
      );
      await recordAttemptFailure(
        payment.id,
        attemptNumber,
        input.razorpayPaymentId,
        "Capture failed",
      );
      throw new AppError(
        "Payment was authorized but could not be captured.",
        402,
        "PAYMENT_CAPTURE_FAILED",
      );
    }
  }

  if (status === "failed") {
    await recordAttemptFailure(
      payment.id,
      attemptNumber,
      input.razorpayPaymentId,
      providerPayment?.error_description ?? "Payment failed",
    );
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        razorpayPaymentId: input.razorpayPaymentId,
        failedAt: new Date(),
        errorCode: providerPayment?.error_code ?? undefined,
        errorDescription: providerPayment?.error_description ?? undefined,
        razorpayResponse: providerPayment as Prisma.InputJsonValue,
      },
    });
    return {
      captured: false,
      paymentType: payment.planType,
      message: "Payment was not completed. Please try again.",
    };
  }

  // Pending / in-progress — not authoritative yet.
  await prisma.paymentAttempt.update({
    where: {
      paymentId_attemptNumber: { paymentId: payment.id, attemptNumber },
    },
    data: {
      status: PaymentAttemptStatus.AUTHORIZED,
      razorpayPaymentId: input.razorpayPaymentId,
    },
  });
  return {
    captured: false,
    paymentType: payment.planType,
    message:
      "Payment is still processing. Authorize via the checkout modal or try again shortly.",
  };
}

// ---------------------------------------------------------------------------
// WEBHOOK (payment.captured / payment.failed reconciliation)
// ---------------------------------------------------------------------------
export async function handleRazorpayWebhook(
  rawBody: string,
  signature: string,
): Promise<boolean> {
  const secret = getRazorpayWebhookSecret();
  if (!safeCompare(signBody(rawBody, secret), signature)) {
    throw new AppError(
      "Invalid webhook signature.",
      400,
      "PAYMENT_WEBHOOK_SIGNATURE_INVALID",
    );
  }

  const payload = JSON.parse(rawBody) as {
    id: string;
    event: string;
    payload?: { payment?: { entity?: any } };
  };

  const providerPayment = payload.payload?.payment?.entity;
  if (!providerPayment) return true; // non-payment webhooks (order/review) — handled (ignore)

  const alreadyLogged = await prisma.paymentEvent.findUnique({
    where: { razorpayEventId: payload.id },
  });
  if (alreadyLogged) return true; // idempotent — event seen before

  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { razorpayPaymentId: providerPayment.id },
        { razorpayOrderId: providerPayment.order_id },
      ],
    },
  });

  // Not a payment we created — ignore. (Skipping the audit row keeps the
  // PaymentEvent.paymentId FK valid, which is required for the idempotency key.)
  if (!payment) return true;

  await prisma.paymentEvent.create({
    data: {
      paymentId: payment.id,
      eventType: mapWebhookToEventType(payload.event),
      razorpayEventId: payload.id,
      providerCreatedAt: providerPayment.created_at
        ? new Date(providerPayment.created_at * 1000)
        : new Date(),
      paymentSnapshot: providerPayment as Prisma.InputJsonValue,
      webhookPayload: payload as unknown as Prisma.InputJsonValue,
      rawPayload: rawBody,
      webhookSignature: signature,
      signatureVerified: true,
      occurredAt: new Date(),
    },
  });

  if (
    payload.event === "payment.captured" &&
    payment.status !== PaymentStatus.CAPTURED
  ) {
    await applyCaptured(
      payment.id,
      payment.organizationId,
      payment.planType,
      providerPayment,
      signature,
    );
  } else if (
    payload.event === "payment.failed" &&
    payment.status === PaymentStatus.CREATED
  ) {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          razorpayPaymentId: providerPayment.id,
          failedAt: new Date(),
          razorpayResponse: providerPayment as Prisma.InputJsonValue,
        },
      }),
      prisma.paymentAttempt.updateMany({
        where: {
          paymentId: payment.id,
          status: PaymentAttemptStatus.INITIATED,
        },
        data: {
          status: PaymentAttemptStatus.FAILED,
          razorpayPaymentId: providerPayment.id,
          failedAt: new Date(),
        },
      }),
    ]);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
async function buildVerifiedState(
  orgId: bigint,
  planType: PaymentPlanType | null,
  captured: boolean,
) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    throw new AppError("Organization not found.", 404, "ORG_NOT_FOUND");
  }
  if (!captured) {
    return {
      captured: false,
      paymentType: org.PaymentType,
      paymentStatus: org.paymentStatus,
      currentPeriodEnd: org.currentPeriodEnd,
      completedSteps: org.completedSteps,
    };
  }
  return {
    captured: true,
    paymentType: planType ?? org.PaymentType,
    paymentStatus: org.paymentStatus,
    currentPeriodEnd: org.currentPeriodEnd,
    completedSteps: org.completedSteps,
  };
}

async function applyCaptured(
  paymentId: string,
  orgId: bigint,
  planType: PaymentPlanType | null,
  providerPayment: any,
  signature: string,
) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment)
    throw new AppError("Payment not found.", 404, "PAYMENT_NOT_FOUND");

  const card = providerPayment?.card ?? {};
  const capturedAt =
    providerPayment?.captured_at ?? providerPayment?.created_at
      ? new Date(
          (providerPayment?.captured_at ?? providerPayment?.created_at) * 1000,
        )
      : new Date();

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CAPTURED,
        razorpayPaymentId: providerPayment.id,
        method: providerPayment.method ?? undefined,
        email: providerPayment.email ?? undefined,
        contact: providerPayment.contact ?? undefined,
        description: providerPayment.description ?? undefined,
        amountRefunded: (providerPayment.amount_refunded ?? 0) / 100,
        amountTransferred: (providerPayment.amount_transferred ?? 0) / 100,
        fee: providerPayment.fee ?? undefined,
        tax: providerPayment.tax ?? undefined,
        captured: true,
        bank: providerPayment.bank ?? undefined,
        wallet: providerPayment.wallet ?? undefined,
        vpa: providerPayment.vpa ?? undefined,
        cardId: card.id ?? undefined,
        cardLast4: card.last4 ?? undefined,
        cardNetwork: card.network ?? undefined,
        cardType: card.type ?? undefined,
        cardIssuer: card.issuer ?? undefined,
        errorCode: undefined,
        errorDescription: undefined,
        errorSource: undefined,
        errorStep: undefined,
        errorReason: undefined,
        notes: providerPayment.notes as Prisma.InputJsonValue,
        razorpayResponse: providerPayment as Prisma.InputJsonValue,
        capturedAt,
      },
    });

    await tx.paymentAttempt.updateMany({
      where: { paymentId, status: PaymentAttemptStatus.INITIATED },
      data: {
        status: PaymentAttemptStatus.CAPTURED,
        razorpayPaymentId: providerPayment.id,
        capturedAt,
      },
    });

    await tx.paymentEvent.create({
      data: {
        paymentId,
        eventType: PaymentEventType.PAYMENT_VERIFIED,
        razorpayEventId: `verified_${providerPayment.id}`,
        providerCreatedAt: capturedAt,
        paymentSnapshot: providerPayment as Prisma.InputJsonValue,
        webhookSignature: signature ?? undefined,
        signatureVerified: true,
        occurredAt: new Date(),
      },
    });

    if (planType && planType !== "FREE") {
      const org = await tx.organization.findUnique({ where: { id: orgId } });
      if (org) {
        await tx.organization.update({
          where: { id: orgId },
          data: {
            PaymentType: planType,
            paymentStatus: "ACTIVE",
            currentPeriodEnd: extendPeriod(org.currentPeriodEnd),
            completedSteps: Math.max(org.completedSteps ?? 0, 3),
            status: "ACTIVE",
            updatedAt: new Date(),
          },
        });
      }
    }
  });
}

async function recordAttemptFailure(
  paymentId: string,
  attemptNumber: number,
  razorpayPaymentId: string | null,
  message: string,
) {
  await prisma.paymentAttempt.updateMany({
    where: { paymentId, attemptNumber },
    data: {
      status: PaymentAttemptStatus.FAILED,
      razorpayPaymentId,
      errorDescription: message,
      failedAt: new Date(),
    },
  });
}

async function recordApiCall(
  paymentId: string,
  operation: PaymentApiOperation,
  status: "SUCCESS" | "ERROR",
  httpStatusCode: number,
  response: unknown,
) {
  await prisma.paymentApiResponse.create({
    data: {
      paymentId,
      operation,
      status: status as PaymentApiResponseStatus,
      httpStatusCode,
      responseBody: response as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
  });
}

function mapWebhookToEventType(event: string): PaymentEventType {
  switch (event) {
    case "payment.captured":
      return PaymentEventType.CAPTURED;
    case "payment.authorized":
      return PaymentEventType.AUTHORIZED;
    case "payment.failed":
      return PaymentEventType.FAILED;
    case "refund.processed":
      return PaymentEventType.REFUNDED;
    case "refund.partially_refunded":
      return PaymentEventType.PARTIALLY_REFUNDED;
    default:
      return PaymentEventType.CREATED;
  }
}
