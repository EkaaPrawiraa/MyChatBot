-- 000002_ai_provider.up.sql
-- Adds AI provider configuration to the owner profile.
-- Allows the owner to choose between OpenAI, Anthropic (Claude), or xAI (Grok).

ALTER TABLE owner_profile
    ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(20) NOT NULL DEFAULT 'openai',
    ADD COLUMN IF NOT EXISTS ai_api_key  TEXT         NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS ai_model    VARCHAR(80)  NOT NULL DEFAULT 'gpt-4o-mini';

-- Constrain to known providers.
ALTER TABLE owner_profile
    ADD CONSTRAINT chk_ai_provider
    CHECK (ai_provider IN ('openai', 'anthropic', 'xai'));
