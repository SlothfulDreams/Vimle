-- AlterTable
ALTER TABLE "public"."challenges" ADD COLUMN     "starting_content" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "display_name" TEXT,
ADD COLUMN     "preferences" JSONB;
