-- CreateEnum
CREATE TYPE "RateLimitStrategy" AS ENUM ('SLIDING_WINDOW', 'FIXED_WINDOW', 'TOKEN_BUCKET');

-- CreateEnum
CREATE TYPE "IdentifierType" AS ENUM ('IP', 'USER_ID', 'API_KEY');

-- CreateTable
CREATE TABLE "rate_limit_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "strategy" "RateLimitStrategy" NOT NULL,
    "identifierType" "IdentifierType" NOT NULL,
    "limit" INTEGER NOT NULL,
    "window_ms" INTEGER NOT NULL,
    "burst" INTEGER,
    "refill_rate" DOUBLE PRECISION,
    "route_pattern" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "identifier_type" "IdentifierType" NOT NULL,
    "route" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "limit_count" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "config_id" TEXT,
    "ip" TEXT NOT NULL,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_limit_configs_enabled_priority_idx" ON "rate_limit_configs"("enabled", "priority" DESC);

-- CreateIndex
CREATE INDEX "rate_limit_configs_route_pattern_idx" ON "rate_limit_configs"("route_pattern");

-- CreateIndex
CREATE INDEX "rate_limit_configs_identifierType_idx" ON "rate_limit_configs"("identifierType");

-- CreateIndex
CREATE INDEX "audit_logs_identifier_idx" ON "audit_logs"("identifier");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_config_id_idx" ON "audit_logs"("config_id");

-- CreateIndex
CREATE INDEX "audit_logs_route_method_idx" ON "audit_logs"("route", "method");

-- CreateIndex
CREATE INDEX "audit_logs_allowed_idx" ON "audit_logs"("allowed");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "rate_limit_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
