-- Sprint 13: Restaurant service modes (Dine-In, Takeaway, Drive-In)
-- Adds business type, enabled modes, tables, waiters, kitchen orders, QR purposes.

CREATE TYPE "business_type" AS ENUM ('RESTAURANT', 'CAFE', 'FOOD_COURT', 'CLOUD_KITCHEN', 'GENERIC');
CREATE TYPE "service_mode" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DRIVE_IN');
CREATE TYPE "qr_code_purpose" AS ENUM ('ENTRANCE', 'TAKEAWAY_RECEIPT', 'DRIVE_IN_ENTRANCE', 'WAITER_PERSONAL', 'KITCHEN', 'RECEPTION', 'QUEUE');
CREATE TYPE "restaurant_table_status" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING');
CREATE TYPE "waiter_shift_status" AS ENUM ('AVAILABLE', 'SERVING', 'BREAK', 'OFFLINE');
CREATE TYPE "kitchen_order_stage" AS ENUM ('INCOMING', 'PREPARING', 'READY', 'DELAYED', 'COLLECTED');

ALTER TABLE "businesses"
  ADD COLUMN "business_type" "business_type" NOT NULL DEFAULT 'RESTAURANT';

ALTER TABLE "business_settings"
  ADD COLUMN "enabled_modes" "service_mode"[] NOT NULL DEFAULT ARRAY['DINE_IN']::"service_mode"[];

ALTER TABLE "queues"
  ADD COLUMN "service_mode" "service_mode" NOT NULL DEFAULT 'DINE_IN';

ALTER TABLE "queue_entries"
  ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "qr_codes"
  ADD COLUMN "purpose" "qr_code_purpose" NOT NULL DEFAULT 'QUEUE',
  ADD COLUMN "label" TEXT,
  ADD COLUMN "assigned_user_id" UUID;

CREATE INDEX "qr_codes_assigned_user_id_idx" ON "qr_codes" ("assigned_user_id");

ALTER TABLE "qr_codes"
  ADD CONSTRAINT "qr_codes_assigned_user_id_fkey"
  FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "restaurant_tables" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 4,
  "status" "restaurant_table_status" NOT NULL DEFAULT 'AVAILABLE',
  "pos_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pos_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "section" TEXT,
  "merged_into_id" UUID,
  "current_entry_id" UUID,
  "assigned_waiter_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "waiter_profiles" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "display_name" TEXT NOT NULL,
  "status" "waiter_shift_status" NOT NULL DEFAULT 'OFFLINE',
  "current_table_id" UUID,
  "current_vehicle" TEXT,
  "orders_served_today" INTEGER NOT NULL DEFAULT 0,
  "avg_service_minutes" INTEGER,
  "personal_qr_code_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "waiter_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kitchen_orders" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "queue_id" UUID NOT NULL,
  "entry_id" UUID NOT NULL,
  "order_number" TEXT NOT NULL,
  "stage" "kitchen_order_stage" NOT NULL DEFAULT 'INCOMING',
  "preparation_minutes" INTEGER,
  "started_at" TIMESTAMP(3),
  "ready_at" TIMESTAMP(3),
  "collected_at" TIMESTAMP(3),
  "assigned_waiter_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kitchen_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waiter_profiles_user_id_key" ON "waiter_profiles"("user_id");
CREATE UNIQUE INDEX "kitchen_orders_entry_id_key" ON "kitchen_orders"("entry_id");
CREATE INDEX "restaurant_tables_business_id_branch_id_status_idx" ON "restaurant_tables"("business_id", "branch_id", "status");
CREATE INDEX "waiter_profiles_business_id_branch_id_status_idx" ON "waiter_profiles"("business_id", "branch_id", "status");
CREATE INDEX "kitchen_orders_business_id_branch_id_stage_idx" ON "kitchen_orders"("business_id", "branch_id", "stage");
CREATE INDEX "kitchen_orders_queue_id_stage_idx" ON "kitchen_orders"("queue_id", "stage");

ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "restaurant_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_current_entry_id_fkey" FOREIGN KEY ("current_entry_id") REFERENCES "queue_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_assigned_waiter_id_fkey" FOREIGN KEY ("assigned_waiter_id") REFERENCES "waiter_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "waiter_profiles" ADD CONSTRAINT "waiter_profiles_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waiter_profiles" ADD CONSTRAINT "waiter_profiles_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waiter_profiles" ADD CONSTRAINT "waiter_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kitchen_orders" ADD CONSTRAINT "kitchen_orders_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kitchen_orders" ADD CONSTRAINT "kitchen_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kitchen_orders" ADD CONSTRAINT "kitchen_orders_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kitchen_orders" ADD CONSTRAINT "kitchen_orders_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "queue_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill queue service modes from naming conventions in seed data.
UPDATE "queues" SET "service_mode" = 'TAKEAWAY' WHERE LOWER("name") LIKE '%takeaway%' OR LOWER("name") LIKE '%take away%';
UPDATE "queues" SET "service_mode" = 'DRIVE_IN' WHERE LOWER("name") LIKE '%drive%' OR LOWER("name") LIKE '%curbside%';

UPDATE "business_settings" SET "enabled_modes" = ARRAY['DINE_IN', 'TAKEAWAY', 'DRIVE_IN']::"service_mode"[]
WHERE "business_id" IN (SELECT "id" FROM "businesses" WHERE LOWER("name") LIKE '%bella vista%' OR LOWER("slug") = 'bella-vista');
