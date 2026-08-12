-- PostgreSQL-backed notification delivery queue (alternative to BullMQ/Redis).

CREATE TYPE "notification_job_status" AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'DEAD'
);

CREATE TABLE "notification_jobs" (
  "id" UUID NOT NULL,
  "notification_id" UUID NOT NULL,
  "status" "notification_job_status" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locked_at" TIMESTAMP(3),
  "locked_by" TEXT,
  "last_error" TEXT,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_jobs_notification_id_key"
  ON "notification_jobs" ("notification_id");

CREATE INDEX "notification_jobs_status_available_at_idx"
  ON "notification_jobs" ("status", "available_at");

CREATE INDEX "notification_jobs_locked_at_idx"
  ON "notification_jobs" ("locked_at");

ALTER TABLE "notification_jobs"
  ADD CONSTRAINT "notification_jobs_notification_id_fkey"
  FOREIGN KEY ("notification_id") REFERENCES "notifications"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
