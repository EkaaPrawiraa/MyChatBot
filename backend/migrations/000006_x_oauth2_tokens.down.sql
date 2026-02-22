-- 000006_x_oauth2_tokens.down.sql
-- Removes X OAuth 2.0 user-context token fields.

ALTER TABLE owner_integrations
    DROP COLUMN IF EXISTS x_oauth2_access_token,
    DROP COLUMN IF EXISTS x_oauth2_refresh_token,
    DROP COLUMN IF EXISTS x_oauth2_token_expiry,
    DROP COLUMN IF EXISTS x_oauth2_scope;
