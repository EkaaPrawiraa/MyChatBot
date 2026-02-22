-- 000005_x_integration.down.sql

ALTER TABLE owner_integrations
    DROP COLUMN IF EXISTS x_api_key,
    DROP COLUMN IF EXISTS x_api_secret,
    DROP COLUMN IF EXISTS x_access_token,
    DROP COLUMN IF EXISTS x_access_token_secret,
    DROP COLUMN IF EXISTS x_bearer_token;
