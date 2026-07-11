-- AlterTable
ALTER TABLE "forms" ADD COLUMN "assigned_user_ids" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "forms" ADD COLUMN "schedule_meta" JSONB;
