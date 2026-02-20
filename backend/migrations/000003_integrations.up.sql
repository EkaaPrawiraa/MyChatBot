-- 000003_integrations.up.sql
-- Stores third-party integration credentials for the single owner.

CREATE TABLE IF NOT EXISTS owner_integrations (
    owner_id                    INTEGER PRIMARY KEY DEFAULT 1 CHECK (owner_id = 1),

    -- Google OAuth (Gmail + Calendar)
    google_email                VARCHAR(255) NOT NULL DEFAULT '',
    google_refresh_token        TEXT         NOT NULL DEFAULT '',
    google_access_token         TEXT         NOT NULL DEFAULT '',
    google_token_expiry         TIMESTAMPTZ,

    -- WhatsApp (Meta Cloud API)
    whatsapp_phone_number_id    VARCHAR(64)  NOT NULL DEFAULT '',
    whatsapp_business_account_id VARCHAR(64) NOT NULL DEFAULT '',
    whatsapp_api_token          TEXT         NOT NULL DEFAULT '',

    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO owner_integrations (owner_id)
VALUES (1)
ON CONFLICT (owner_id) DO NOTHING;
