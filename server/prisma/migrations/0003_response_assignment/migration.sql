-- AlterTable
ALTER TABLE "responses" ADD COLUMN "assigned_to_id" UUID;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id");
