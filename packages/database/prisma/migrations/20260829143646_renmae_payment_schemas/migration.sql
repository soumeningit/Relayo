/*
  Warnings:

  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentApiResponse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentAttempt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentEvent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentApiResponse" DROP CONSTRAINT "PaymentApiResponse_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT "PaymentAttempt_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentEvent" DROP CONSTRAINT "PaymentEvent_paymentId_fkey";

-- AlterTable
ALTER TABLE "organization_invitations" ADD COLUMN     "valid" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "Payment";

-- DropTable
DROP TABLE "PaymentApiResponse";

-- DropTable
DROP TABLE "PaymentAttempt";

-- DropTable
DROP TABLE "PaymentEvent";

-- CreateTable
CREATE TABLE "payments" (
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

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
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

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
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

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_api_responses" (
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

    CONSTRAINT "payment_api_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpayOrderId_key" ON "payments"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpayPaymentId_key" ON "payments"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "payments_organizationId_idx" ON "payments"("organizationId");

-- CreateIndex
CREATE INDEX "payments_razorpayOrderId_idx" ON "payments"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_organizationId_createdAt_idx" ON "payments"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_referenceId_idx" ON "payments"("referenceId");

-- CreateIndex
CREATE INDEX "payment_attempts_paymentId_idx" ON "payment_attempts"("paymentId");

-- CreateIndex
CREATE INDEX "payment_attempts_razorpayPaymentId_idx" ON "payment_attempts"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "payment_attempts_status_idx" ON "payment_attempts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_paymentId_attemptNumber_key" ON "payment_attempts"("paymentId", "attemptNumber");

-- CreateIndex
CREATE INDEX "payment_events_paymentId_occurredAt_idx" ON "payment_events"("paymentId", "occurredAt");

-- CreateIndex
CREATE INDEX "payment_events_paymentId_eventType_idx" ON "payment_events"("paymentId", "eventType");

-- CreateIndex
CREATE INDEX "payment_events_eventType_idx" ON "payment_events"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_razorpayEventId_key" ON "payment_events"("razorpayEventId");

-- CreateIndex
CREATE INDEX "payment_api_responses_paymentId_requestedAt_idx" ON "payment_api_responses"("paymentId", "requestedAt");

-- CreateIndex
CREATE INDEX "payment_api_responses_operation_idx" ON "payment_api_responses"("operation");

-- CreateIndex
CREATE INDEX "payment_api_responses_status_idx" ON "payment_api_responses"("status");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_api_responses" ADD CONSTRAINT "payment_api_responses_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
