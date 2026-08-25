-- Allow fractional guest ETAs (2.5, 5, 7.5, …).
ALTER TABLE "queue_entries"
  ALTER COLUMN "estimated_wait_minutes" TYPE DOUBLE PRECISION
  USING "estimated_wait_minutes"::DOUBLE PRECISION;
