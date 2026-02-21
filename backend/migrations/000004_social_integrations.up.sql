-- 000004_social_integrations.up.sql
-- Adds Telegram + Discord integration credentials/config for the single owner.

ALTER TABLE owner_integrations
    ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS discord_bot_token TEXT NOT NULL DEFAULT '';
