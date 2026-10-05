-- Speeds auth login lookups (users.email had no index).
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
