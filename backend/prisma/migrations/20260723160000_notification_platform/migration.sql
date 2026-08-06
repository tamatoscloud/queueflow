-- Notification platform: templates + business notification settings

ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "position_update_interval_sec" INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS "almost_your_turn_position" INTEGER NOT NULL DEFAULT 3;

ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'QUEUE_PAUSED';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'QUEUE_RESUMED';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'QUEUE_CLOSED';

CREATE TABLE IF NOT EXISTS "notification_templates" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "type" "notification_type" NOT NULL,
  "channel" "notification_channel",
  "locale" TEXT NOT NULL DEFAULT 'en',
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_by" UUID,
  "updated_by" UUID,

  CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_templates_business_id_type_channel_locale_key"
  ON "notification_templates"("business_id", "type", "channel", "locale");

CREATE INDEX IF NOT EXISTS "notification_templates_business_id_type_is_active_idx"
  ON "notification_templates"("business_id", "type", "is_active");

ALTER TABLE "notification_templates"
  ADD CONSTRAINT "notification_templates_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
