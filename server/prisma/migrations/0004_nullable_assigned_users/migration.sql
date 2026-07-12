-- Distinguish "never restricted" (null) from "restricted to nobody" ([]).
-- Drop the NOT NULL/default constraints first so the backfill below can write NULL.
ALTER TABLE "forms" ALTER COLUMN "assigned_user_ids" DROP NOT NULL;
ALTER TABLE "forms" ALTER COLUMN "assigned_user_ids" DROP DEFAULT;

-- Backfill: every existing form currently has assigned_user_ids = '[]' (the old
-- default), which under the old semantics meant "visible to everyone". Preserve
-- that behavior by converting those rows to null.
UPDATE "forms" SET "assigned_user_ids" = NULL WHERE "assigned_user_ids" = '[]'::jsonb;
