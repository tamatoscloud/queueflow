-- Additive: restore SubscriptionPlan.featureFlags omitted from the repaired init baseline.

ALTER TABLE "subscription_plans"
ADD COLUMN "feature_flags" JSONB NOT NULL DEFAULT '{}';
