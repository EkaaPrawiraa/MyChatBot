-- 000005_touch_session_on_short_memory_insert.up.sql
-- Bump sessions.updated_at when a new short-term message is stored.

-- Ensure function exists and is idempotent.
CREATE OR REPLACE FUNCTION touch_session_updated_at_from_short_memory()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sessions
    SET updated_at = NOW()
    WHERE id = NEW.session_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_touch_session_updated_at_from_short_memory'
    ) THEN
        CREATE TRIGGER trg_touch_session_updated_at_from_short_memory
        AFTER INSERT ON conversation_memory_short
        FOR EACH ROW
        EXECUTE FUNCTION touch_session_updated_at_from_short_memory();
    END IF;
END $$;
