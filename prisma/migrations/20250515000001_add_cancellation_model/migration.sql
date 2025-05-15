-- Add Cancellation model
CREATE TABLE "Cancellation" (
    "id" SERIAL NOT NULL,
    "chatId" BIGINT NOT NULL,
    "chatName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "messageId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cancellation_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better query performance
CREATE INDEX "Cancellation_chatId_idx" ON "Cancellation"("chatId");
CREATE INDEX "Cancellation_isRead_idx" ON "Cancellation"("isRead");
CREATE INDEX "Cancellation_timestamp_idx" ON "Cancellation"("timestamp");
CREATE UNIQUE INDEX "Cancellation_chatId_messageId_idx" ON "Cancellation"("chatId", "messageId");