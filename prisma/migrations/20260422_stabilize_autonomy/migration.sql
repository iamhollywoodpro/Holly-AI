-- AlterTable
ALTER TABLE "self_improvements" ADD COLUMN "branchName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "self_improvements" ADD COLUMN "filesChanged" TEXT[] DEFAULT ARRAY[]::TEXT[];
