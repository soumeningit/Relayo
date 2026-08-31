/*
  Warnings:

  - A unique constraint covering the columns `[address_id]` on the table `addresses` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[profileId,type]` on the table `addresses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `address_id` to the `addresses` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('CURRENT', 'PERMANENT');

-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "address_id" TEXT NOT NULL,
ADD COLUMN     "type" "AddressType" NOT NULL DEFAULT 'CURRENT',
ALTER COLUMN "street" DROP NOT NULL,
ALTER COLUMN "street" SET DEFAULT '',
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "city" SET DEFAULT '',
ALTER COLUMN "state" SET DEFAULT '',
ALTER COLUMN "zip_code" SET DEFAULT '',
ALTER COLUMN "country" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "addresses_address_id_key" ON "addresses"("address_id");

-- CreateIndex
CREATE UNIQUE INDEX "addresses_profileId_type_key" ON "addresses"("profileId", "type");
