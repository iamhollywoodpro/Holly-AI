-- CreateTable
CREATE TABLE "google_drive_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiry" TIMESTAMP(3) NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "googleName" TEXT,
    "googlePicture" TEXT,
    "rootFolderId" TEXT,
    "quotaUsed" BIGINT NOT NULL DEFAULT 0,
    "quotaLimit" BIGINT,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastErrorAt" TIMESTAMP(3),
    "lastError" TEXT,
    "autoUpload" BOOLEAN NOT NULL DEFAULT true,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_drive_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "google_drive_connections_userId_key" ON "google_drive_connections"("userId");

-- CreateIndex
CREATE INDEX "google_drive_connections_userId_idx" ON "google_drive_connections"("userId");

-- CreateIndex
CREATE INDEX "google_drive_connections_googleEmail_idx" ON "google_drive_connections"("googleEmail");

-- AddForeignKey
ALTER TABLE "google_drive_connections" ADD CONSTRAINT "google_drive_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
