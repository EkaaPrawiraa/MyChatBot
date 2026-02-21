-- 000005_touch_session_on_short_memory_insert.down.sql

DROP TRIGGER IF EXISTS trg_touch_session_updated_at_from_short_memory ON conversation_memory_short;
DROP FUNCTION IF EXISTS touch_session_updated_at_from_short_memory();
