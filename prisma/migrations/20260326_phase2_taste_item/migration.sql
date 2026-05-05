-- Phase 2: Add item field to taste_signals table
-- This field stores the specific preference label (e.g. "formal_tone", "bullet_lists")

ALTER TABLE "taste_signals" ADD COLUMN IF NOT EXISTS "item" TEXT NOT NULL DEFAULT '';

-- Add index for item lookups
CREATE INDEX IF NOT EXISTS "taste_signals_item_idx" ON "taste_signals"("item");
