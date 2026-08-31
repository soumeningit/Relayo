-- CreateEnum
CREATE TYPE "DeliveryAttemptStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "AdminActorType" AS ENUM ('ADMIN', 'USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AdminAuditCategory" AS ENUM ('AUTH', 'SECURITY', 'ORGANIZATION', 'USER', 'BILLING', 'SYSTEM');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'RESOLVED');

-- AlterEnum
ALTER TYPE "DeliveryStatus" ADD VALUE 'DEAD_LETTER';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "latency_ms" INTEGER;

-- AlterTable
ALTER TABLE "destinations" ADD COLUMN     "breaker_opened_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "admin_notes" TEXT;

-- CreateTable
CREATE TABLE "delivery_attempts" (
    "id" BIGSERIAL NOT NULL,
    "delivery_id" BIGINT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "status" "DeliveryAttemptStatus" NOT NULL,
    "response_code" INTEGER,
    "latency_ms" INTEGER,
    "error_message" TEXT,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "actor_type" "AdminActorType" NOT NULL,
    "actor_id" BIGINT,
    "actor_email" TEXT,
    "category" "AdminAuditCategory" NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "location" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "dangerous" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_attempts_delivery_id_idx" ON "delivery_attempts"("delivery_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_attempts_delivery_id_attempt_number_key" ON "delivery_attempts"("delivery_id", "attempt_number");

-- CreateIndex
CREATE INDEX "admin_audit_logs_timestamp_idx" ON "admin_audit_logs"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "admin_audit_logs_category_idx" ON "admin_audit_logs"("category");

-- CreateIndex
CREATE INDEX "admin_audit_logs_actor_type_idx" ON "admin_audit_logs"("actor_type");

-- CreateIndex
CREATE INDEX "incidents_status_severity_idx" ON "incidents"("status", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- AddForeignKey
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
