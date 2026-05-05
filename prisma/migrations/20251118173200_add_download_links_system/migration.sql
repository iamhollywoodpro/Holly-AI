-- CreateTable
CREATE TABLE "download_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "linkId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "password" TEXT,
    "expiresAt" TIMESTAMP(3),
    "maxDownloads" INTEGER,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "title" TEXT,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB DEFAULT '{}',
    "generatedBy" TEXT,
    "generationTime" INTEGER,
    "lastDownloadAt" TIMESTAMP(3),
    "downloadIps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "download_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "download_links_linkId_key" ON "download_links"("linkId");

-- CreateIndex
CREATE INDEX "download_links_userId_idx" ON "download_links"("userId");

-- CreateIndex
CREATE INDEX "download_links_conversationId_idx" ON "download_links"("conversationId");

-- CreateIndex
CREATE INDEX "download_links_linkId_idx" ON "download_links"("linkId");

-- CreateIndex
CREATE INDEX "download_links_expiresAt_idx" ON "download_links"("expiresAt");

-- CreateIndex
CREATE INDEX "download_links_createdAt_idx" ON "download_links"("createdAt");
