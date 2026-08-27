-- Hold / no-show window after call: 2 minutes (was commonly 5).
ALTER TABLE "queues"
  ALTER COLUMN "no_show_timeout_seconds" SET DEFAULT 120;

UPDATE "queues"
SET "no_show_timeout_seconds" = 120
WHERE "deleted_at" IS NULL
  AND "no_show_timeout_seconds" = 300;
