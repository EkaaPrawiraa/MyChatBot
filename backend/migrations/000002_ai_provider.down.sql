-- 000002_ai_provider.down.sql
ALTER TABLE owner_profile DROP CONSTRAINT IF EXISTS chk_ai_provider;
ALTER TABLE owner_profile DROP COLUMN IF EXISTS ai_model;
ALTER TABLE owner_profile DROP COLUMN IF EXISTS ai_api_key;
ALTER TABLE owner_profile DROP COLUMN IF EXISTS ai_provider;
