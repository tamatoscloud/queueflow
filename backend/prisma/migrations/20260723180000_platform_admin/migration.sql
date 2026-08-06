-- Platform admin: support tickets, platform config, business feature flags

CREATE TYPE "support_ticket_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "support_ticket_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "feature_flags" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "platform_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "feature_flags" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);

INSERT INTO "platform_config" ("id") VALUES ('default') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS "support_tickets" (
    "id" UUID NOT NULL,
    "business_id" UUID,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "support_ticket_status" NOT NULL DEFAULT 'OPEN',
    "priority" "support_ticket_priority" NOT NULL DEFAULT 'MEDIUM',
    "assigned_to_user_id" UUID,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "support_tickets_business_id_status_idx" ON "support_tickets"("business_id", "status");
CREATE INDEX IF NOT EXISTS "support_tickets_assigned_to_user_id_idx" ON "support_tickets"("assigned_to_user_id");

ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_user_id_fkey"
  FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
