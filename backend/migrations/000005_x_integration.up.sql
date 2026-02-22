-- 000005_x_integration.up.sql
-- Adds X (Twitter) integration credentials/config for the single owner.

ALTER TABLE owner_integrations
    ADD COLUMN IF NOT EXISTS x_api_key TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS x_api_secret TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS x_access_token TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS x_access_token_secret TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS x_bearer_token TEXT NOT NULL DEFAULT '';
