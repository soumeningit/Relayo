-- CreateEnum
CREATE TYPE "DestinationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

-- CreateTable
CREATE TABLE "destinations" (
    "id" BIGSERIAL NOT NULL,
    "destination_id" TEXT NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "destination_name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "encrypted_signing_secret" TEXT NOT NULL,
    "status" "DestinationStatus" NOT NULL DEFAULT 'ACTIVE',
    "pause_reason" TEXT,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "created_by" BIGINT NOT NULL,
    "last_success_at" TIMESTAMP(3),
    "last_failure_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "destinations_destination_id_key" ON "destinations"("destination_id");

-- AddForeignKey
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
