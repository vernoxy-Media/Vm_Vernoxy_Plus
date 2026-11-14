-- migrate:up
-- A call that was picked up records how long it lasted (for example 3 min 28 sec), in seconds.
-- It stays empty for calls that were not received, for other channels, and for conversations logged before this change.
ALTER TABLE crm_communications ADD COLUMN IF NOT EXISTS call_duration_seconds integer;

ALTER TABLE crm_communications
    ADD CONSTRAINT ck_crm_comm_call_duration
    CHECK (call_duration_seconds IS NULL OR (call_duration_seconds > 0 AND call_duration_seconds < 86400));

-- migrate:down
ALTER TABLE crm_communications DROP CONSTRAINT IF EXISTS ck_crm_comm_call_duration;
ALTER TABLE crm_communications DROP COLUMN IF EXISTS call_duration_seconds;
