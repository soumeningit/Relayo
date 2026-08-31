-- CreateTable
CREATE TABLE "Test" (
    "id" BIGSERIAL NOT NULL,
    "message_id" TEXT NOT NULL,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Test_message_id_key" ON "Test"("message_id");
