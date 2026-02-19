-- 000001_init_schema.up.sql
-- Axis Assistant (Jarvis): Single-owner database schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-----------------------------------------------------------
-- OWNER PROFILE (single user — the operator)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS owner_profile (
    id                      INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    name                    VARCHAR(255) NOT NULL DEFAULT 'Owner',
    email                   VARCHAR(255) NOT NULL DEFAULT '',
    preferred_meeting_hours VARCHAR(100) DEFAULT '09:00-17:00',
    focus_hours             VARCHAR(100) DEFAULT '09:00-12:00',
    communication_style     VARCHAR(50)  DEFAULT 'professional',
    work_pattern            VARCHAR(50)  DEFAULT 'regular',
    frequent_contacts       JSONB        DEFAULT '[]',
    preferences             JSONB        DEFAULT '{}',
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO owner_profile (id, name) VALUES (1, 'Owner') ON CONFLICT DO NOTHING;

-----------------------------------------------------------
-- SESSIONS
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title      VARCHAR(255) DEFAULT 'New Conversation',
    active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-----------------------------------------------------------
-- SHORT-TERM CONVERSATION MEMORY
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_memory_short (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message    TEXT        NOT NULL,
    metadata   JSONB       DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_short_memory_session ON conversation_memory_short(session_id, created_at ASC);

-----------------------------------------------------------
-- LONG-TERM VECTOR MEMORY (pgvector)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_memory_long (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content    TEXT        NOT NULL,
    embedding  vector(1536),
    category   VARCHAR(50) DEFAULT 'general',
    metadata   JSONB       DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_long_memory_created ON conversation_memory_long(created_at DESC);

-----------------------------------------------------------
-- ACTIVITY LOGS
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id        UUID REFERENCES sessions(id) ON DELETE SET NULL,
    user_query        TEXT        NOT NULL,
    intent            VARCHAR(50),
    execution_plan    JSONB       DEFAULT '{}',
    tools_used        JSONB       DEFAULT '[]',
    execution_results JSONB       DEFAULT '[]',
    success           BOOLEAN     NOT NULL DEFAULT TRUE,
    error_message     TEXT,
    latency_ms        INTEGER     DEFAULT 0,
    token_usage       INTEGER     DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-----------------------------------------------------------
-- REMINDERS
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title        VARCHAR(255) NOT NULL,
    description  TEXT         DEFAULT '',
    scheduled_at TIMESTAMPTZ  NOT NULL,
    sent         BOOLEAN      NOT NULL DEFAULT FALSE,
    sent_via     VARCHAR(20)  DEFAULT 'email',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reminders_due ON reminders(scheduled_at) WHERE sent = FALSE;

-----------------------------------------------------------
-- AUTOMATION RULES
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS automation_rules (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           VARCHAR(255) NOT NULL,
    trigger_type   VARCHAR(50)  NOT NULL,
    condition_json JSONB        NOT NULL DEFAULT '{}',
    action_json    JSONB        NOT NULL DEFAULT '{}',
    enabled        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-----------------------------------------------------------
-- APPROVAL QUEUE
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_queue (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id    UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    proposed_plan JSONB       NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    user_feedback TEXT,
    modified_plan JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at   TIMESTAMPTZ
);

CREATE INDEX idx_approval_pending ON approval_queue(status) WHERE status = 'pending';
