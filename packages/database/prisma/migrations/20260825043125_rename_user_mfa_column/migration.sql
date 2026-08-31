/*
  Warnings:

  - You are about to drop the column `last_time_step` on the `user_mfa` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_mfa" DROP COLUMN "last_time_step",
ADD COLUMN     "last_mfa_time_step" BIGINT;
