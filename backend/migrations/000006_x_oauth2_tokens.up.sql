-- 000006_x_oauth2_tokens.up.sql
-- Stores X OAuth 2.0 user-context tokens for the single owner.

ALTER TABLE owner_integrations
    ADD COLUMN IF NOT EXISTS x_oauth2_access_token TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS x_oauth2_refresh_token TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS x_oauth2_token_expiry TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS x_oauth2_scope TEXT NOT NULL DEFAULT '';
