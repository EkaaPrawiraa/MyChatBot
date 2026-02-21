-- 000004_social_integrations.down.sql

ALTER TABLE owner_integrations
    DROP COLUMN IF EXISTS telegram_bot_token,
    DROP COLUMN IF EXISTS discord_webhook_url,
    DROP COLUMN IF EXISTS discord_bot_token;
