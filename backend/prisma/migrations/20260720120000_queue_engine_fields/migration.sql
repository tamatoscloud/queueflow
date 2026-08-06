-- Queue Engine support fields: priority ordering, VIP flag, fractional
-- sortOrder for reorder/move, and recall / automatic no-show timeouts.
-- See docs/QUEUE_ENGINE.md.

ALTER TABLE "queues"
  ADD COLUMN "priority_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "recall_timeout_seconds" INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN "no_show_timeout_seconds" INTEGER NOT NULL DEFAULT 300;

ALTER TABLE "queue_entries"
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "is_vip" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sort_order" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "skipped_at" TIMESTAMP(3),
  ADD COLUMN "recalled_at" TIMESTAMP(3);

-- Backfill sort_order from existing joined_at order per queue (epoch ms).
UPDATE "queue_entries"
SET "sort_order" = EXTRACT(EPOCH FROM "joined_at") * 1000;

CREATE INDEX "queue_entries_queue_id_status_sort_order_idx"
  ON "queue_entries" ("queue_id", "status", "sort_order");
