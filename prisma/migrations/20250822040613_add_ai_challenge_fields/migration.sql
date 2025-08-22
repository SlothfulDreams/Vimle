-- AlterTable
ALTER TABLE "public"."challenges" ADD COLUMN     "generated_by" TEXT NOT NULL DEFAULT 'static',
ADD COLUMN     "prompt_used" TEXT,
ADD COLUMN     "validation_status" TEXT NOT NULL DEFAULT 'validated';
