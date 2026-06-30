-- Phase Q2: Age Verification
-- Gates ALL NSFW content (image gen, video gen, intimate suite, NSFW marketplace extensions)
--
-- Fields:
--   isAdult                : hard gate flag — false = no NSFW access
--   ageVerifiedAt          : when verification happened (audit)
--   ageVerificationMethod  : 'self_attestation' | 'credit_card' | 'id_upload' | 'stripe_identity' | 'creator_override'
--   birthdate              : user-supplied birthdate (self-attestation tier)
--   ageVerificationDetails : JSON for method-specific metadata (e.g. Stripe Identity KYC id)
--
-- All fields nullable/defaulted — safe no-op for existing rows.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "isAdult" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "ageVerifiedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "ageVerificationMethod" TEXT;
ALTER TABLE "users" ADD COLUMN "birthdate" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "ageVerificationDetails" JSONB;
