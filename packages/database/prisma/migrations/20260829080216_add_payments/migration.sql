-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('INITIATED', 'AUTHORIZED', 'CAPTURED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentEventType" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'PAYMENT_VERIFIED');

-- CreateEnum
CREATE TYPE "PaymentApiOperation" AS ENUM ('CREATE_ORDER', 'FETCH_ORDER', 'FETCH_PAYMENT', 'VERIFY_PAYMENT', 'CAPTURE_PAYMENT');

-- CreateEnum
CREATE TYPE "PaymentApiResponseStatus" AS ENUM ('SUCCESS', 'ERROR');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "current_period_end" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" BIGINT NOT NULL,
    "referenceId" TEXT,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "planType" "PaymentType",
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "method" TEXT,
    "email" TEXT,
    "contact" TEXT,
    "description" TEXT,
    "amountRefunded" INTEGER NOT NULL DEFAULT 0,
    "amountTransferred" INTEGER NOT NULL DEFAULT 0,
    "fee" INTEGER,
    "tax" INTEGER,
    "captured" BOOLEAN NOT NULL DEFAULT false,
    "bank" TEXT,
    "wallet" TEXT,
    "vpa" TEXT,
    "cardId" TEXT,
    "cardLast4" TEXT,
    "cardNetwork" TEXT,
    "cardType" TEXT,
    "cardIssuer" TEXT,
    "errorCode" TEXT,
    "errorDescription" TEXT,
    "errorSource" TEXT,
    "errorStep" TEXT,
    "errorReason" TEXT,
    "notes" JSONB,
    "razorpayResponse" JSONB,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorizedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL,
    "razorpayPaymentId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "method" TEXT,
    "errorCode" TEXT,
    "errorDescription" TEXT,
    "errorSource" TEXT,
    "errorStep" TEXT,
    "errorReason" TEXT,
    "razorpayResponse" JSONB,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorizedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "eventType" "PaymentEventType" NOT NULL,
    "razorpayEventId" TEXT,
    "providerCreatedAt" TIMESTAMP(3),
    "paymentSnapshot" JSONB,
    "webhookPayload" JSONB,
    "rawPayload" TEXT,
    "webhookSignature" TEXT,
    "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentApiResponse" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "operation" "PaymentApiOperation" NOT NULL,
    "status" "PaymentApiResponseStatus" NOT NULL,
    "httpStatusCode" INTEGER,
    "responseBody" JSONB,
    "errorCode" TEXT,
    "errorDescription" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,

    CONSTRAINT "PaymentApiResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "Payment_organizationId_idx" ON "Payment"("organizationId");

-- CreateIndex
CREATE INDEX "Payment_razorpayOrderId_idx" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_organizationId_createdAt_idx" ON "Payment"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_referenceId_idx" ON "Payment"("referenceId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_paymentId_idx" ON "PaymentAttempt"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_razorpayPaymentId_idx" ON "PaymentAttempt"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_status_idx" ON "PaymentAttempt"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_paymentId_attemptNumber_key" ON "PaymentAttempt"("paymentId", "attemptNumber");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentId_occurredAt_idx" ON "PaymentEvent"("paymentId", "occurredAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentId_eventType_idx" ON "PaymentEvent"("paymentId", "eventType");

-- CreateIndex
CREATE INDEX "PaymentEvent_eventType_idx" ON "PaymentEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_razorpayEventId_key" ON "PaymentEvent"("razorpayEventId");

-- CreateIndex
CREATE INDEX "PaymentApiResponse_paymentId_requestedAt_idx" ON "PaymentApiResponse"("paymentId", "requestedAt");

-- CreateIndex
CREATE INDEX "PaymentApiResponse_operation_idx" ON "PaymentApiResponse"("operation");

-- CreateIndex
CREATE INDEX "PaymentApiResponse_status_idx" ON "PaymentApiResponse"("status");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentApiResponse" ADD CONSTRAINT "PaymentApiResponse_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
