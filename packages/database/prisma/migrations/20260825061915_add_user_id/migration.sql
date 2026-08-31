/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tokens" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "user_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_user_id_key" ON "users"("user_id");
