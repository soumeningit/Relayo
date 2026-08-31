/*
  Warnings:

  - You are about to alter the column `amount` on the `payment_attempts` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `amount` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `amountRefunded` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `amountTransferred` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to drop the `Test` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "payment_attempts" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "amountRefunded" SET DEFAULT 0,
ALTER COLUMN "amountRefunded" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "amountTransferred" SET DEFAULT 0,
ALTER COLUMN "amountTransferred" SET DATA TYPE DECIMAL(10,2);

-- DropTable
DROP TABLE "Test";
