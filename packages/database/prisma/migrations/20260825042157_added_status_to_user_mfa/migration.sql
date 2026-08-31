-- CreateEnum
CREATE TYPE "MfaStatus" AS ENUM ('PENDING', 'ENABLED', 'DISABLED');

-- AlterTable
ALTER TABLE "user_mfa" ADD COLUMN     "status" "MfaStatus" NOT NULL DEFAULT 'PENDING';
