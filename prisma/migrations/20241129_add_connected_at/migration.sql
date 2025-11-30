-- AlterTable: Sync google_drive_connections with current schema

-- Add missing column
ALTER TABLE "google_drive_connections" ADD COLUMN IF NOT EXISTS "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Remove columns that are no longer in the schema
ALTER TABLE "google_drive_connections" DROP COLUMN IF EXISTS "tokenExpiry";
ALTER TABLE "google_drive_connections" DROP COLUMN IF EXISTS "rootFolderId";
ALTER TABLE "google_drive_connections" DROP COLUMN IF EXISTS "lastErrorAt";
ALTER TABLE "google_drive_connections" DROP COLUMN IF EXISTS "lastError";
ALTER TABLE "google_drive_connections" DROP COLUMN IF EXISTS "scopes";
ALTER TABLE "google_drive_connections" DROP COLUMN IF EXISTS "metadata";
ALTER TABLE "google_drive_connections" DROP COLUMN IF EXISTS "createdAt";
ALTER TABLE "google_drive_connections" DROP COLUMN IF EXISTS "updatedAt";

-- Make googleEmail nullable (schema shows String?)
ALTER TABLE "google_drive_connections" ALTER COLUMN "googleEmail" DROP NOT NULL;

-- Update lastSyncAt to be nullable and remove default
ALTER TABLE "google_drive_connections" ALTER COLUMN "lastSyncAt" DROP NOT NULL;
ALTER TABLE "google_drive_connections" ALTER COLUMN "lastSyncAt" DROP DEFAULT;
