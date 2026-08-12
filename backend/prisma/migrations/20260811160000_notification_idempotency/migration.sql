-- Wave 1C-C: notification idempotency and worker claim state

ALTER TYPE "notification_status" ADD VALUE IF NOT EXISTS 'PROCESSING';

ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT,
  ADD COLUMN IF NOT EXISTS "event_key" TEXT,
  ADD COLUMN IF NOT EXISTS "processing_started_at" TIMESTAMP(3);

-- Backfill existing rows with stable keys before enforcing NOT NULL
UPDATE "notifications"
SET "idempotency_key" = "id"::text
WHERE "idempotency_key" IS NULL;

ALTER TABLE "notifications"
  ALTER COLUMN "idempotency_key" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "notifications_idempotency_key_key"
  ON "notifications" ("idempotency_key");
