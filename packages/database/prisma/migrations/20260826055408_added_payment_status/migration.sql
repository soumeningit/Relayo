-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('FREE', 'PRO', 'SCALE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "OrganizationPaymentStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "payment_status" "OrganizationPaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "payment_type" "PaymentType" NOT NULL DEFAULT 'FREE';
