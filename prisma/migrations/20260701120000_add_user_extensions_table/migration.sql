-- Phase R1: Extension Marketplace — per-user install records
-- The extension catalog lives in code (src/lib/extensions/catalog.ts).
-- This table only tracks who has installed what, plus their per-user config.
--
-- An "extension" is a named capability Holly can offer (e.g. "Music Distribution",
-- "Code Review", "Crypto Trading"). Installing signals that the user wants this
-- capability surfaced — it does NOT (yet) run arbitrary code. Future phases can
-- add manifest-driven plugin loading on top of this schema.
--
-- Fields:
--   id            : cuid primary key
--   userId        : FK to users.id (cascade on delete)
--   extensionId   : matches catalog id (e.g. "music-distribution")
--   suite         : denormalized suite key (e.g. "music") for quick filtering
--   config        : per-user config blob (shape varies per extension)
--   enabled       : false = hidden from active use but not uninstalled
--   autoInstalled : true = onboarding role detection installed this (vs explicit user action)
--   installedAt   : when installed
--   updatedAt     : last config change
--
-- Constraints:
--   @@unique([userId, extensionId]) — one install per extension per user
--   @@index([userId])               — list my extensions
--   @@index([suite])                — filter by suite in catalog queries

CREATE TABLE "user_extensions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "extensionId" TEXT NOT NULL,
    "suite" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "autoInstalled" BOOLEAN NOT NULL DEFAULT false,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_extensions_userId_extensionId_key" ON "user_extensions"("userId", "extensionId");

-- CreateIndex
CREATE INDEX "user_extensions_userId_idx" ON "user_extensions"("userId");

-- CreateIndex
CREATE INDEX "user_extensions_suite_idx" ON "user_extensions"("suite");

-- AddForeignKey
ALTER TABLE "user_extensions" ADD CONSTRAINT "user_extensions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
