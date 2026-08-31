/*
  Warnings:

  - You are about to drop the column `mfaSecret` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "mfaSecret";

-- CreateTable
CREATE TABLE "user_mfa" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "secret" TEXT,
    "last_time_step" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_mfa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_mfa_userId_key" ON "user_mfa"("userId");

-- AddForeignKey
ALTER TABLE "user_mfa" ADD CONSTRAINT "user_mfa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
