-- migrate:up
ALTER TABLE attendance_breaks
    ADD COLUMN break_type varchar(50) NULL,
    ADD COLUMN reason varchar(255) NULL;

-- migrate:down
ALTER TABLE attendance_breaks
    DROP COLUMN IF EXISTS reason,
    DROP COLUMN IF EXISTS break_type;
