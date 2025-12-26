-- AlterTable
ALTER TABLE "file_uploads" ADD COLUMN "messageId" TEXT;

-- CreateIndex
CREATE INDEX "file_uploads_messageId_idx" ON "file_uploads"("messageId");
