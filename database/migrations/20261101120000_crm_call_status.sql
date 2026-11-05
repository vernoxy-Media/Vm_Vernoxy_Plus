-- migrate:up
-- A logged call is either Received (then the conversation is written) or Not received (then a reason is picked).
ALTER TABLE crm_communications ADD COLUMN IF NOT EXISTS call_status varchar(20) NULL;
ALTER TABLE crm_communications ADD COLUMN IF NOT EXISTS not_received_reason varchar(150) NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_crm_communications_call_status') THEN
        ALTER TABLE crm_communications
            ADD CONSTRAINT ck_crm_communications_call_status
            CHECK (call_status IS NULL OR call_status IN ('Received', 'Not received'));
    END IF;
END $$;

-- The reasons offered when a call is not received. Kept by the Admin in Settings.
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
SELECT 'call_not_received_reason', v.c, v.l, v.s
FROM (VALUES
    ('no_answer', 'No answer', 10),
    ('busy', 'Busy', 20),
    ('switched_off', 'Switched off', 30),
    ('not_reachable', 'Not reachable', 40),
    ('wrong_number', 'Wrong number', 50),
    ('call_disconnected', 'Call disconnected', 60),
    ('other', 'Other', 70)
) AS v(c, l, s)
WHERE NOT EXISTS (
    SELECT 1 FROM master_lookup m WHERE m.lookup_type = 'call_not_received_reason' AND m.code = v.c AND m.deleted_at IS NULL
);

-- migrate:down
DELETE FROM master_lookup WHERE lookup_type = 'call_not_received_reason' AND created_by IS NULL AND updated_at IS NULL;
ALTER TABLE crm_communications DROP CONSTRAINT IF EXISTS ck_crm_communications_call_status;
ALTER TABLE crm_communications DROP COLUMN IF EXISTS not_received_reason;
ALTER TABLE crm_communications DROP COLUMN IF EXISTS call_status;
